/**
 * Mock Supabase Implementation
 *
 * Provides a comprehensive mock Supabase client for development without API keys.
 * Simulates authentication and database operations with persistent storage.
 *
 * Features:
 * - Session persistence using SecureStore (like real Supabase)
 * - User and database data persistence
 * - Session expiry checking
 * - Token refresh simulation
 * - Realistic error messages
 */

import { Platform } from "react-native"
import * as SecureStore from "expo-secure-store"

import type {
  User,
  Session,
  AuthResponse,
  SignUpCredentials,
  SignInCredentials,
  ResetPasswordOptions,
  AuthChangeEvent,
  AuthStateChangeCallback,
} from "../../types/auth"
import type { DatabaseResponse } from "../../types/database"

// Cross-platform base64 utilities
const base64Utils = {
  decode: (str: string): Uint8Array => {
    // Use global atob if available (web/polyfilled environments)
    if (typeof atob !== "undefined") {
      const binary = atob(str)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
    }
    // Fallback for environments without atob
    // This is a simple base64 decoder that works without dependencies
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    const lookup = new Uint8Array(256)
    for (let i = 0; i < chars.length; i++) {
      lookup[chars.charCodeAt(i)] = i
    }
    const len = str.length
    const bytes = new Uint8Array((len * 3) / 4)
    let p = 0
    for (let i = 0; i < len; i += 4) {
      const encoded1 = lookup[str.charCodeAt(i)]
      const encoded2 = lookup[str.charCodeAt(i + 1)]
      const encoded3 = lookup[str.charCodeAt(i + 2)]
      const encoded4 = lookup[str.charCodeAt(i + 3)]
      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4)
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2)
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63)
    }
    return bytes
  },
  encode: (bytes: Uint8Array): string => {
    // Use global btoa if available
    if (typeof btoa !== "undefined") {
      const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")
      return btoa(binary)
    }
    // Fallback encoder
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    let result = ""
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i]
      const b = bytes[i + 1] || 0
      const c = bytes[i + 2] || 0
      result += chars[a >> 2]
      result += chars[((a & 3) << 4) | (b >> 4)]
      result += chars[((b & 15) << 2) | (c >> 6)]
      result += chars[c & 63]
    }
    return result
  },
}

// Platform-aware storage adapter
const storageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null
      } catch {
        return null
      }
    }
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(key, value)
        }
      } catch {
        // Ignore errors
      }
      return
    }
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      // Ignore errors
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(key)
        }
      } catch {
        // Ignore errors
      }
      return
    }
    try {
      await SecureStore.deleteItemAsync(key)
    } catch {
      // Ignore errors
    }
  },
}

// Storage keys (matching Supabase's storage keys)
const STORAGE_KEYS = {
  SESSION: "supabase.auth.token",
  USERS: "mock.supabase.users",
  DATABASE: "mock.supabase.database",
}

// In-memory storage (backed by SecureStore)
let mockUsers: Map<string, { email: string; password: string; user: User }> = new Map()
let mockDatabase: Map<string, Map<string, any>> = new Map()
let currentSession: Session | null = null
let authStateListeners: AuthStateChangeCallback[] = []
let isInitialized = false

// Storage helpers
async function loadFromStorage<T>(key: string): Promise<T | null> {
  try {
    const value = await storageAdapter.getItem(key)
    return value ? JSON.parse(value) : null
  } catch (error) {
    if (__DEV__) {
      console.warn(`🔐 [MockSupabase] Failed to load ${key}:`, error)
    }
    return null
  }
}

async function saveToStorage(key: string, value: any): Promise<void> {
  try {
    await storageAdapter.setItem(key, JSON.stringify(value))
  } catch (error) {
    if (__DEV__) {
      console.warn(`🔐 [MockSupabase] Failed to save ${key}:`, error)
    }
  }
}

async function removeFromStorage(key: string): Promise<void> {
  try {
    await storageAdapter.removeItem(key)
  } catch (error) {
    if (__DEV__) {
      console.warn(`🔐 [MockSupabase] Failed to remove ${key}:`, error)
    }
  }
}

// Load persisted data on initialization
async function initializeStorage() {
  if (isInitialized) return

  try {
    // Load session
    const savedSession = await loadFromStorage<Session>(STORAGE_KEYS.SESSION)
    if (savedSession) {
      // Check if session is expired
      if (savedSession.expires_at && savedSession.expires_at > Math.floor(Date.now() / 1000)) {
        currentSession = savedSession
        if (__DEV__) {
          console.log(`🔐 [MockSupabase] Restored session for: ${savedSession.user.email}`)
        }
      } else {
        // Session expired, remove it
        await removeFromStorage(STORAGE_KEYS.SESSION)
        if (__DEV__) {
          console.log(`🔐 [MockSupabase] Session expired, removed`)
        }
      }
    }

    // Load users
    const savedUsers = await loadFromStorage<
      Array<[string, { email: string; password: string; user: User }]>
    >(STORAGE_KEYS.USERS)
    if (savedUsers) {
      mockUsers = new Map(savedUsers)
      if (__DEV__ && mockUsers.size > 0) {
        console.log(`🔐 [MockSupabase] Restored ${mockUsers.size} users`)
      }
    }

    // Load database
    const savedDatabase = await loadFromStorage<Record<string, Record<string, any>>>(
      STORAGE_KEYS.DATABASE,
    )
    if (savedDatabase) {
      mockDatabase = new Map()
      Object.entries(savedDatabase).forEach(([tableName, records]) => {
        const tableMap = new Map(Object.entries(records))
        mockDatabase.set(tableName, tableMap)
      })
      if (__DEV__ && mockDatabase.size > 0) {
        console.log(`💾 [MockSupabase] Restored ${mockDatabase.size} tables`)
      }
    }

    isInitialized = true
  } catch (error) {
    if (__DEV__) {
      console.warn(`🔐 [MockSupabase] Failed to initialize storage:`, error)
    }
    isInitialized = true // Mark as initialized even if failed
  }
}

