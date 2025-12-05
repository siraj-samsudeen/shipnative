/**
 * Mock Supabase Auth
 *
 * Mock implementation of Supabase authentication methods
 */

import {
  initializeStorage,
  delay,
  createMockUser,
  createMockSession,
  isSessionValid,
  persistUsers,
  saveToStorage,
  removeFromStorage,
  notifyAuthStateChange,
  generateToken,
  STORAGE_KEYS,
} from "./helpers"
import { sharedState } from "./types"
import type {
  User,
  Session,
  AuthResponse,
  SignUpCredentials,
  SignInCredentials,
  ResetPasswordOptions,
  AuthStateChangeCallback,
} from "../../../types/auth"
import { logger } from "../../../utils/Logger"

export class MockSupabaseAuth {
  constructor() {
    // Initialize storage on first auth operation
    if (!sharedState.isInitialized) {
      initializeStorage()
    }
  }

  async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    await initializeStorage()
    const { email, password, options } = credentials
    await delay()

    if (__DEV__) {
      logger.debug(`[MockSupabase] Sign up`, { email })
    }

    // Validate email format
    if (!email || !email.includes("@")) {
      return {
        data: { user: null, session: null },
        error: new Error("Invalid email address"),
      }
    }

    // Validate password length
    if (!password || password.length < 6) {
      return {
        data: { user: null, session: null },
        error: new Error("Password should be at least 6 characters"),
      }
    }

    // Check if user already exists
    if (sharedState.mockUsers.has(email)) {
      return {
        data: { user: null, session: null },
        error: new Error("User already registered"),
      }
    }

    // Create new user (email not confirmed by default)
    const user = createMockUser(email, options?.data)
    sharedState.mockUsers.set(email, { email, password, user })
    await persistUsers()

    // In mock mode, don't create session if email confirmation is required
    // This simulates Supabase behavior when email confirmation is enabled
    // For development convenience, you can manually confirm by setting email_confirmed_at
    const session = null // No session until email is confirmed

    if (__DEV__) {
      logger.debug(`[MockSupabase] User created. Email confirmation required.`)
      logger.debug(`[MockSupabase] To auto-confirm in dev, set email_confirmed_at in user object`)
    }

