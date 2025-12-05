/**
 * Auth Store Selectors
 *
 * Memoized selectors for derived auth state
 */

import { useAuthStore } from "../auth"

/**
 * Check if user is authenticated
 * Note: This is a hook but uses "select" prefix for consistency with selector pattern
 */
// eslint-disable-next-line react-hooks/rules-of-hooks
export const selectIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)

/**
 * Get current user
 * Note: This is a hook but uses "select" prefix for consistency with selector pattern
 */
// eslint-disable-next-line react-hooks/rules-of-hooks
export const selectUser = () => useAuthStore((state) => state.user)

/**
 * Get user email
 * Note: This is a hook but uses "select" prefix for consistency with selector pattern
 */
// eslint-disable-next-line react-hooks/rules-of-hooks
export const selectUserEmail = () => useAuthStore((state) => state.user?.email)

/**
 * Get user ID
 * Note: This is a hook but uses "select" prefix for consistency with selector pattern
 */
// eslint-disable-next-line react-hooks/rules-of-hooks
export const selectUserId = () => useAuthStore((state) => state.user?.id)

/**
 * Check if onboarding is completed
 * Note: This is a hook but uses "select" prefix for consistency with selector pattern
 */
export const selectHasCompletedOnboarding = () =>
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useAuthStore((state) => state.hasCompletedOnboarding)

/**
 * Check if auth is loading
 * Note: This is a hook but uses "select" prefix for consistency with selector pattern
 */
// eslint-disable-next-line react-hooks/rules-of-hooks
export const selectAuthLoading = () => useAuthStore((state) => state.loading)

/**
 * Get full auth state
 * Note: This is a hook but uses "select" prefix for consistency with selector pattern
 */
export const selectAuthState = () =>
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useAuthStore((state) => ({
    user: state.user,
    session: state.session,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    hasCompletedOnboarding: state.hasCompletedOnboarding,
  }))