// Save users to storage
async function persistUsers() {
  const usersArray = Array.from(mockUsers.entries())
  await saveToStorage(STORAGE_KEYS.USERS, usersArray)
}

// Save database to storage
async function persistDatabase() {
  const databaseObj: Record<string, Record<string, any>> = {}
  mockDatabase.forEach((table, tableName) => {
    databaseObj[tableName] = Object.fromEntries(table.entries())
  })
  await saveToStorage(STORAGE_KEYS.DATABASE, databaseObj)
}

// Helper to generate realistic tokens
function generateToken(prefix: string = "mock"): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const random2 = Math.random().toString(36).substring(2, 15)
  // Format similar to JWT: base64-like string
  return `${prefix}-${timestamp}-${random}-${random2}`.substring(0, 100)
}

// Helper to extract realistic name from email
function extractNameFromEmail(email: string): {
  first_name: string
  last_name: string
  full_name: string
} {
  // Extract the part before @
  const emailPrefix = email.split("@")[0]

  // Common name patterns
  const commonFirstNames = [
    "John",
    "Jane",
    "Michael",
    "Sarah",
    "David",
    "Emily",
    "James",
    "Jessica",
    "Robert",
    "Ashley",
    "William",
    "Amanda",
    "Richard",
    "Melissa",
    "Joseph",
    "Deborah",
    "Thomas",
    "Stephanie",
    "Christopher",
    "Rebecca",
  ]
  const commonLastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
    "Lee",
  ]

  // Try to extract name from email patterns
  let first_name = ""
  let last_name = ""

  // Pattern: firstname.lastname@ or firstname_lastname@
  if (emailPrefix.includes(".") || emailPrefix.includes("_")) {
    const parts = emailPrefix.split(/[._]/)
    if (parts.length >= 2) {
      first_name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase()
      last_name = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase()
    } else if (parts.length === 1) {
      first_name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase()
      last_name = commonLastNames[Math.floor(Math.random() * commonLastNames.length)]
    }
  }
  // Pattern: firstname@ (single word)
  else {
    // Capitalize first letter
    first_name = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).toLowerCase()
    // Use a random common last name
    last_name = commonLastNames[Math.floor(Math.random() * commonLastNames.length)]
  }

  // Fallback: if we couldn't extract a good name, use common names
  if (!first_name || first_name.length < 2) {
    first_name = commonFirstNames[Math.floor(Math.random() * commonFirstNames.length)]
  }
  if (!last_name || last_name.length < 2) {
    last_name = commonLastNames[Math.floor(Math.random() * commonLastNames.length)]
  }

  return {
    first_name,
    last_name,
    full_name: `${first_name} ${last_name}`,
  }
}

// Helper to create a mock user
function createMockUser(email: string, metadata?: Record<string, any>): User {
  // Extract realistic name from email
  const { first_name, last_name, full_name } = extractNameFromEmail(email)

  // Merge extracted metadata with provided metadata (provided takes precedence)
  const userMetadata = {
    first_name,
    last_name,
    full_name,
    avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(full_name)}&background=random`,
    ...metadata,
  }

  return {
    id: `mock-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    aud: "authenticated",
    email,
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: userMetadata,
  }
}

// Helper to create a mock session
function createMockSession(user: User): Session {
  const expiresIn = 3600 // 1 hour
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn

  return {
    access_token: generateToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"), // JWT-like format
    refresh_token: generateToken("refresh"),
    expires_in: expiresIn,
    expires_at: expiresAt,
    token_type: "bearer",
    user,
  }
}

// Check if session is valid
function isSessionValid(session: Session | null): boolean {
  if (!session) return false
  if (!session.expires_at) return true
  return session.expires_at > Math.floor(Date.now() / 1000)
}

// Notify auth state listeners
function notifyAuthStateChange(event: AuthChangeEvent, session: Session | null) {
  authStateListeners.forEach((listener) => {
    try {
      listener(event, session)
    } catch (error) {
      console.error("Error in auth state listener:", error)
    }
  })
}

// Simulate network delay
const delay = (ms: number = 500) => new Promise((resolve) => setTimeout(resolve, ms))

class MockSupabaseAuth {
  constructor() {
    // Initialize storage on first auth operation
    if (!isInitialized) {
      initializeStorage()
    }
  }

  async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    await initializeStorage()
    const { email, password, options } = credentials
    await delay()

    if (__DEV__) {
      console.log(`🔐 [MockSupabase] Sign up: ${email}`)
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
    if (mockUsers.has(email)) {
      return {
        data: { user: null, session: null },
        error: new Error("User already registered"),
      }
    }

    // Create new user
    const user = createMockUser(email, options?.data)
    mockUsers.set(email, { email, password, user })
    await persistUsers()

    const session = createMockSession(user)
    currentSession = session
    await saveToStorage(STORAGE_KEYS.SESSION, session)

    notifyAuthStateChange("SIGNED_IN", session)

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
      console.log(`🔐 [MockSupabase] Sign in: ${email}`)
    }

    const userData = mockUsers.get(email)

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