    return {
      data: { user, session },
      error: null,
    }
  }

  async signInWithPassword(credentials: SignInCredentials): Promise<AuthResponse> {
    await initializeStorage()
    const { email, password } = credentials
    await delay()

    if (__DEV__) {
      logger.debug(`[MockSupabase] Sign in`, { email })
    }

    const userData = sharedState.mockUsers.get(email)

    if (!userData) {
      return {
        data: { user: null, session: null },
        error: new Error("Invalid login credentials"),
      }
    }

    if (userData.password !== password) {
      return {
        data: { user: null, session: null },
        error: new Error("Invalid login credentials"),
      }
    }

    // Check if email is confirmed
    const isEmailConfirmed = !!(userData.user.email_confirmed_at || userData.user.confirmed_at)
    if (!isEmailConfirmed) {
      if (__DEV__) {
        logger.debug(`[MockSupabase] Email not confirmed`, { email })
      }
      // Return error when email is not confirmed (matches real Supabase behavior)
      // But include user data so EmailVerification screen can show the email
      return {
        data: { user: userData.user, session: null },
        error: new Error("Email not confirmed"),
      }
    }

    const session = createMockSession(userData.user)
    sharedState.currentSession = session
    await saveToStorage(STORAGE_KEYS.SESSION, session)

    notifyAuthStateChange("SIGNED_IN", session)

    return {
      data: { user: userData.user, session },
      error: null,
    }
  }

  async signOut(): Promise<{ error: Error | null }> {
    await delay(200)

    if (__DEV__) {
      logger.debug(`[MockSupabase] Sign out`)
    }

    sharedState.currentSession = null
    await removeFromStorage(STORAGE_KEYS.SESSION)
    notifyAuthStateChange("SIGNED_OUT", null)

    return { error: null }
  }

  async getSession(): Promise<{ data: { session: Session | null }; error: Error | null }> {
    await initializeStorage()

    // Check if session is still valid
    if (sharedState.currentSession && !isSessionValid(sharedState.currentSession)) {
      if (__DEV__) {
        logger.debug(`[MockSupabase] Session expired`)
      }
      sharedState.currentSession = null
      await removeFromStorage(STORAGE_KEYS.SESSION)
      notifyAuthStateChange("SIGNED_OUT", null)
    }

    return {
      data: { session: sharedState.currentSession },
      error: null,
    }
  }

  async getUser(): Promise<{ data: { user: User | null }; error: Error | null }> {
    await initializeStorage()

    // Ensure session is valid
    if (sharedState.currentSession && !isSessionValid(sharedState.currentSession)) {
      sharedState.currentSession = null
      await removeFromStorage(STORAGE_KEYS.SESSION)
    }

    return {
      data: { user: sharedState.currentSession?.user || null },
      error: null,
    }
  }

  async verifyOtp(options: {
    token: string
    type: "email" | "signup" | "email_change" | "password_recovery"
  }): Promise<AuthResponse> {
    await delay()
    const { token, type } = options

    if (__DEV__) {
      logger.debug(`[MockSupabase] Verify OTP`, { type, tokenPrefix: token.substring(0, 10) })
    }

    // In mock mode, find user by checking current session or any unconfirmed user
    let userToConfirm: User | null = null

    if (sharedState.currentSession?.user) {
      // If there's a current session, confirm that user's email
      userToConfirm = sharedState.currentSession.user
    } else {
      // Find first unconfirmed user
      for (const [, userData] of sharedState.mockUsers) {
        if (!userData.user.email_confirmed_at && !userData.user.confirmed_at) {
          userToConfirm = userData.user
          break
        }
      }
    }

    if (!userToConfirm) {
      return {
        data: { user: null, session: null },
        error: new Error("Invalid or expired token"),
      }
    }

    // Confirm the email
    userToConfirm.email_confirmed_at = new Date().toISOString()
    userToConfirm.confirmed_at = new Date().toISOString()

    // Update user in storage
    const userData = sharedState.mockUsers.get(userToConfirm.email!)
    if (userData) {
      userData.user = userToConfirm
      await persistUsers()
    }

    // Create session for confirmed user
    const session = createMockSession(userToConfirm)
    sharedState.currentSession = session
    await saveToStorage(STORAGE_KEYS.SESSION, session)

    notifyAuthStateChange("SIGNED_IN", session)

    if (__DEV__) {
      logger.debug(`[MockSupabase] Email confirmed`, { email: userToConfirm.email })
    }

    return {
      data: { user: userToConfirm, session },
      error: null,
    }
  }

  async resend(options: {
    type: "signup" | "email_change" | "password_recovery"
    email: string
  }): Promise<{ data: any; error: Error | null }> {
    await delay()

    const { type, email } = options

    if (__DEV__) {
      logger.debug(`[MockSupabase] Resend ${type} email requested`, { type, email })
      if (type === "signup") {
        logger.debug(`[MockSupabase] Confirmation email (mock): verify-email/${email}`)
        logger.debug(
          `[MockSupabase] In dev, you can manually confirm by setting email_confirmed_at`,
        )
      }
    }

    // Check if user exists
    if (!sharedState.mockUsers.has(email)) {
      return {
        data: null,
        error: new Error("User not found"),
      }
    }

    return {
      data: {},
      error: null,
    }
  }

  async resetPasswordForEmail(
    email: string,
    _options?: ResetPasswordOptions,
  ): Promise<{ data: any; error: Error | null }> {
    await delay()

    if (__DEV__) {
      logger.debug(`[MockSupabase] Password reset requested`, { email })
      logger.debug(`[MockSupabase] Reset link (mock): reset-password/${email}`)
    }

    return {
      data: {},
      error: null,
    }
  }

  async updateUser(attributes: {
    email?: string
    password?: string
    data?: Record<string, any>
  }): Promise<AuthResponse> {
    await delay()

    if (!sharedState.currentSession) {
      return {
        data: { user: null, session: null },
        error: new Error("Not authenticated"),
      }
    }

    const user = sharedState.currentSession.user

    // Update user metadata
    if (attributes.data) {
      user.user_metadata = { ...user.user_metadata, ...attributes.data }
    }

    // Update email
    if (attributes.email) {
      user.email = attributes.email
    }

    // Update password (in real storage)
    if (attributes.password) {
      if (attributes.password.length < 6) {
        return {
          data: { user: null, session: null },
          error: new Error("Password should be at least 6 characters"),
        }
      }
      const userData = Array.from(sharedState.mockUsers.values()).find((u) => u.user.id === user.id)
      if (userData) {
        userData.password = attributes.password
        await persistUsers()
      }
    }

    const session = createMockSession(user)
    sharedState.currentSession = session
    await saveToStorage(STORAGE_KEYS.SESSION, session)

    notifyAuthStateChange("USER_UPDATED", session)

    if (__DEV__) {
      logger.debug(`[MockSupabase] User updated`)
    }

    return {
      data: { user, session },
      error: null,
    }
  }

  async signInWithOAuth(options: {
    provider: "google" | "apple" | "github" | "twitter"
    options?: {
      redirectTo?: string
      scopes?: string
      skipBrowserRedirect?: boolean
    }
  }): Promise<{ data: { provider: string; url: string } | null; error: Error | null }> {
    const { provider, options: oauthOptions } = options

    if (__DEV__) {
      logger.debug(`[MockSupabase] OAuth sign in`, { provider })
    }

    // Validate provider
    const supportedProviders = ["google", "apple", "github", "twitter"]
    if (!supportedProviders.includes(provider)) {
      return {
        data: null,
        error: new Error(`Unsupported OAuth provider: ${provider}`),
      }
    }

    // Generate OAuth state for PKCE flow simulation
    const state = `mock-state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const _codeVerifier = generateToken("pkce-verifier") // Stored for potential future PKCE validation

    // Store pending OAuth state
    sharedState.pendingOAuthState = {
      provider,
      state,
      redirectTo: oauthOptions?.redirectTo,
    }

    // Simulate OAuth URL (like real Supabase would return)
    const oauthUrl = `https://mock-oauth.supabase.co/authorize?provider=${provider}&state=${state}&redirect_to=${encodeURIComponent(oauthOptions?.redirectTo || "")}`

    if (__DEV__) {
      logger.debug(`[MockSupabase] OAuth URL generated`, { oauthUrl, state })
    }

    // If skipBrowserRedirect is true, don't auto-complete the flow
    if (oauthOptions?.skipBrowserRedirect) {
      return {
        data: {
          provider,
          url: oauthUrl,
        },
        error: null,
      }
    }

    // Simulate the OAuth flow completing after a delay (simulates browser redirect)
    setTimeout(async () => {
      await this._completeOAuthFlow(provider, state)
    }, 1500) // 1.5 second delay to simulate user interaction

    return {
      data: {
        provider,
        url: oauthUrl,
      },
      error: null,
    }
  }

  /**
   * Complete OAuth flow (called after user "authenticates" with provider)
   * This simulates what happens when the OAuth redirect comes back
   */
  async _completeOAuthFlow(provider: string, state: string): Promise<void> {
    // Verify state matches
    if (!sharedState.pendingOAuthState || sharedState.pendingOAuthState.state !== state) {
      if (__DEV__) {
        logger.error(`[MockSupabase] OAuth state mismatch`)
      }
      return
    }

    // Create a mock user for social login with realistic name based on provider
    const providerNames: Record<string, { firstNames: string[]; domain: string }> = {
      google: {
        firstNames: ["Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey"],
        domain: "gmail.com",
      },
      apple: {
        firstNames: ["Apple", "Mac", "iOS", "Swift"],
        domain: "icloud.com",
      },
      github: {
        firstNames: ["Dev", "Coder", "Hacker", "Builder"],
        domain: "github.com",
      },
      twitter: {
        firstNames: ["Tweet", "Bird", "Social", "Viral"],
        domain: "twitter.com",
      },
    }

    const providerConfig = providerNames[provider] || providerNames.google
    const commonLastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia"]
    const firstName =
      providerConfig.firstNames[Math.floor(Math.random() * providerConfig.firstNames.length)]
    const lastName = commonLastNames[Math.floor(Math.random() * commonLastNames.length)]
    const mockEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${providerConfig.domain}`

    const mockMetadata = {
      provider,
      social_login: true,
      provider_id: `${provider}-${Date.now()}`,
      avatar_url: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
      full_name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
    }

    // Check if user already exists, otherwise create one
    let userData = sharedState.mockUsers.get(mockEmail)
    if (!userData) {
      const user = createMockUser(mockEmail, mockMetadata)
      userData = { email: mockEmail, password: "", user } // No password for social logins
      sharedState.mockUsers.set(mockEmail, userData)
      await persistUsers()
    }

    const session = createMockSession(userData.user)
    sharedState.currentSession = session
    await saveToStorage(STORAGE_KEYS.SESSION, session)

    // Clear pending state
    sharedState.pendingOAuthState = null

    if (__DEV__) {
      logger.debug(`[MockSupabase] OAuth flow completed`, { email: mockEmail })
    }

    notifyAuthStateChange("SIGNED_IN", session)
  }

  /**
   * Manually complete OAuth for testing (simulates user completing OAuth in browser)
   */
  async simulateOAuthCallback(customEmail?: string): Promise<AuthResponse> {
    if (!sharedState.pendingOAuthState) {
      return {
        data: { user: null, session: null },
        error: new Error("No pending OAuth flow"),
      }
    }

    const { provider, state } = sharedState.pendingOAuthState

    if (customEmail) {
      // Use custom email
      let userData = sharedState.mockUsers.get(customEmail)
      if (!userData) {
        const user = createMockUser(customEmail, { provider, social_login: true })
        userData = { email: customEmail, password: "", user }
        sharedState.mockUsers.set(customEmail, userData)
        await persistUsers()
      }

      const session = createMockSession(userData.user)
      sharedState.currentSession = session
      await saveToStorage(STORAGE_KEYS.SESSION, session)
      sharedState.pendingOAuthState = null
      notifyAuthStateChange("SIGNED_IN", session)

      return {
        data: { user: userData.user, session },
        error: null,
      }
    }

    // Complete with auto-generated user
    await this._completeOAuthFlow(provider, state)

    return {
      data: { user: sharedState.currentSession?.user || null, session: sharedState.currentSession },
      error: null,
    }
  }

  onAuthStateChange(callback: AuthStateChangeCallback) {
    sharedState.authStateListeners.push(callback)

    // Initialize and check session, then call callback
    initializeStorage().then(() => {
      if (sharedState.currentSession && isSessionValid(sharedState.currentSession)) {
        callback("SIGNED_IN", sharedState.currentSession)
      } else if (sharedState.currentSession && !isSessionValid(sharedState.currentSession)) {
        // Session expired
        sharedState.currentSession = null
        removeFromStorage(STORAGE_KEYS.SESSION)
        callback("SIGNED_OUT", null)
      }
    })

    // Return unsubscribe function
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const index = sharedState.authStateListeners.indexOf(callback)
            if (index > -1) {
              sharedState.authStateListeners.splice(index, 1)
            }
            if (__DEV__) {
              logger.debug(`[MockSupabase] Unsubscribed from auth state changes`)
            }
          },
        },
      },
    }
  }

  // Auto-refresh methods (simulated)
  async startAutoRefresh() {
    // Simulate token refresh before expiry
    if (sharedState.currentSession && sharedState.currentSession.expires_at) {
      const timeUntilExpiry = sharedState.currentSession.expires_at - Math.floor(Date.now() / 1000)
      // Refresh if less than 5 minutes remaining
      if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
        if (__DEV__) {
          logger.debug(`[MockSupabase] Refreshing token`)
        }
        const refreshedSession = createMockSession(sharedState.currentSession.user)
        sharedState.currentSession = refreshedSession
        await saveToStorage(STORAGE_KEYS.SESSION, refreshedSession)
        notifyAuthStateChange("TOKEN_REFRESHED", refreshedSession)
      }
    }
  }

  async stopAutoRefresh() {
    // No-op for mock
  }
}

