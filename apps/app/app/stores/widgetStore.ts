/**
 * Widget Store
 *
 * Manages widget-related state and preferences.
 * Handles syncing Supabase credentials to native widgets.
 */

import { Platform } from "react-native"
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

import { features } from "@/config/features"
import { getWidgetConfig } from "@/services/widgets"
import { logger } from "@/utils/Logger"
import { storage } from "@/utils/storage"

export interface WidgetState {
  // Whether widgets are enabled in the app
  isWidgetsEnabled: boolean

  // Whether user has enabled widgets in settings
  userWidgetsEnabled: boolean

  // Last sync timestamp
  lastSyncedAt: string | null

  // Sync status
  syncStatus: "idle" | "syncing" | "success" | "error"

  // Error message if any
  syncError: string | null

  // Actions
  toggleWidgets: () => Promise<void>
  syncWidgetCredentials: () => Promise<void>
  clearWidgetData: () => Promise<void>
}

/**
 * Write Supabase credentials to shared storage for native widgets
 */
async function writeWidgetCredentials(): Promise<void> {
  const config = getWidgetConfig()

  if (Platform.OS === "ios") {
    // iOS: Write to App Group UserDefaults
    // This is handled natively - we just need to ensure the data is available
    // The native widget reads from UserDefaults with the App Group identifier
    try {
      // Store in regular storage - the native side handles App Group sync
      storage.set("widget_supabase_url", config.supabaseUrl)
      storage.set("widget_supabase_key", config.supabaseKey)
      storage.set("widget_is_mock", config.isMock.toString())
      logger.info("Widget credentials written to storage (iOS)")
    } catch (error) {
      logger.error("Failed to write widget credentials (iOS)", { error })
      throw error
    }
  } else if (Platform.OS === "android") {
    // Android: Write to SharedPreferences
    // The native widget reads from SharedPreferences with the same name
    try {
      storage.set("widget_supabase_url", config.supabaseUrl)
      storage.set("widget_supabase_key", config.supabaseKey)
      storage.set("widget_is_mock", config.isMock.toString())
      logger.info("Widget credentials written to storage (Android)")
    } catch (error) {
      logger.error("Failed to write widget credentials (Android)", { error })
      throw error
    }
  }
}

/**
 * Clear widget credentials from shared storage
 */
async function clearWidgetCredentials(): Promise<void> {
  try {
    storage.delete("widget_supabase_url")
    storage.delete("widget_supabase_key")
    storage.delete("widget_is_mock")
    logger.info("Widget credentials cleared from storage")
  } catch (error) {
    logger.error("Failed to clear widget credentials", { error })
    throw error
  }
}

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set, get) => ({
      isWidgetsEnabled: features.enableWidgets,
      userWidgetsEnabled: false,
      lastSyncedAt: null,
      syncStatus: "idle",
      syncError: null,

      toggleWidgets: async () => {
        const { userWidgetsEnabled } = get()
        const newValue = !userWidgetsEnabled

        set({ syncStatus: "syncing", syncError: null })

        try {
          if (newValue) {
            // Enable widgets - sync credentials
            await writeWidgetCredentials()
            set({
              userWidgetsEnabled: true,
              lastSyncedAt: new Date().toISOString(),
              syncStatus: "success",
            })
            logger.info("Widgets enabled")
          } else {
            // Disable widgets - clear credentials
            await clearWidgetCredentials()
            set({
              userWidgetsEnabled: false,
              lastSyncedAt: null,
              syncStatus: "success",
            })
            logger.info("Widgets disabled")
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          set({
            syncStatus: "error",
            syncError: errorMessage,
          })
          logger.error("Failed to toggle widgets", { error })
        }
      },

      syncWidgetCredentials: async () => {
        const { userWidgetsEnabled } = get()

        if (!userWidgetsEnabled) {
          logger.debug("Widgets not enabled, skipping sync")
          return
        }

        set({ syncStatus: "syncing", syncError: null })

        try {
          await writeWidgetCredentials()
          set({
            lastSyncedAt: new Date().toISOString(),
            syncStatus: "success",
          })
          logger.info("Widget credentials synced")
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          set({
            syncStatus: "error",
            syncError: errorMessage,
          })
          logger.error("Failed to sync widget credentials", { error })
        }
      },

      clearWidgetData: async () => {
        set({ syncStatus: "syncing", syncError: null })

        try {
          await clearWidgetCredentials()
          set({
            userWidgetsEnabled: false,
            lastSyncedAt: null,
            syncStatus: "success",
          })
          logger.info("Widget data cleared")
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          set({
            syncStatus: "error",
            syncError: errorMessage,
          })
          logger.error("Failed to clear widget data", { error })
        }
      },
    }),
    {
      name: "widget-storage",
      storage: createJSONStorage(() => ({
        getItem: (key) => storage.getString(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      })),
      partialize: (state) => ({
        userWidgetsEnabled: state.userWidgetsEnabled,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
)