    const session = createMockSession(userData.user)
    currentSession = session
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
      console.log("🔐 [MockSupabase] Sign out")
    }

    currentSession = null
    await removeFromStorage(STORAGE_KEYS.SESSION)
    notifyAuthStateChange("SIGNED_OUT", null)

    return { error: null }
  }

  async getSession(): Promise<{ data: { session: Session | null }; error: Error | null }> {
    await initializeStorage()

    // Check if session is still valid
    if (currentSession && !isSessionValid(currentSession)) {
      if (__DEV__) {
        console.log("🔐 [MockSupabase] Session expired")
      }
      currentSession = null
      await removeFromStorage(STORAGE_KEYS.SESSION)
      notifyAuthStateChange("SIGNED_OUT", null)
    }

    return {
      data: { session: currentSession },
      error: null,
    }
  }

  async getUser(): Promise<{ data: { user: User | null }; error: Error | null }> {
    await initializeStorage()

    // Ensure session is valid
    if (currentSession && !isSessionValid(currentSession)) {
      currentSession = null
      await removeFromStorage(STORAGE_KEYS.SESSION)
    }

    return {
      data: { user: currentSession?.user || null },
      error: null,
    }
  }

  async resetPasswordForEmail(
    email: string,
    _options?: ResetPasswordOptions,
  ): Promise<{ data: any; error: Error | null }> {
    await delay()

    if (__DEV__) {
      console.log(`🔐 [MockSupabase] Password reset requested for: ${email}`)
      console.log(`🔐 [MockSupabase] Reset link (mock): reset-password/${email}`)
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

    if (!currentSession) {
      return {
        data: { user: null, session: null },
        error: new Error("Not authenticated"),
      }
    }

    const user = currentSession.user

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
      const userData = Array.from(mockUsers.values()).find((u) => u.user.id === user.id)
      if (userData) {
        userData.password = attributes.password
        await persistUsers()
      }
    }

    const session = createMockSession(user)
    currentSession = session
    await saveToStorage(STORAGE_KEYS.SESSION, session)

    notifyAuthStateChange("USER_UPDATED", session)

    if (__DEV__) {
      console.log("🔐 [MockSupabase] User updated")
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
      console.log(`🔐 [MockSupabase] OAuth sign in with ${provider}`)
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
    pendingOAuthState = {
      provider,
      state,
      redirectTo: oauthOptions?.redirectTo,
    }

    // Simulate OAuth URL (like real Supabase would return)
    const oauthUrl = `https://mock-oauth.supabase.co/authorize?provider=${provider}&state=${state}&redirect_to=${encodeURIComponent(oauthOptions?.redirectTo || "")}`

    if (__DEV__) {
      console.log(`🔐 [MockSupabase] OAuth URL generated: ${oauthUrl}`)
      console.log(`🔐 [MockSupabase] State token: ${state}`)
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
    if (!pendingOAuthState || pendingOAuthState.state !== state) {
      if (__DEV__) {
        console.error("🔐 [MockSupabase] OAuth state mismatch")
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
    let userData = mockUsers.get(mockEmail)
    if (!userData) {
      const user = createMockUser(mockEmail, mockMetadata)
      userData = { email: mockEmail, password: "", user } // No password for social logins
      mockUsers.set(mockEmail, userData)
      await persistUsers()
    }

    const session = createMockSession(userData.user)
    currentSession = session
    await saveToStorage(STORAGE_KEYS.SESSION, session)

    // Clear pending state
    pendingOAuthState = null

    if (__DEV__) {
      console.log(`🔐 [MockSupabase] OAuth flow completed for: ${mockEmail}`)
    }

    notifyAuthStateChange("SIGNED_IN", session)
  }

  /**
   * Manually complete OAuth for testing (simulates user completing OAuth in browser)
   */
  async simulateOAuthCallback(customEmail?: string): Promise<AuthResponse> {
    if (!pendingOAuthState) {
      return {
        data: { user: null, session: null },
        error: new Error("No pending OAuth flow"),
      }
    }

    const { provider, state } = pendingOAuthState

    if (customEmail) {
      // Use custom email
      let userData = mockUsers.get(customEmail)
      if (!userData) {
        const user = createMockUser(customEmail, { provider, social_login: true })
        userData = { email: customEmail, password: "", user }
        mockUsers.set(customEmail, userData)
        await persistUsers()
      }

      const session = createMockSession(userData.user)
      currentSession = session
      await saveToStorage(STORAGE_KEYS.SESSION, session)
      pendingOAuthState = null
      notifyAuthStateChange("SIGNED_IN", session)

      return {
        data: { user: userData.user, session },
        error: null,
      }
    }

    // Complete with auto-generated user
    await this._completeOAuthFlow(provider, state)

    return {
      data: { user: currentSession?.user || null, session: currentSession },
      error: null,
    }
  }

  onAuthStateChange(callback: AuthStateChangeCallback) {
    authStateListeners.push(callback)

    // Initialize and check session, then call callback
    initializeStorage().then(() => {
      if (currentSession && isSessionValid(currentSession)) {
        callback("SIGNED_IN", currentSession)
      } else if (currentSession && !isSessionValid(currentSession)) {
        // Session expired
        currentSession = null
        removeFromStorage(STORAGE_KEYS.SESSION)
        callback("SIGNED_OUT", null)
      }
    })

    // Return unsubscribe function
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const index = authStateListeners.indexOf(callback)
            if (index > -1) {
              authStateListeners.splice(index, 1)
            }
            if (__DEV__) {
              console.log("🔐 [MockSupabase] Unsubscribed from auth state changes")
            }
          },
        },
      },
    }
  }

  // Auto-refresh methods (simulated)
  async startAutoRefresh() {
    // Simulate token refresh before expiry
    if (currentSession && currentSession.expires_at) {
      const timeUntilExpiry = currentSession.expires_at - Math.floor(Date.now() / 1000)
      // Refresh if less than 5 minutes remaining
      if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
        if (__DEV__) {
          console.log("🔐 [MockSupabase] Refreshing token")
        }
        const refreshedSession = createMockSession(currentSession.user)
        currentSession = refreshedSession
        await saveToStorage(STORAGE_KEYS.SESSION, refreshedSession)
        notifyAuthStateChange("TOKEN_REFRESHED", refreshedSession)
      }
    }
  }

  async stopAutoRefresh() {
    // No-op for mock
  }
}

// Mock database query builder
class MockDatabaseQuery {
  private tableName: string
  private filters: Array<{ column: string; operator: string; value: any }> = []
  private orderColumn?: string
  private orderAscending: boolean = true
  private limitCount?: number
  private rangeFrom?: number
  private rangeTo?: number

  constructor(tableName: string) {
    this.tableName = tableName
  }

