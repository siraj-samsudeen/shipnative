import { AppState, Platform } from "react-native"
import * as SecureStore from "expo-secure-store"
import { createClient } from "@supabase/supabase-js"
import "react-native-url-polyfill/auto"

import { createMockSupabaseClient } from "./mocks/supabase"

const secureStoreOptions: SecureStore.SecureStoreOptions =
  Platform.OS === "ios"
    ? {
        keychainService: "shipnativeapp.supabase",
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }
    : { keychainService: "shipnativeapp.supabase" }

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key, secureStoreOptions)
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value, secureStoreOptions)
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key, secureStoreOptions)
  },
}

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ""
export const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""

// Use mock Supabase if credentials are missing in development
const useMock = __DEV__ && (!supabaseUrl || !supabaseKey)
export const isUsingMockSupabase = useMock

export const supabase = useMock
  ? createMockSupabaseClient()
  : createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: ExpoSecureStoreAdapter as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })

if (useMock && __DEV__) {
  // Use logger for consistency, but this is dev-only so console is acceptable
  console.warn("⚠️  Supabase credentials not found - using mock authentication")
  console.log(
    "💡 Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to apps/app/.env"
  )
}

// Only set up auto-refresh for real Supabase client
if (!useMock) {
  const realSupabase = supabase as ReturnType<typeof createClient>
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      realSupabase.auth.startAutoRefresh?.()
    } else {
      realSupabase.auth.stopAutoRefresh?.()
    }
  })
}
