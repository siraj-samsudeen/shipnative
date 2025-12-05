/**
 * Auth Store Actions
 *
 * Action methods for authentication operations
 */

import { Platform } from "react-native"

import { getEmailRedirectUrl, updateUserState } from "./authHelpers"
import type { AuthState } from "./authTypes"
import { TIMING } from "../../config/constants"
import { supabase, isUsingMockSupabase } from "../../services/supabase"
import { isEmailConfirmed } from "../../types/auth"
import { extractSupabaseError } from "../../types/supabaseErrors"
import { logger } from "../../utils/Logger"
import {
  authRateLimiter,
  passwordResetRateLimiter,
  signUpRateLimiter,
} from "../../utils/rateLimiter"

type SetState = (partial: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>)) => void
type GetState = () => AuthState

/**
 * Sign in action
 */
export async function signInAction(
  email: string,
  password: string,
  set: SetState,
): Promise<{ error?: Error }> {
  try {
    // Rate limiting check - only count actual API calls, not button clicks
    const isAllowed = await authRateLimiter.isAllowed(`signin:${email.toLowerCase()}`)
    if (!isAllowed) {
      const resetTime = await authRateLimiter.getResetTime(`signin:${email.toLowerCase()}`)
      const minutesRemaining = Math.ceil(resetTime / TIMING.MINUTE_MS)
      return {
        error: new Error(
          `Too many sign-in attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
        ),
      }
    }

    // Make the actual API call - this is what we're rate limiting
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Note: Rate limit is incremented in isAllowed() above, which happens before the API call
    // This is intentional for security - we want to prevent excessive API calls

    if (error) {
      // Check if error is due to unconfirmed email
      const isEmailNotConfirmedError =
        error.message.toLowerCase().includes("email not confirmed") ||
        error.message.toLowerCase().includes("email_not_confirmed") ||
        error.message.toLowerCase().includes("not confirmed")

      if (isEmailNotConfirmedError && data?.user) {
        // User exists but email not confirmed - set user state but don't authenticate
        set({
          session: null,
          user: data.user,
          isAuthenticated: false,
          isEmailConfirmed: false,
          loading: false,
        })
        // Return error so UI can handle it (navigate to EmailVerification)
        return { error }
      }

      return { error }
    }

    // Reset rate limit on successful login
    await authRateLimiter.reset(`signin:${email.toLowerCase()}`)

    const stateUpdate = updateUserState(data.user, data.session)
    set({
      ...stateUpdate,
      loading: false,
    })

    return {}
  } catch (error) {
    return { error: error as Error }
  }
}

/**
 * Sign up action
 */
export async function signUpAction(
  email: string,
  password: string,
  set: SetState,
): Promise<{ error?: Error }> {
  try {
    // Check if using real Supabase and validate configuration
    if (!isUsingMockSupabase) {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ""
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""

      if (!supabaseUrl || !supabaseKey) {
        logger.warn("Supabase credentials missing but not using mock - this shouldn't happen")
      } else if (__DEV__) {
        // Log configuration for debugging (truncated for security)
        logger.debug("Supabase configuration check", {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          urlPrefix: supabaseUrl.substring(0, 30) + "...",
          keyPrefix: supabaseKey.substring(0, 10) + "...",
        })
      }
    }

    // Rate limiting check (skip in mock mode for easier development/testing)
    if (!isUsingMockSupabase) {
      const isAllowed = await signUpRateLimiter.isAllowed(`signup:${email.toLowerCase()}`)
      if (!isAllowed) {
        const resetTime = await signUpRateLimiter.getResetTime(`signup:${email.toLowerCase()}`)
        const minutesRemaining = Math.ceil(resetTime / TIMING.MINUTE_MS)
        return {
          error: new Error(
            `Too many sign-up attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
          ),
        }
      }
    }

    // Generate proper redirect URL for email confirmation
    const emailRedirectTo = Platform.OS === "web" ? getEmailRedirectUrl() : undefined

    // Build signUp parameters - pass options only if emailRedirectTo is set
    const signUpParams: Parameters<typeof supabase.auth.signUp>[0] = {
      email,
      password,
    }

    if (emailRedirectTo) {
      signUpParams.options = { emailRedirectTo }
    }

    let data, error
    try {
      const result = await supabase.auth.signUp(signUpParams)
      data = result.data
      error = result.error

      // Log for debugging - include FULL error details
      if (__DEV__) {
        if (error) {
          const supabaseError = extractSupabaseError(error)
          logger.debug("SignUp error from Supabase", {
            errorMessage: error.message,
            errorStatus: supabaseError?.status,
            errorName: supabaseError?.name,
            fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
            isUsingMock: isUsingMockSupabase,
            hasEmailRedirectTo: !!emailRedirectTo,
            platform: Platform.OS,
            supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
          })
        } else {
          logger.debug("SignUp success", {
            hasUser: !!data?.user,
            hasSession: !!data?.session,
            isUsingMock: isUsingMockSupabase,
            hasEmailRedirectTo: !!emailRedirectTo,
          })
        }
      }
    } catch (signUpError) {
      // Handle network errors or other exceptions - log FULL error details
      const errorMessage = signUpError instanceof Error ? signUpError.message : String(signUpError)
      const errorStack = signUpError instanceof Error ? signUpError.stack : undefined
      const errorCause =
        signUpError instanceof Error && "cause" in signUpError
          ? (signUpError as Error & { cause?: unknown }).cause
          : undefined

      logger.error(
        "SignUp failed with exception - FULL ERROR DETAILS",
        {
          errorMessage,
          errorStack,
          errorCause: errorCause ? String(errorCause) : undefined,
          errorType: signUpError?.constructor?.name,
          fullError:
            signUpError instanceof Error
              ? JSON.stringify(signUpError, Object.getOwnPropertyNames(signUpError))
              : String(signUpError),
          isUsingMock: isUsingMockSupabase,
          platform: Platform.OS,
          hasEmailRedirectTo: !!emailRedirectTo,
          supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
        },
        signUpError as Error,
      )

      // In development, return the original error so user can see real details
      if (__DEV__) {
        return { error: signUpError as Error }
      }

      // In production, return user-friendly error message
      if (
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("fetch") ||
        errorMessage.includes("Failed to fetch")
      ) {
        return {
          error: new Error("Network error. Please check your internet connection and try again."),
        }
      }

      return { error: signUpError as Error }
    }

    if (error) {
      // Log FULL error details from Supabase response
      const errorMessage = error.message || String(error)
      const supabaseError = extractSupabaseError(error)
      const errorStatus = supabaseError?.status
      const errorName = supabaseError?.name

      if (
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("fetch") ||
        errorMessage.includes("Failed to fetch")
      ) {
        logger.error("SignUp network error from Supabase response - FULL ERROR DETAILS", {
          errorMessage,
          errorStatus,
          errorName,
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
          isUsingMock: isUsingMockSupabase,
          platform: Platform.OS,
          supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
        })

        // In development, return the original error so user can see real details
        if (__DEV__) {
          return { error }
        }

        // In production, return user-friendly error message
        return {
          error: new Error("Network error. Please check your internet connection and try again."),
        }
      }
      return { error }
    }

    // Reset rate limit on successful signup (only if rate limiting was applied)
    if (!isUsingMockSupabase) {
      await signUpRateLimiter.reset(`signup:${email.toLowerCase()}`)
    }

    // Check if email is confirmed (may be null if email confirmation is required)
    const emailConfirmed = isEmailConfirmed(data.user)
    // Only authenticate if session exists AND email is confirmed
    // If email confirmation is required, session may be null
    const shouldAuthenticate = !!data.session && emailConfirmed

    const stateUpdate = updateUserState(data.user, data.session)
    set({
      ...stateUpdate,
      isAuthenticated: shouldAuthenticate,
      loading: false,
    })

    return {}
  } catch (error) {
    return { error: error as Error }
  }
}