  /**
   * Get filters for external use (update/delete operations)
   */
  getFilters(): Array<{ column: string; operator: string; value: any }> {
    return this.filters
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: "eq", value })
    return this
  }

  neq(column: string, value: any) {
    this.filters.push({ column, operator: "neq", value })
    return this
  }

  gt(column: string, value: any) {
    this.filters.push({ column, operator: "gt", value })
    return this
  }

  gte(column: string, value: any) {
    this.filters.push({ column, operator: "gte", value })
    return this
  }

  lt(column: string, value: any) {
    this.filters.push({ column, operator: "lt", value })
    return this
  }

  lte(column: string, value: any) {
    this.filters.push({ column, operator: "lte", value })
    return this
  }

  like(column: string, pattern: string) {
    this.filters.push({ column, operator: "like", value: pattern })
    return this
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ column, operator: "ilike", value: pattern })
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, operator: "in", value: values })
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column
    this.orderAscending = options?.ascending ?? true
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  range(from: number, to: number) {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  match(query: Record<string, any>) {
    Object.entries(query).forEach(([column, value]) => {
      this.eq(column, value)
    })
    return this
  }

  /**
   * Apply filters to items - public for use by update/delete operations
   */
  applyFilters(items: any[]): any[] {
    return items.filter((item) => {
      return this.filters.every((filter) => {
        const value = item[filter.column]

        switch (filter.operator) {
          case "eq":
            return value === filter.value
          case "neq":
            return value !== filter.value
          case "gt":
            return value > filter.value
          case "gte":
            return value >= filter.value
          case "lt":
            return value < filter.value
          case "lte":
            return value <= filter.value
          case "like":
          case "ilike":
            const pattern = filter.value.replace(/%/g, ".*")
            const regex = new RegExp(pattern, filter.operator === "ilike" ? "i" : "")
            return regex.test(String(value))
          case "in":
            return filter.value.includes(value)
          default:
            return true
        }
      })
    })
  }

  private applyOrdering(items: any[]): any[] {
    if (!this.orderColumn) return items

    return [...items].sort((a, b) => {
      const aVal = a[this.orderColumn!]
      const bVal = b[this.orderColumn!]

      if (aVal < bVal) return this.orderAscending ? -1 : 1
      if (aVal > bVal) return this.orderAscending ? 1 : -1
      return 0
    })
  }

  private applyLimiting(items: any[]): any[] {
    if (this.rangeFrom !== undefined && this.rangeTo !== undefined) {
      return items.slice(this.rangeFrom, this.rangeTo + 1)
    }
    if (this.limitCount !== undefined) {
      return items.slice(0, this.limitCount)
    }
    return items
  }

  async single(): Promise<DatabaseResponse> {
    await delay(200)

    const table = mockDatabase.get(this.tableName)
    if (!table) {
      return { data: null, error: new Error(`Table ${this.tableName} not found`) }
    }

    const items = Array.from(table.values())
    const filtered = this.applyFilters(items)

    if (filtered.length === 0) {
      return { data: null, error: new Error("No rows found") }
    }

    if (filtered.length > 1) {
      return { data: null, error: new Error("Multiple rows found") }
    }

    return { data: filtered[0], error: null }
  }

  async maybeSingle(): Promise<DatabaseResponse> {
    await delay(200)

    const table = mockDatabase.get(this.tableName)
    if (!table) {
      return { data: null, error: null }
    }

    const items = Array.from(table.values())
    const filtered = this.applyFilters(items)

    if (filtered.length === 0) {
      return { data: null, error: null }
    }

    if (filtered.length > 1) {
      return { data: null, error: new Error("Multiple rows found") }
    }

    return { data: filtered[0], error: null }
  }

  async then(resolve: (value: DatabaseResponse) => void) {
    await delay(200)

    const table = mockDatabase.get(this.tableName)
    if (!table) {
      resolve({ data: [], error: null })
      return
    }

    let items = Array.from(table.values())
    items = this.applyFilters(items)
    items = this.applyOrdering(items)
    items = this.applyLimiting(items)

    resolve({ data: items, error: null, count: items.length })
  }
}

// Mock database table
class MockDatabaseTable {
  private tableName: string

  constructor(tableName: string) {
    this.tableName = tableName

    // Initialize table if it doesn't exist
    if (!mockDatabase.has(tableName)) {
      mockDatabase.set(tableName, new Map())
    }
  }

  select(columns?: string) {
    if (__DEV__) {
      console.log(`💾 [MockSupabase] SELECT ${columns || "*"} FROM ${this.tableName}`)
    }
    return new MockDatabaseQuery(this.tableName)
  }

