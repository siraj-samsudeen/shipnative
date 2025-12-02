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

import { supabase } from "../services/supabase"
import type { Session, User } from "../types/auth"
import { logger } from "../utils/Logger"
import * as storage from "../utils/storage"

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  hasCompletedOnboarding: boolean
  onboardingStatusByUserId: Record<string, boolean>

  // Actions
  setSession: (session: Session | null) => void
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setHasCompletedOnboarding: (completed: boolean) => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error?: Error }>
  signUp: (email: string, password: string) => Promise<{ error?: Error }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: Error }>
  initialize: () => Promise<void>
}

const AUTH_STORAGE_KEY = "auth-storage"
export const GUEST_USER_KEY = "guest"

const getUserKey = (user?: User | null) => user?.id ?? GUEST_USER_KEY

type PersistedAuthState = Pick<AuthState, "onboardingStatusByUserId">

// Only persist non-sensitive onboarding progress; keep auth/session data in SecureStore via Supabase
const sanitizePersistedAuthState = (
  state: Partial<AuthState> | null | undefined,
): PersistedAuthState => ({
  onboardingStatusByUserId:
    typeof state === "object" && state?.onboardingStatusByUserId && !Array.isArray(state.onboardingStatusByUserId)
      ? {
          ...state.onboardingStatusByUserId,
          // Always consider guest onboarding complete so unauthenticated users skip onboarding
          [GUEST_USER_KEY]: state.onboardingStatusByUserId[GUEST_USER_KEY] ?? true,
        }
      : { [GUEST_USER_KEY]: true },
})

// Custom storage adapter for Zustand to use MMKV
const mmkvStorage = {
  getItem: async (name: string) => {
    const value = storage.load(name)
    return value ? JSON.stringify(value) : null
  },
  setItem: async (name: string, value: string) => {
    storage.save(name, JSON.parse(value))
  },
  removeItem: async (name: string) => {
    storage.remove(name)
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      loading: true,
      isAuthenticated: false,
      hasCompletedOnboarding: true,
      onboardingStatusByUserId: { [GUEST_USER_KEY]: true },

      setSession: (session) => {
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
        })
      },

      setUser: (user) => {
        set({ user })
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
        if (user) {
          try {
            const { error } = await supabase
              .from("profiles")
              .upsert({ id: user.id, has_completed_onboarding: completed })

            if (error) {
              logger.error("Failed to sync onboarding status", {}, error as Error)
            }
          } catch (error) {
            logger.error("Failed to sync onboarding status", {}, error as Error)
          }
        }
      },

      signIn: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            return { error }
          }

          set({
            session: data.session,
            user: data.user,
            isAuthenticated: true,
            loading: false,
          })

          return {}
        } catch (error) {
          return { error: error as Error }
        }
      },

      signUp: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          })

          if (error) {
            return { error }
          }

          set({
            session: data.session,
            user: data.user,
            isAuthenticated: !!data.session,
            loading: false,
          })

          return {}
        } catch (error) {
          return { error: error as Error }
        }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        const guestOnboarding = get().onboardingStatusByUserId[GUEST_USER_KEY] ?? false
        set({
          session: null,
          user: null,
          isAuthenticated: false,
          hasCompletedOnboarding: guestOnboarding,
        })
      },

      resetPassword: async (email) => {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email)

          if (error) {
            return { error }
          }

          return {}
        } catch (error) {
          return { error: error as Error }
        }
      },

      initialize: async () => {
        try {
          set({ loading: true })

          const onboardingStatusByUserId = get().onboardingStatusByUserId

          // Get initial session
          const {
            data: { session },
          } = await supabase.auth.getSession()

          const userKey = getUserKey(session?.user)
          const localOnboardingCompleted = onboardingStatusByUserId[userKey] ?? false

          let hasCompletedOnboarding = localOnboardingCompleted
          if (session?.user) {
            // Fetch profile to check onboarding status
            const { data: profile } = await supabase
              .from("profiles")
              .select("has_completed_onboarding")
              .eq("id", session.user.id)
              .single()

            if (profile?.has_completed_onboarding) {
              // Database says completed - use that
              hasCompletedOnboarding = true
            } else if (localOnboardingCompleted && session?.user) {
              // Local says completed but database doesn't - sync to database
              await supabase
                .from("profiles")
                .upsert({ id: session.user.id, has_completed_onboarding: true })
              hasCompletedOnboarding = true
            }
          }

          set({
            session,
            user: session?.user ?? null,
            isAuthenticated: !!session,
            hasCompletedOnboarding,
            onboardingStatusByUserId: {
              ...onboardingStatusByUserId,
              [userKey]: hasCompletedOnboarding,
            },
            loading: false,
          })

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (_event, session) => {
            // Preserve local onboarding state - don't reset it
            const onboardingStatusByUserId = get().onboardingStatusByUserId
            const userKey = getUserKey(session?.user)
            const currentLocalOnboarding = onboardingStatusByUserId[userKey] ?? false
            let hasCompletedOnboarding = currentLocalOnboarding

            if (session?.user) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("has_completed_onboarding")
                .eq("id", session.user.id)
                .single()

              if (profile?.has_completed_onboarding) {
                // Database says completed - use that
                hasCompletedOnboarding = true
              } else if (currentLocalOnboarding) {
                // Local says completed but database doesn't - sync to database
                await supabase
                  .from("profiles")
                  .upsert({ id: session.user.id, has_completed_onboarding: true })
                hasCompletedOnboarding = true
              }
            }

            set({
              session,
              user: session?.user ?? null,
              isAuthenticated: !!session,
              hasCompletedOnboarding,
              onboardingStatusByUserId: {
                ...onboardingStatusByUserId,
                [userKey]: hasCompletedOnboarding,
              },
              loading: false,
            })
          })
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
          storage.save(AUTH_STORAGE_KEY, sanitizedState)
        } catch {
          // Ignore storage write errors during migration
        }
        return sanitizedState as AuthState
      },
    },
  ),
)
