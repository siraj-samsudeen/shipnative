/**
 * Auth Store Helpers
 *
 * Helper functions for authentication operations
 */

import { env } from "../../config/env"
import { supabase, isUsingMockSupabase } from "../../services/supabase"
import type { User, Session } from "../../types/auth"
import { isEmailConfirmed } from "../../types/auth"
import type { SupabaseDatabase } from "../../types/supabase"
import { extractSupabaseError } from "../../types/supabaseErrors"
import { logger } from "../../utils/Logger"

// Track if we've shown the Supabase setup message
let hasShownSupabaseSetupMessage = false

/**
 * Sync onboarding status to database
 */
export async function syncOnboardingToDatabase(userId: string, completed: boolean): Promise<void> {
  if (isUsingMockSupabase) {
    // Mock Supabase doesn't need database sync
    return
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        has_completed_onboarding: completed,
      } as SupabaseDatabase["public"]["Tables"]["profiles"]["Insert"])

    if (error) {
      const supabaseErr = extractSupabaseError(error)
      const errorDetails = supabaseErr
        ? {
            message: supabaseErr.message,
            code: supabaseErr.code,
            details: supabaseErr.details,
            hint: supabaseErr.hint,
          }
        : {
            message: (error as Error).message || String(error),
          }

      // Check if this is a "table not found" error (expected during setup)
      const isTableNotFoundError =
        supabaseErr?.code === "PGRST205" ||
        (supabaseErr?.message &&
          (supabaseErr.message.includes("Could not find the table") ||
            supabaseErr.message.includes("schema cache")))

      if (isTableNotFoundError && !hasShownSupabaseSetupMessage) {
        hasShownSupabaseSetupMessage = true
        try {
          logger.info(
            "\n🗄️  [Supabase] Database Setup Required\n" +
              "─────────────────────────────────────────────\n" +
              "The app can't find the required table `public.profiles`.\n" +
              "To enable database features, create the required tables in your Supabase project:\n" +
              "1. Go to your Supabase project dashboard\n" +
              "2. Navigate to SQL Editor\n" +
              "3. Open the `supabase-schema.sql` file from the root of this repository\n" +
              "4. Copy and paste the entire file into the SQL Editor\n" +
              "5. Click Run to execute\n" +
              "\n" +
              "If you use a custom table or schema, update the app queries to match your table name.\n" +
              "Supabase error: " +
              `${supabaseErr?.message || "table not found"}\n` +
              "\n" +
              "📚 See SUPABASE.md or docs for detailed instructions:\n" +
              "   https://docs.shipnative.app/core-features/authentication\n" +
              "\n" +
              "⚠️  These errors are EXPECTED and NORMAL when API keys are added before tables.\n" +
              "   They will disappear once you create the tables in your Supabase dashboard.\n" +
              "   You can safely ignore them if you're not using database features yet.\n" +
              "─────────────────────────────────────────────\n",
          )
        } catch {
          // Silently fail if logging causes issues
        }
        // Don't log the error itself - we've shown the helpful message
        return
      }

      const errorObj =
        error instanceof Error ? error : new Error(supabaseErr?.message || "Unknown error")
      logger.error("Failed to sync onboarding status", { userId, error: errorDetails }, errorObj)
    }
  } catch (error) {
    // Handle unexpected errors (network issues, etc.)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorDetails = error instanceof Error ? { stack: error.stack } : { error }
    logger.error(
      "Failed to sync onboarding status",
      { userId, error: errorDetails },
      error instanceof Error ? error : new Error(errorMessage),
    )
  }
}

/**
 * Fetch onboarding status from database
 */