/**
 * Resend confirmation email action
 */
export async function resendConfirmationEmailAction(email: string): Promise<{ error?: Error }> {
  try {
    // Validate email
    if (!email || !email.trim()) {
      return { error: new Error("Email is required") }
    }

    const trimmedEmail = email.trim()

    // Generate proper redirect URL for email confirmation
    const emailRedirectTo = Platform.OS === "web" ? getEmailRedirectUrl() : undefined

    // Build the resend options
    const resendOptions: {
      type: "signup"
      email: string
      options?: { emailRedirectTo: string }
    } = {
      type: "signup",
      email: trimmedEmail,
    }

    // Only add emailRedirectTo if it's defined
    if (emailRedirectTo) {
      resendOptions.options = { emailRedirectTo }
    }

    // Call Supabase resend method
    // Note: This works even if the user is authenticated but email is not confirmed
    const { data, error } = await supabase.auth.resend(resendOptions)

    // Log for debugging
    if (__DEV__) {
      if (error) {
        const supabaseError = extractSupabaseError(error)
        logger.error("Failed to resend confirmation email", {
          error: error.message || error,
          email: trimmedEmail,
          code: supabaseError?.code,
          status: supabaseError?.status,
        })
      } else {
        logger.info("Confirmation email resent successfully", { email: trimmedEmail, data })
      }
    }

    if (error) {
      // Provide more helpful error messages
      let errorMessage = error.message || "Failed to resend email. Please try again."

      // Handle specific Supabase error cases
      const supabaseError = extractSupabaseError(error)
      if (error.message?.includes("rate limit") || supabaseError?.code === "rate_limit_exceeded") {
        errorMessage = "Too many requests. Please wait a moment before trying again."
      } else if (error.message?.includes("not found") || supabaseError?.code === "user_not_found") {
        errorMessage = "No account found with this email address."
      } else if (error.message?.includes("already confirmed")) {
        errorMessage = "This email has already been confirmed."
      }

      return { error: new Error(errorMessage) }
    }

    return {}
  } catch (error) {
    logger.error("Error in resendConfirmationEmail", { error, email })
    return { error: error as Error }
  }
}