  async insert(data: any | any[]): Promise<DatabaseResponse> {
    await delay(300)

    const table = mockDatabase.get(this.tableName)!
    const items = Array.isArray(data) ? data : [data]
    const inserted: any[] = []

    items.forEach((item) => {
      const id = item.id || `mock-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const record = {
        ...item,
        id,
        created_at: item.created_at || new Date().toISOString(),
      }
      table.set(id, record)
      inserted.push(record)
    })

    // Persist database changes
    await persistDatabase()

    if (__DEV__) {
      console.log(`💾 [MockSupabase] INSERT INTO ${this.tableName}:`, inserted.length, "rows")
    }

    return {
      data: Array.isArray(data) ? inserted : inserted[0],
      error: null,
    }
  }

  update(data: any) {
    if (__DEV__) {
      console.log(`💾 [MockSupabase] UPDATE ${this.tableName}`)
    }

    const query = new MockDatabaseQuery(this.tableName)

    query.then = async (resolve) => {
      await delay(300)

      const table = mockDatabase.get(this.tableName)!
      const items = Array.from(table.values())
      const filtered = query.applyFilters(items)

      filtered.forEach((item: any) => {
        const updated = { ...item, ...data, updated_at: new Date().toISOString() }
        table.set(item.id, updated)
      })

      // Persist database changes
      await persistDatabase()

      if (__DEV__) {
        console.log(`💾 [MockSupabase] Updated ${filtered.length} rows`)
      }

      resolve({ data: filtered, error: null })
    }

    return query
  }

  delete() {
    if (__DEV__) {
      console.log(`💾 [MockSupabase] DELETE FROM ${this.tableName}`)
    }

    const query = new MockDatabaseQuery(this.tableName)

    query.then = async (resolve) => {
      await delay(300)

      const table = mockDatabase.get(this.tableName)!
      const items = Array.from(table.values())
      const filtered = query.applyFilters(items)

      filtered.forEach((item: any) => {
        table.delete(item.id)
      })

      // Persist database changes
      await persistDatabase()

      if (__DEV__) {
        console.log(`💾 [MockSupabase] Deleted ${filtered.length} rows`)
      }

      resolve({ data: filtered, error: null })
    }

    return query
  }

  async upsert(data: any | any[]): Promise<DatabaseResponse> {
    await delay(300)

    const table = mockDatabase.get(this.tableName)!
    const items = Array.isArray(data) ? data : [data]
    const upserted: any[] = []

    items.forEach((item) => {
      const id = item.id || `mock-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const existing = table.get(id)
      const record = {
        ...existing,
        ...item,
        id,
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      table.set(id, record)
      upserted.push(record)
    })

    // Persist database changes
    await persistDatabase()

    if (__DEV__) {
      console.log(`💾 [MockSupabase] UPSERT INTO ${this.tableName}:`, upserted.length, "rows")
    }

    return {
      data: Array.isArray(data) ? upserted : upserted[0],
      error: null,
    }
  }
}

// ============================================================================
// MOCK STORAGE
// ============================================================================

interface StorageFile {
  id: string
  name: string
  bucket: string
  path: string
  size: number
  mimeType: string
  data: string // Base64 encoded data
  created_at: string
  updated_at: string
}

// In-memory file storage
const mockFileStorage: Map<string, StorageFile> = new Map()
const mockBuckets: Set<string> = new Set(["avatars", "uploads", "public"])

class MockStorageFileApi {
  private bucket: string
  private path: string

  constructor(bucket: string, path: string) {
    this.bucket = bucket
    this.path = path
  }

  async upload(
    fileBody: Blob | ArrayBuffer | string,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<{ data: { path: string } | null; error: Error | null }> {
    await delay(500)

    const fullPath = `${this.bucket}/${this.path}`

    // Check if file exists and upsert is false
    if (mockFileStorage.has(fullPath) && !options?.upsert) {
      return {
        data: null,
        error: new Error("The resource already exists"),
      }
    }

    // Convert to base64 for storage
    let base64Data = ""
    let size = 0

    if (typeof fileBody === "string") {
      base64Data = fileBody
      size = fileBody.length
    } else if (fileBody instanceof ArrayBuffer) {
      const bytes = new Uint8Array(fileBody)
      base64Data = base64Utils.encode(bytes)
      size = fileBody.byteLength
    } else if (fileBody instanceof Blob) {
      // For Blob, we'll store a placeholder
      base64Data = "blob-placeholder"
      size = fileBody.size
    }

    const file: StorageFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.path.split("/").pop() || "file",
      bucket: this.bucket,
      path: this.path,
      size,
      mimeType: options?.contentType || "application/octet-stream",
      data: base64Data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockFileStorage.set(fullPath, file)

    if (__DEV__) {
      console.log(`📁 [MockStorage] Uploaded: ${fullPath} (${size} bytes)`)
    }

    return {
      data: { path: this.path },
      error: null,
    }
  }

  async download(): Promise<{ data: Blob | null; error: Error | null }> {
    await delay(300)

    const fullPath = `${this.bucket}/${this.path}`
    const file = mockFileStorage.get(fullPath)

    if (!file) {
      return {
        data: null,
        error: new Error("Object not found"),
      }
    }

    // Create a blob from the stored data
    const decodedData = base64Utils.decode(file.data)
    const arrayBuffer = decodedData.buffer.slice(
      decodedData.byteOffset,
      decodedData.byteOffset + decodedData.byteLength,
    ) as ArrayBuffer
    const blob = new Blob([arrayBuffer], { type: file.mimeType })

    if (__DEV__) {
      console.log(`📁 [MockStorage] Downloaded: ${fullPath}`)
    }

    return {
      data: blob,
      error: null,
    }
  }

  async remove(): Promise<{ data: { path: string }[] | null; error: Error | null }> {
    await delay(200)

    const fullPath = `${this.bucket}/${this.path}`
    const existed = mockFileStorage.has(fullPath)
    mockFileStorage.delete(fullPath)

    if (__DEV__) {
      console.log(`📁 [MockStorage] Removed: ${fullPath} (existed: ${existed})`)
    }

    return {
      data: [{ path: this.path }],
      error: null,
    }
  }

  getPublicUrl(): { data: { publicUrl: string } } {
    const publicUrl = `https://mock-storage.supabase.co/${this.bucket}/${this.path}`

    if (__DEV__) {
      console.log(`📁 [MockStorage] Public URL: ${publicUrl}`)
    }

    return {
      data: { publicUrl },
    }
  }

  async createSignedUrl(
    expiresIn: number,
  ): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
    await delay(100)

    const signedUrl = `https://mock-storage.supabase.co/${this.bucket}/${this.path}?token=mock-signed-${Date.now()}&expires=${expiresIn}`

    if (__DEV__) {
      console.log(`📁 [MockStorage] Signed URL (${expiresIn}s): ${signedUrl}`)
    }

    return {
      data: { signedUrl },
      error: null,
    }
  }
}

class MockStorageBucket {
  private bucketName: string

  constructor(bucketName: string) {
    this.bucketName = bucketName
    mockBuckets.add(bucketName)
  }

