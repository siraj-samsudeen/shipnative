/**
 * Preferences Sync Service
 *
 * Handles syncing user preferences (theme, notifications) between
 * local storage and the Supabase profiles table.
 *
 * Uses fire-and-forget pattern for updates to avoid blocking UI.
 */

import { UnistylesRuntime } from "react-native-unistyles"

import { supabase, isUsingMockSupabase } from "./supabase"
import { useNotificationStore } from "../stores/notificationStore"
import type { SupabaseDatabase, UserPreferences } from "../types/supabase"
import { logger } from "../utils/Logger"
import { storage } from "../utils/storage"

type _ProfilesUpdate = SupabaseDatabase["public"]["Tables"]["profiles"]["Update"]

// Storage keys (must match the keys used in theme context and notification store)
const THEME_STORAGE_KEY = "shipnative.themeScheme"

/**
 * Fetch user preferences from the database
 * Returns null if using mock Supabase or if fetch fails
 */
export async function fetchUserPreferences(userId: string): Promise<UserPreferences | null> {
  if (isUsingMockSupabase) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "dark_mode_enabled, notifications_enabled, push_notifications_enabled, email_notifications_enabled",
      )
      .eq("id", userId)
      .single()

    if (error) {
      // Table might not exist or user has no profile yet - that's okay
      logger.debug("Failed to fetch user preferences", { error: error.message })
      return null
    }

    return data as UserPreferences
  } catch (error) {
    logger.debug("Error fetching user preferences", { error })
    return null
  }
}

/**
 * Update a single preference in the database (fire-and-forget)
 * Does not block - updates happen in background
 */
export function updatePreference(
  userId: string,
  preference: keyof UserPreferences,
  value: boolean,
): void {
  if (isUsingMockSupabase) {
    return
  }

  const update = {
    id: userId,
    [preference]: value,
    updated_at: new Date().toISOString(),
  } as const

  // Fire and forget - don't await
  Promise.resolve(supabase.from("profiles").upsert(update))
    .then(({ error }) => {
      if (error) {
        logger.debug(`Failed to sync ${preference} preference`, { error: error.message })
      } else {
        logger.debug(`Synced ${preference} preference to database`, { value })
      }
    })
    .catch((err: unknown) => {
      logger.debug(`Error syncing ${preference} preference`, { error: err })
    })
}

/**
 * Update dark mode preference
 */
export function syncDarkModePreference(userId: string, enabled: boolean): void {
  updatePreference(userId, "dark_mode_enabled", enabled)
}

/**
 * Update push notifications preference
 */
export function syncPushNotificationsPreference(userId: string, enabled: boolean): void {
  updatePreference(userId, "push_notifications_enabled", enabled)
}

/**
 * Update general notifications preference
 */
export function syncNotificationsPreference(userId: string, enabled: boolean): void {
  updatePreference(userId, "notifications_enabled", enabled)
}

/**
 * Update email notifications preference
 */
export function syncEmailNotificationsPreference(userId: string, enabled: boolean): void {
  updatePreference(userId, "email_notifications_enabled", enabled)
}

/**
 * Sync all preferences at once (fire-and-forget)
 */
export function syncAllPreferences(userId: string, preferences: Partial<UserPreferences>): void {
  if (isUsingMockSupabase) {
    return
  }

  const update = {
    id: userId,
    ...preferences,
    updated_at: new Date().toISOString(),
  }

  Promise.resolve(supabase.from("profiles").upsert({ ...update, id: userId }))
    .then(({ error }) => {
      if (error) {
        logger.debug("Failed to sync preferences", { error: error.message })
      } else {
        logger.debug("Synced all preferences to database")
      }
    })
    .catch((err: unknown) => {
      logger.debug("Error syncing preferences", { error: err })
    })
}

/**
 * Apply fetched preferences to local storage and stores
 * Call this after successful login to sync server preferences to local state
 */
export function applyUserPreferences(preferences: UserPreferences): void {
  // Apply dark mode preference
  if (preferences.dark_mode_enabled !== null) {
    const themeValue = preferences.dark_mode_enabled ? "dark" : "light"
    storage.set(THEME_STORAGE_KEY, themeValue)
    // Update Unistyles runtime
    UnistylesRuntime.setAdaptiveThemes(false)
    UnistylesRuntime.setTheme(themeValue)
    logger.debug("Applied dark mode preference from database", {
      value: preferences.dark_mode_enabled,
    })
  }

  // Apply push notifications preference
  if (preferences.push_notifications_enabled !== null) {
    // Get the notification store state and update it
    const notificationState = useNotificationStore.getState()
    if (notificationState.isPushEnabled !== preferences.push_notifications_enabled) {
      useNotificationStore.setState({ isPushEnabled: preferences.push_notifications_enabled })
      logger.debug("Applied push notification preference from database", {
        value: preferences.push_notifications_enabled,
      })
    }
  }
}

/**
 * Fetch and apply user preferences on login
 * Returns true if preferences were successfully fetched and applied
 */
export async function fetchAndApplyUserPreferences(userId: string): Promise<boolean> {
  const preferences = await fetchUserPreferences(userId)

  if (preferences) {
    applyUserPreferences(preferences)
    return true
  }

  return false
}