/**
 * Verify email action
 */
export async function verifyEmailAction(code: string, set: SetState): Promise<{ error?: Error }> {
  try {
    // Verify email with the code from the confirmation link
    const { data, error } = await (supabase.auth.verifyOtp as any)({
      token: code,
      type: "email",
    })

    if (error) {
      return { error }
    }

    // Update auth state after email verification
    const stateUpdate = updateUserState(data.user, data.session)
    set({
      ...stateUpdate,
      loading: false,
    })

    return {}
  } catch (error) {
    return { error: error as Error }
  }
}

/**
 * Sign out action
 */
export async function signOutAction(
  get: GetState,
  set: SetState,
  guestUserKey: string,
): Promise<void> {
  await supabase.auth.signOut()
  const guestOnboarding = get().onboardingStatusByUserId[guestUserKey] ?? false
  set({
    session: null,
    user: null,
    isAuthenticated: false,
    isEmailConfirmed: false,
    hasCompletedOnboarding: guestOnboarding,
  })
}

/**
 * Reset password action
 */
export async function resetPasswordAction(email: string): Promise<{ error?: Error }> {
  try {
    // Rate limiting check
    const isAllowed = await passwordResetRateLimiter.isAllowed(`reset:${email.toLowerCase()}`)
    if (!isAllowed) {
      const resetTime = await passwordResetRateLimiter.getResetTime(`reset:${email.toLowerCase()}`)
      const minutesRemaining = Math.ceil(resetTime / TIMING.MINUTE_MS)
      return {
        error: new Error(
          `Too many password reset attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
        ),
      }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email)

    if (error) {
      return { error }
    }

    // Don't reset rate limit on success - allow server to handle email sending rate limits

    return {}
  } catch (error) {
    return { error: error as Error }
  }
}