  upload(
    path: string,
    fileBody: Blob | ArrayBuffer | string,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<{ data: { path: string } | null; error: Error | null }> {
    return new MockStorageFileApi(this.bucketName, path).upload(fileBody, options)
  }

  download(path: string): Promise<{ data: Blob | null; error: Error | null }> {
    return new MockStorageFileApi(this.bucketName, path).download()
  }

  remove(paths: string[]): Promise<{ data: { path: string }[] | null; error: Error | null }> {
    // Remove multiple files
    const removed: { path: string }[] = []
    paths.forEach((path) => {
      const fullPath = `${this.bucketName}/${path}`
      mockFileStorage.delete(fullPath)
      removed.push({ path })
    })

    if (__DEV__) {
      console.log(`📁 [MockStorage] Removed ${removed.length} files from ${this.bucketName}`)
    }

    return Promise.resolve({
      data: removed,
      error: null,
    })
  }

  async list(
    path?: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{
    data: Array<{ name: string; id: string; metadata: any }> | null
    error: Error | null
  }> {
    await delay(200)

    const prefix = path ? `${this.bucketName}/${path}` : this.bucketName
    const files: Array<{ name: string; id: string; metadata: any }> = []

    mockFileStorage.forEach((file, fullPath) => {
      if (fullPath.startsWith(prefix)) {
        files.push({
          name: file.name,
          id: file.id,
          metadata: {
            size: file.size,
            mimeType: file.mimeType,
            created_at: file.created_at,
          },
        })
      }
    })

    // Apply limit/offset
    const start = options?.offset || 0
    const end = options?.limit ? start + options.limit : files.length
    const result = files.slice(start, end)

    if (__DEV__) {
      console.log(`📁 [MockStorage] Listed ${result.length} files in ${prefix}`)
    }

    return {
      data: result,
      error: null,
    }
  }

  getPublicUrl(path: string): { data: { publicUrl: string } } {
    return new MockStorageFileApi(this.bucketName, path).getPublicUrl()
  }

  createSignedUrl(
    path: string,
    expiresIn: number,
  ): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
    return new MockStorageFileApi(this.bucketName, path).createSignedUrl(expiresIn)
  }
}

class MockStorage {
  from(bucket: string): MockStorageBucket {
    return new MockStorageBucket(bucket)
  }

  async listBuckets(): Promise<{
    data: Array<{ name: string; id: string }> | null
    error: Error | null
  }> {
    await delay(100)

    const buckets = Array.from(mockBuckets).map((name) => ({
      name,
      id: `bucket-${name}`,
    }))

    if (__DEV__) {
      console.log(`📁 [MockStorage] Listed ${buckets.length} buckets`)
    }

    return {
      data: buckets,
      error: null,
    }
  }

  async createBucket(
    name: string,
    options?: { public?: boolean },
  ): Promise<{ data: { name: string } | null; error: Error | null }> {
    await delay(200)

    if (mockBuckets.has(name)) {
      return {
        data: null,
        error: new Error("Bucket already exists"),
      }
    }

    mockBuckets.add(name)

    if (__DEV__) {
      console.log(`📁 [MockStorage] Created bucket: ${name} (public: ${options?.public ?? false})`)
    }

    return {
      data: { name },
      error: null,
    }
  }

  async deleteBucket(name: string): Promise<{ data: null; error: Error | null }> {
    await delay(200)

    if (!mockBuckets.has(name)) {
      return {
        data: null,
        error: new Error("Bucket not found"),
      }
    }

    // Remove all files in bucket
    mockFileStorage.forEach((_, key) => {
      if (key.startsWith(`${name}/`)) {
        mockFileStorage.delete(key)
      }
    })

    mockBuckets.delete(name)

    if (__DEV__) {
      console.log(`📁 [MockStorage] Deleted bucket: ${name}`)
    }

    return {
      data: null,
      error: null,
    }
  }
}

// ============================================================================
// MOCK REALTIME
// ============================================================================

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*"
type RealtimeCallback = (payload: {
  eventType: RealtimeEvent
  new: any
  old: any
  schema: string
  table: string
}) => void

interface RealtimeSubscription {
  table: string
  event: RealtimeEvent
  callback: RealtimeCallback
  filter?: string
}

// Global realtime subscriptions
const realtimeSubscriptions: Map<string, RealtimeSubscription[]> = new Map()
let _realtimeChannelCounter = 0

class MockRealtimeChannel {
  private channelName: string
  private subscriptions: RealtimeSubscription[] = []
  private isSubscribed = false

  constructor(channelName: string) {
    this.channelName = channelName
    _realtimeChannelCounter++
  }

  on(
    event: "postgres_changes",
    config: { event: RealtimeEvent; schema: string; table: string; filter?: string },
    callback: RealtimeCallback,
  ): MockRealtimeChannel {
    this.subscriptions.push({
      table: config.table,
      event: config.event,
      callback,
      filter: config.filter,
    })

    if (__DEV__) {
      console.log(`📡 [MockRealtime] Registered listener: ${config.table}.${config.event}`)
    }

    return this
  }

  subscribe(
    callback?: (status: "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT") => void,
  ): MockRealtimeChannel {
    this.isSubscribed = true

    // Store subscriptions globally
    realtimeSubscriptions.set(this.channelName, this.subscriptions)

    if (__DEV__) {
      console.log(`📡 [MockRealtime] Subscribed to channel: ${this.channelName}`)
    }

    // Simulate async subscription confirmation
    setTimeout(() => {
      callback?.("SUBSCRIBED")
    }, 100)

    return this
  }

  unsubscribe(): Promise<"ok" | "error"> {
    this.isSubscribed = false
    realtimeSubscriptions.delete(this.channelName)

    if (__DEV__) {
      console.log(`📡 [MockRealtime] Unsubscribed from channel: ${this.channelName}`)
    }

    return Promise.resolve("ok")
  }
}

class MockRealtime {
  channel(name: string): MockRealtimeChannel {
    return new MockRealtimeChannel(name)
  }

  removeChannel(channel: MockRealtimeChannel): Promise<"ok" | "error"> {
    return channel.unsubscribe()
  }