export async function fetchOnboardingFromDatabase(userId: string): Promise<boolean | null> {
  if (isUsingMockSupabase) {
    // Mock Supabase doesn't need database query
    return null
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("has_completed_onboarding")
      .eq("id", userId)
      .single()

    if (profileError) {
      // Check if this is a "table not found" error (expected during setup)
      const supabaseErr = extractSupabaseError(profileError)
      const isTableNotFoundError =
        supabaseErr?.code === "PGRST205" ||
        (supabaseErr?.message &&
          (supabaseErr.message.includes("Could not find the table") ||
            supabaseErr.message.includes("schema cache")))

      if (isTableNotFoundError && !hasShownSupabaseSetupMessage) {
        hasShownSupabaseSetupMessage = true
        try {
          logger.info(
            "\n🗄️  [Supabase] Database Setup Required\n" +
              "─────────────────────────────────────────────\n" +
              "The app can't find the required table `public.profiles`.\n" +
              "To enable database features, create the required tables in your Supabase project:\n" +
              "1. Go to your Supabase project dashboard\n" +
              "2. Navigate to SQL Editor\n" +
              "3. Open the `supabase-schema.sql` file from the root of this repository\n" +
              "4. Copy and paste the entire file into the SQL Editor\n" +
              "5. Click Run to execute\n" +
              "\n" +
              "If you use a custom table or schema, update the app queries to match your table name.\n" +
              "Supabase error: " +
              `${supabaseErr?.message || "table not found"}\n` +
              "\n" +
              "📚 See SUPABASE.md or docs for detailed instructions:\n" +
              "   https://docs.shipnative.app/core-features/authentication\n" +
              "\n" +
              "⚠️  These errors are EXPECTED and NORMAL when API keys are added before tables.\n" +
              "   They will disappear once you create the tables in your Supabase dashboard.\n" +
              "   You can safely ignore them if you're not using database features yet.\n" +
              "─────────────────────────────────────────────\n",
          )
        } catch {
          // Silently fail if logging causes issues
        }
      }
      return null
    }

    const profileData = profile as { has_completed_onboarding?: boolean } | null
    return profileData?.has_completed_onboarding ?? null
  } catch (error) {
    // Network error or database unavailable
    logger.error("Failed to fetch profile from database", { userId }, error as Error)
    return null
  }
}

/**
 * Syncs onboarding status between local storage and database.
 *
 * If database has completed status, uses that. Otherwise, if local has completed status,
 * syncs it to the database. Returns the final resolved status.
 *
 * @param {string} userId - The user ID to sync onboarding status for
 * @param {boolean} localStatus - The local onboarding completion status
 * @returns {Promise<boolean>} The resolved onboarding status (true if completed)
 * @example
 * const status = await syncOnboardingStatus(userId, true)
 */
export async function syncOnboardingStatus(userId: string, localStatus: boolean): Promise<boolean> {
  const dbStatus = await fetchOnboardingFromDatabase(userId)

  if (dbStatus === true) {
    // Database says completed - use that
    return true
  } else if (localStatus) {
    // Local says completed but database doesn't - sync to database
    await syncOnboardingToDatabase(userId, true)
    return true
  }

  return localStatus
}

/**
 * Updates user state with email confirmation check.
 *
 * Determines if user is authenticated based on session existence and email confirmation status.
 *
 * @param {User | null} user - The user object, or null if not authenticated
 * @param {Session | null} session - The session object, or null if not authenticated
 * @returns {Object} An object containing user, session, isEmailConfirmed, and isAuthenticated flags
 * @example
 * const state = updateUserState(user, session)
 */
export function updateUserState(user: User | null, session: Session | null) {
  const emailConfirmed = isEmailConfirmed(user)
  return {
    user,
    session,
    isEmailConfirmed: emailConfirmed,
    isAuthenticated: !!session && emailConfirmed,
  }
}

/**
 * Gets the email redirect URL for email confirmation links.
 *
 * Checks for custom redirect URL in environment variables first, then falls back to
 * current origin for web, or undefined for mobile (uses Supabase default).
 *
 * @returns {string | undefined} The redirect URL, or undefined for mobile
 * @example
 * const redirectUrl = getEmailRedirectUrl()
 */
export function getEmailRedirectUrl(): string | undefined {
  // Check if custom redirect URL is configured
  const customRedirectUrl = env.emailRedirectUrl

  if (customRedirectUrl) {
    return customRedirectUrl
  }

  // For web, use current origin if available
  if (typeof window !== "undefined" && window.location) {
    return `${window.location.origin}/auth/confirm-email`
  }

  // For mobile, don't set redirect URL - Supabase shows its built-in success page
  return undefined
}

/**
 * Gets the redirect URL for password reset links.
 */
export function getPasswordResetRedirectUrl(): string | undefined {
  if (env.passwordResetRedirectUrl) {
    return env.passwordResetRedirectUrl
  }

  if (typeof window !== "undefined" && window.location) {
    return `${window.location.origin}/reset-password`
  }

  return undefined
}
