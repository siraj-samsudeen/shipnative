/**
 * Auth Store
 *
 * Manages authentication state using Zustand with MMKV persistence.
 * Works with both real Supabase and mock Supabase (when API keys are missing).
 *
 * Type Compatibility:
 * - Uses custom Session/User types that are compatible with both mock and real Supabase
 * - The mock Supabase implements the same interface as the real one
 * - At runtime, both return the same shape of data
 */
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

import {
  resendConfirmationEmailAction,
  resetPasswordAction,
  signInAction,
  signOutAction,
  signUpAction,
  verifyEmailAction,
} from "./authActions"
import {
  AUTH_STORAGE_KEY,
  GUEST_USER_KEY,
  getUserKey,
  mmkvStorage,
  sanitizePersistedAuthState,
} from "./authConstants"
import { syncOnboardingStatus, syncOnboardingToDatabase, updateUserState } from "./authHelpers"
import type { AuthState } from "./authTypes"
import { supabase, isUsingMockSupabase } from "../../services/supabase"
import { isEmailConfirmed } from "../../types/auth"
import { logger } from "../../utils/Logger"

// Track auth state change subscription to prevent duplicate listeners
let authStateSubscription: { unsubscribe: () => void } | null = null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      loading: true,
      isAuthenticated: false,
      isEmailConfirmed: false,
      hasCompletedOnboarding: false,
      onboardingStatusByUserId: { [GUEST_USER_KEY]: true },

      setSession: (session) => {
        const user = session?.user ?? null
        const stateUpdate = updateUserState(user, session)
        set({
          ...stateUpdate,
          session,
        })
      },

      setUser: (user) => {
        const stateUpdate = updateUserState(user, get().session)
        set({
          ...stateUpdate,
          user,
        })
      },

      setLoading: (loading) => {
        set({ loading })
      },

      setHasCompletedOnboarding: async (completed) => {
        const { user } = get()
        const userKey = getUserKey(user)
        set((state) => ({
          hasCompletedOnboarding: completed,
          onboardingStatusByUserId: {
            ...state.onboardingStatusByUserId,
            [userKey]: completed,
          },
        }))
        if (user && !isUsingMockSupabase) {
          // Only sync to database if using real Supabase
          await syncOnboardingToDatabase(user.id, completed)
        }
      },

      signIn: async (email, password) => {
        return signInAction(email, password, set)
      },

      signUp: async (email, password) => {
        return signUpAction(email, password, set)
      },

      resendConfirmationEmail: async (email) => {
        return resendConfirmationEmailAction(email)
      },

      verifyEmail: async (code) => {
        return verifyEmailAction(code, set)
      },

      signOut: async () => {
        return signOutAction(get, set, GUEST_USER_KEY)
      },

      resetPassword: async (email) => {
        return resetPasswordAction(email)
      },

      /**
       * Initialize authentication state.
       *
       * This method:
       * 1. Retrieves the current session from Supabase
       * 2. Syncs onboarding status between local storage and database
       * 3. Sets up auth state change listeners
       * 4. Updates store with current user and session state
       *
       * Should be called once on app startup.
       */
      initialize: async () => {
        try {
          set({ loading: true })

          const onboardingStatusByUserId = get().onboardingStatusByUserId

          // Get initial session
          const {
            data: { session },
          } = await supabase.auth.getSession()

          // If no session, try to get user anyway (user might exist but email not confirmed)
          let user = session?.user ?? null
          if (!user) {
            try {
              const {
                data: { user: fetchedUser },
              } = await supabase.auth.getUser()
              user = fetchedUser ?? null
            } catch {
              // If getUser fails, preserve existing user from store (might be in email verification state)
              const existingUser = get().user
              if (existingUser) {
                user = existingUser
              }
            }
          }

          const userKey = getUserKey(user)
          const localOnboardingCompleted = onboardingStatusByUserId[userKey] ?? false

          let hasCompletedOnboarding = localOnboardingCompleted
          if (user && !isUsingMockSupabase) {
            // Only query database if using real Supabase
            // Mock Supabase doesn't need this as onboarding state is handled locally
            const syncedStatus = await syncOnboardingStatus(user.id, localOnboardingCompleted)
            hasCompletedOnboarding = syncedStatus
          }

          // Check email confirmation status
          const emailConfirmed = isEmailConfirmed(user)
          // Only authenticate if session exists AND email is confirmed
          const shouldAuthenticate = !!session && emailConfirmed

          const stateUpdate = updateUserState(user, session)
          set({
            ...stateUpdate,
            session,
            isAuthenticated: shouldAuthenticate,
            hasCompletedOnboarding,
            onboardingStatusByUserId: {
              ...onboardingStatusByUserId,
              [userKey]: hasCompletedOnboarding,
            },
            loading: false,
          })

          // Listen for auth changes - only set up once
          if (!authStateSubscription) {
            const {
              data: { subscription },
            } = supabase.auth.onAuthStateChange(async (event, session) => {
              // Refresh user data to get latest email confirmation status
              // This is important when email is confirmed from another device/browser
              if (
                session?.user &&
                (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED")
              ) {
                try {
                  // Refresh user data to get latest email_confirmed_at
                  const {
                    data: { user: refreshedUser },
                  } = await supabase.auth.getUser()
                  if (refreshedUser) {
                    session.user = refreshedUser
                  }
                } catch (error) {
                  // If refresh fails, continue with existing user data
                  logger.error("Failed to refresh user data", {}, error as Error)
                }
              }

              // If no session, try to get user anyway (user might exist but email not confirmed)
              let user = session?.user ?? null
              if (!user) {
                try {
                  const {
                    data: { user: fetchedUser },
                  } = await supabase.auth.getUser()
                  user = fetchedUser ?? null
                } catch {
                  // If getUser fails, preserve existing user from store (might be in email verification state)
                  const existingUser = get().user
                  if (existingUser) {
                    user = existingUser
                  }
                }
              }

              // Preserve local onboarding state - don't reset it
              const onboardingStatusByUserId = get().onboardingStatusByUserId
              const userKey = getUserKey(user)
              const currentLocalOnboarding = onboardingStatusByUserId[userKey] ?? false
              let hasCompletedOnboarding = currentLocalOnboarding

              if (user && !isUsingMockSupabase) {
                // Only query database if using real Supabase
                const syncedStatus = await syncOnboardingStatus(user.id, currentLocalOnboarding)
                hasCompletedOnboarding = syncedStatus
              }

              // Check email confirmation status
              const emailConfirmed = isEmailConfirmed(user)
              // Only authenticate if session exists AND email is confirmed
              const shouldAuthenticate = !!session && emailConfirmed

              const stateUpdate = updateUserState(user, session)
              set({
                ...stateUpdate,
                session,
                isAuthenticated: shouldAuthenticate,
                hasCompletedOnboarding,
                onboardingStatusByUserId: {
                  ...onboardingStatusByUserId,
                  [userKey]: hasCompletedOnboarding,
                },
                loading: false,
              })
            })
            authStateSubscription = subscription
          }
        } catch (error) {
          logger.error("Auth initialization failed", {}, error as Error)
          set({ loading: false })
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => mmkvStorage),
      version: 3,
      // Strip sensitive auth/session data from persisted storage
      partialize: (state) => sanitizePersistedAuthState(state) as unknown as AuthState,
      migrate: (persistedState) => {
        const sanitizedState = sanitizePersistedAuthState(persistedState as Partial<AuthState>)
        const onboardingStatusByUserId = {
          ...sanitizedState.onboardingStatusByUserId,
          [GUEST_USER_KEY]: sanitizedState.onboardingStatusByUserId[GUEST_USER_KEY] ?? true,
        }
        sanitizedState.onboardingStatusByUserId = onboardingStatusByUserId
        try {
          // Overwrite any legacy persisted tokens with the sanitized payload
          const storage = require("../../utils/storage")
          storage.save(AUTH_STORAGE_KEY, sanitizedState)
        } catch {
          // Ignore storage write errors during migration
        }
        return sanitizedState as AuthState
      },
    },
  ),
)