  removeAllChannels(): Promise<Array<"ok" | "error">> {
    const results: Array<"ok" | "error"> = []
    realtimeSubscriptions.clear()

    if (__DEV__) {
      console.log(`📡 [MockRealtime] Removed all channels`)
    }

    return Promise.resolve(results)
  }
}

// Helper to trigger realtime events (for testing)
function triggerRealtimeEvent(
  table: string,
  eventType: RealtimeEvent,
  newData: any,
  oldData: any = null,
) {
  realtimeSubscriptions.forEach((subscriptions) => {
    subscriptions.forEach((sub) => {
      if (sub.table === table && (sub.event === eventType || sub.event === "*")) {
        // Check filter if present
        if (sub.filter) {
          const [column, operator, value] = sub.filter.split(/[=<>]/).map((s) => s.trim())
          if (operator === "eq" && newData[column] !== value) {
            return
          }
        }

        sub.callback({
          eventType,
          new: newData,
          old: oldData,
          schema: "public",
          table,
        })
      }
    })
  })
}

// ============================================================================
// MOCK OAUTH (Improved with realistic flow simulation)
// ============================================================================

// OAuth state for pending authentications
let pendingOAuthState: {
  provider: string
  state: string
  redirectTo?: string
  onComplete?: (session: Session | null, error: Error | null) => void
} | null = null

// ============================================================================
// MOCK SUPABASE CLIENT
// ============================================================================

class MockSupabaseClient {
  auth: MockSupabaseAuth
  storage: MockStorage
  realtime: MockRealtime

  constructor() {
    this.auth = new MockSupabaseAuth()
    this.storage = new MockStorage()
    this.realtime = new MockRealtime()

    // Initialize storage on client creation
    initializeStorage().then(() => {
      if (__DEV__) {
        console.log("🔐 [MockSupabase] Initialized mock Supabase client")
        console.log("📁 [MockSupabase] Storage mock enabled")
        console.log("📡 [MockSupabase] Realtime mock enabled")
        if (currentSession) {
          console.log(`🔐 [MockSupabase] Active session found for: ${currentSession.user.email}`)
        }
      }
    })
  }

  from(table: string) {
    return new MockDatabaseTable(table)
  }

  channel(name: string): MockRealtimeChannel {
    return this.realtime.channel(name)
  }

