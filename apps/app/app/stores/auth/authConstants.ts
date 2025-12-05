/**
 * Auth Store Constants
 *
 * Constants and helper functions for the authentication store
 */

import type { AuthState, PersistedAuthState } from "./authTypes"
import type { User } from "../../types/auth"
import * as storage from "../../utils/storage"

export const AUTH_STORAGE_KEY = "auth-storage"
export const GUEST_USER_KEY = "guest"

/**
 * Get user key for onboarding status tracking
 */
export const getUserKey = (user?: User | null) => user?.id ?? GUEST_USER_KEY

/**
 * Sanitize persisted auth state to only include non-sensitive data
 * Only persist non-sensitive onboarding progress; keep auth/session data in SecureStore via Supabase
 */
export const sanitizePersistedAuthState = (
  state: Partial<AuthState> | null | undefined,
): PersistedAuthState => ({
  onboardingStatusByUserId:
    typeof state === "object" &&
    state?.onboardingStatusByUserId &&
    !Array.isArray(state.onboardingStatusByUserId)
      ? {
          ...state.onboardingStatusByUserId,
          // Always consider guest onboarding complete so unauthenticated users skip onboarding
          [GUEST_USER_KEY]: state.onboardingStatusByUserId[GUEST_USER_KEY] ?? true,
        }
      : { [GUEST_USER_KEY]: true },
})

/**
 * Custom storage adapter for Zustand to use MMKV
 */
export const mmkvStorage = {
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