  async rpc(fn: string, params?: Record<string, any>): Promise<DatabaseResponse> {
    await delay(300)

    if (__DEV__) {
      console.log(`💾 [MockSupabase] RPC call: ${fn}`, params)
    }

    // Allow custom RPC handlers
    const handler = mockRpcHandlers.get(fn)
    if (handler) {
      return handler(params)
    }

    return {
      data: null,
      error: new Error(`RPC function '${fn}' not implemented in mock`),
    }
  }
}

// Custom RPC handlers registry
const mockRpcHandlers: Map<string, (params?: Record<string, any>) => Promise<DatabaseResponse>> =
  new Map()

export function createMockSupabaseClient() {
  return new MockSupabaseClient()
}

// Error simulation state
let simulatedErrors: {
  auth?: { signIn?: Error; signUp?: Error; signOut?: Error }
  database?: { [table: string]: { select?: Error; insert?: Error; update?: Error; delete?: Error } }
} = {}

// Helper methods for testing
export const mockSupabaseHelpers = {
  /**
   * Clear all mock data (including persisted storage)
   */
  async clearAll() {
    mockUsers.clear()
    mockDatabase.clear()
    mockFileStorage.clear()
    realtimeSubscriptions.clear()
    mockRpcHandlers.clear()
    currentSession = null
    authStateListeners = []
    simulatedErrors = {}
    pendingOAuthState = null

    // Clear persisted storage
    await removeFromStorage(STORAGE_KEYS.SESSION)
    await removeFromStorage(STORAGE_KEYS.USERS)
    await removeFromStorage(STORAGE_KEYS.DATABASE)

    if (__DEV__) {
      console.log("🔐 [MockSupabase] Cleared all data and storage")
    }
  },

  /**
   * Get all users
   */
  getUsers() {
    return Array.from(mockUsers.values())
  },

  /**
   * Get table data
   */
  getTableData(tableName: string) {
    const table = mockDatabase.get(tableName)
    return table ? Array.from(table.values()) : []
  },

  /**
   * Seed table with data (persists to storage)
   */
  async seedTable(tableName: string, data: any[]) {
    const table = new Map()
    data.forEach((item) => {
      const id = item.id || `mock-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      table.set(id, { ...item, id })
    })
    mockDatabase.set(tableName, table)
    await persistDatabase()
  },

  /**
   * Get current session
   */
  getCurrentSession() {
    return currentSession
  },

  /**
   * Delete a user and purge their data from mock storage
   */
  async deleteUser(userId: string) {
    let removedUser = false

    // Remove from user store
    mockUsers.forEach((value, key) => {
      if (value.user.id === userId) {
        mockUsers.delete(key)
        removedUser = true
      }
    })

    if (removedUser) {
      await persistUsers()
    }

    // Remove database records that belong to the user
    let databaseChanged = false
    mockDatabase.forEach((table) => {
      let tableChanged = false
      table.forEach((row, key) => {
        if (row.id === userId || row.user_id === userId) {
          table.delete(key)
          tableChanged = true
        }
      })
      if (tableChanged) {
        databaseChanged = true
      }
    })

    if (databaseChanged) {
      await persistDatabase()
    }

    // Remove related files (best effort - matches by user id in metadata/path)
    Array.from(mockFileStorage.entries()).forEach(([key, file]) => {
      if (
        file.user_id === userId ||
        (typeof file.path === "string" && file.path.includes(userId))
      ) {
        mockFileStorage.delete(key)
      }
    })

    // Clear active session if it belongs to the deleted user
    if (currentSession?.user.id === userId) {
      currentSession = null
      await removeFromStorage(STORAGE_KEYS.SESSION)
      notifyAuthStateChange("SIGNED_OUT", null)
    }

    return removedUser
  },

  /**
   * Simulate errors for testing error handling
   * @example
   * mockSupabaseHelpers.simulateError('auth', 'signIn', new Error('Network error'))
   * mockSupabaseHelpers.simulateError('database', 'posts.select', new Error('Table not found'))
   */
  simulateError(type: "auth" | "database", operation: string, error: Error | null) {
    if (type === "auth") {
      simulatedErrors.auth = simulatedErrors.auth || {}
      if (error) {
        ;(simulatedErrors.auth as any)[operation] = error
      } else {
        delete (simulatedErrors.auth as any)[operation]
      }
    } else if (type === "database") {
      const [table, op] = operation.split(".")
      simulatedErrors.database = simulatedErrors.database || {}
      simulatedErrors.database[table] = simulatedErrors.database[table] || {}
      if (error) {
        ;(simulatedErrors.database[table] as any)[op] = error
      } else {
        delete (simulatedErrors.database[table] as any)[op]
      }
    }

    if (__DEV__) {
      console.log(
        `🔐 [MockSupabase] ${error ? "Set" : "Cleared"} simulated error for ${type}.${operation}`,
      )
    }
  },

  /**
   * Clear all simulated errors
   */
  clearSimulatedErrors() {
    simulatedErrors = {}
    if (__DEV__) {
      console.log("🔐 [MockSupabase] Cleared all simulated errors")
    }
  },

  /**
   * Get simulated error for an operation (internal use)
   */
  getSimulatedError(type: "auth" | "database", operation: string): Error | null {
    if (type === "auth") {
      return (simulatedErrors.auth as any)?.[operation] || null
    } else {
      const [table, op] = operation.split(".")
      return (
        simulatedErrors.database?.[table]?.[
          op as keyof (typeof simulatedErrors.database)[string]
        ] || null
      )
    }
  },

  // ============================================================================
  // STORAGE HELPERS
  // ============================================================================

  /**
   * Get all files in mock storage
   */
  getStorageFiles() {
    return Array.from(mockFileStorage.values())
  },

  /**
   * Get files in a specific bucket
   */
  getBucketFiles(bucket: string) {
    return Array.from(mockFileStorage.values()).filter((f) => f.bucket === bucket)
  },

  /**
   * Clear all files in storage
   */
  clearStorage() {
    mockFileStorage.clear()
    if (__DEV__) {
      console.log("📁 [MockSupabase] Cleared all storage files")
    }
  },

  /**
   * Seed storage with files (for testing)
   */
  seedStorage(files: Array<{ bucket: string; path: string; data: string; mimeType?: string }>) {
    files.forEach((file) => {
      const fullPath = `${file.bucket}/${file.path}`
      mockFileStorage.set(fullPath, {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.path.split("/").pop() || "file",
        bucket: file.bucket,
        path: file.path,
        size: file.data.length,
        mimeType: file.mimeType || "application/octet-stream",
        data: file.data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    })
    if (__DEV__) {
      console.log(`📁 [MockSupabase] Seeded ${files.length} files`)
    }
  },

  // ============================================================================
  // REALTIME HELPERS
  // ============================================================================

  /**
   * Trigger a realtime event (simulates database change notification)
   * @example
   * mockSupabaseHelpers.triggerRealtimeEvent('posts', 'INSERT', { id: 1, title: 'New Post' })
   */
  triggerRealtimeEvent(
    table: string,
    eventType: "INSERT" | "UPDATE" | "DELETE",
    newData: any,
    oldData: any = null,
  ) {
    triggerRealtimeEvent(table, eventType, newData, oldData)
    if (__DEV__) {
      console.log(`📡 [MockSupabase] Triggered realtime event: ${table}.${eventType}`)
    }
  },

  /**
   * Get all active realtime subscriptions
   */
  getRealtimeSubscriptions() {
    const subs: Array<{ channel: string; table: string; event: string }> = []
    realtimeSubscriptions.forEach((subscriptions, channel) => {
      subscriptions.forEach((sub) => {
        subs.push({ channel, table: sub.table, event: sub.event })
      })
    })
    return subs
  },

  /**
   * Clear all realtime subscriptions
   */
  clearRealtimeSubscriptions() {
    realtimeSubscriptions.clear()
    if (__DEV__) {
      console.log("📡 [MockSupabase] Cleared all realtime subscriptions")
    }
  },

  // ============================================================================
  // RPC HELPERS
  // ============================================================================

  /**
   * Register a custom RPC handler for testing
   * @example
   * mockSupabaseHelpers.registerRpcHandler('get_user_stats', async (params) => ({
   *   data: { posts: 10, followers: 100 },
   *   error: null
   * }))
   */
  registerRpcHandler(
    functionName: string,
    handler: (params?: Record<string, any>) => Promise<DatabaseResponse>,
  ) {
    mockRpcHandlers.set(functionName, handler)
    if (__DEV__) {
      console.log(`💾 [MockSupabase] Registered RPC handler: ${functionName}`)
    }
  },

  /**
   * Unregister an RPC handler
   */
  unregisterRpcHandler(functionName: string) {
    mockRpcHandlers.delete(functionName)
    if (__DEV__) {
      console.log(`💾 [MockSupabase] Unregistered RPC handler: ${functionName}`)
    }
  },

  /**
   * Clear all RPC handlers
   */
  clearRpcHandlers() {
    mockRpcHandlers.clear()
    if (__DEV__) {
      console.log("💾 [MockSupabase] Cleared all RPC handlers")
    }
  },

  // ============================================================================
  // OAUTH HELPERS
  // ============================================================================

  /**
   * Check if there's a pending OAuth flow
   */
  hasPendingOAuth() {
    return pendingOAuthState !== null
  },

  /**
   * Get pending OAuth state (for debugging)
   */
  getPendingOAuthState() {
    return pendingOAuthState
  },

  /**
   * Cancel pending OAuth flow
   */
  cancelPendingOAuth() {
    pendingOAuthState = null
    if (__DEV__) {
      console.log("🔐 [MockSupabase] Cancelled pending OAuth flow")
    }
  },
}

export { MockSupabaseClient, MockSupabaseAuth }
