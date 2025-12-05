/**
 * Mock Supabase Helpers
 *
 * Helper functions for the mock Supabase implementation:
 * - Base64 encoding/decoding utilities
 * - Storage adapter
 * - Token generation
 * - User/session creation
 * - Storage persistence
 */

import { Platform } from "react-native"
import * as SecureStore from "expo-secure-store"

import { sharedState } from "./types"
import type { User, Session, AuthChangeEvent } from "../../../types/auth"
import { logger } from "../../../utils/Logger"
import { webSecureStorage } from "../../../utils/webStorageEncryption"

// Storage keys (matching Supabase's storage keys)
export const STORAGE_KEYS = {
  SESSION: "supabase.auth.token",
  USERS: "mock.supabase.users",
  DATABASE: "mock.supabase.database",
}

// Cross-platform base64 utilities
export const base64Utils = {
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
// SECURITY: On web, uses encrypted storage for sensitive data
export const storageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        // Use encrypted storage for sensitive keys
        if (key.includes("auth") || key.includes("token") || key.includes("session")) {
          return webSecureStorage.getItem(key)
        }
        // Use regular localStorage for non-sensitive data
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
        // Use encrypted storage for sensitive keys
        if (key.includes("auth") || key.includes("token") || key.includes("session")) {
          webSecureStorage.setItem(key, value)
          return
        }
        // Use regular localStorage for non-sensitive data
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
        // Remove from encrypted storage if it was stored there
        if (key.includes("auth") || key.includes("token") || key.includes("session")) {
          webSecureStorage.removeItem(key)
          return
        }
        // Remove from regular localStorage
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

// Storage helpers
export async function loadFromStorage<T>(key: string): Promise<T | null> {
  try {
    const value = await storageAdapter.getItem(key)
    return value ? JSON.parse(value) : null
  } catch (error) {
    if (__DEV__) {
      logger.error(`[MockSupabase] Failed to load ${key}`, { key }, error as Error)
    }
    return null
  }
}

export async function saveToStorage(key: string, value: any): Promise<void> {
  try {
    await storageAdapter.setItem(key, JSON.stringify(value))
  } catch (error) {
    if (__DEV__) {
      logger.error(`[MockSupabase] Failed to save ${key}`, { key }, error as Error)
    }
  }
}

export async function removeFromStorage(key: string): Promise<void> {
  try {
    await storageAdapter.removeItem(key)
  } catch (error) {
    if (__DEV__) {
      logger.error(`[MockSupabase] Failed to remove ${key}`, { key }, error as Error)
    }
  }
}

// Load persisted data on initialization
export async function initializeStorage() {
  if (sharedState.isInitialized) return

  try {
    // Load session
    const savedSession = await loadFromStorage<Session>(STORAGE_KEYS.SESSION)
    if (savedSession) {
      // Check if session is expired
      if (savedSession.expires_at && savedSession.expires_at > Math.floor(Date.now() / 1000)) {
        // Update the exported currentSession
        sharedState.currentSession = savedSession
        if (__DEV__) {
          logger.debug(`[MockSupabase] Restored session`, { email: savedSession.user.email })
        }
      } else {
        // Session expired, remove it
        await removeFromStorage(STORAGE_KEYS.SESSION)
        if (__DEV__) {
          logger.debug(`[MockSupabase] Session expired, removed`)
        }
      }
    }

    // Load users
    const savedUsers = await loadFromStorage<
      Array<[string, { email: string; password: string; user: User }]>
    >(STORAGE_KEYS.USERS)
    if (savedUsers) {
      sharedState.mockUsers.clear()
      savedUsers.forEach(([email, data]) => sharedState.mockUsers.set(email, data))
      if (__DEV__ && sharedState.mockUsers.size > 0) {
        logger.debug(`[MockSupabase] Restored users`, { count: sharedState.mockUsers.size })
      }
    }

    // Load database
    const savedDatabase = await loadFromStorage<Record<string, Record<string, any>>>(
      STORAGE_KEYS.DATABASE,
    )
    if (savedDatabase) {
      sharedState.mockDatabase.clear()
      Object.entries(savedDatabase).forEach(([tableName, records]) => {
        const tableMap = new Map(Object.entries(records))
        sharedState.mockDatabase.set(tableName, tableMap)
      })
      if (__DEV__ && sharedState.mockDatabase.size > 0) {
        logger.debug(`[MockSupabase] Restored tables`, { count: sharedState.mockDatabase.size })
      }
    }

    sharedState.isInitialized = true
  } catch (error) {
    if (__DEV__) {
      logger.error(`[MockSupabase] Failed to initialize storage`, {}, error as Error)
    }
    sharedState.isInitialized = true // Mark as initialized even if failed
  }
}

// Save users to storage
export async function persistUsers() {
  const usersArray = Array.from(sharedState.mockUsers.entries())
  await saveToStorage(STORAGE_KEYS.USERS, usersArray)
}

// Save database to storage
export async function persistDatabase() {
  const databaseObj: Record<string, Record<string, any>> = {}
  sharedState.mockDatabase.forEach((table, tableName) => {
    databaseObj[tableName] = Object.fromEntries(table.entries())
  })
  await saveToStorage(STORAGE_KEYS.DATABASE, databaseObj)
}

// Helper to generate realistic tokens
export function generateToken(prefix: string = "mock"): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const random2 = Math.random().toString(36).substring(2, 15)
  // Format similar to JWT: base64-like string
  return `${prefix}-${timestamp}-${random}-${random2}`.substring(0, 100)
}

/**
 * Extracts a realistic first and last name from an email address.
 *
 * Attempts to parse common email patterns (e.g., "john.doe@example.com" or "jane_smith@example.com")
 * and generates appropriate names. Falls back to random common names if parsing fails.
 *
 * @param {string} email - The email address to extract names from
 * @returns {Object} An object containing first_name, last_name, and full_name
 * @example
 * extractNameFromEmail("john.doe@example.com")
 * // Returns: { first_name: "John", last_name: "Doe", full_name: "John Doe" }
 */
export function extractNameFromEmail(email: string): {
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

/**
 * Creates a mock user object with realistic metadata.
 *
 * Generates a user ID, extracts name from email, and creates avatar URL.
 * Email is not confirmed by default to simulate email confirmation flow.
 *
 * @param {string} email - The user's email address
 * @param {Record<string, any>} [metadata] - Optional metadata to merge with extracted metadata
 * @returns {User} A mock User object
 * @example
 * createMockUser("john.doe@example.com", { custom_field: "value" })
 */
export function createMockUser(email: string, metadata?: Record<string, any>): User {
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
    // Don't set email_confirmed_at by default - simulates email confirmation required
    email_confirmed_at: null,
    confirmed_at: null,
    app_metadata: {},
    user_metadata: userMetadata,
  }
}

/**
 * Creates a mock session object for a user.
 *
 * Generates JWT-like access and refresh tokens, sets expiration to 1 hour from now.
 *
 * @param {User} user - The user to create a session for
 * @returns {Session} A mock Session object with tokens and expiration
 * @example
 * const session = createMockSession(user)
 */
export function createMockSession(user: User): Session {
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

/**
 * Checks if a session is still valid (not expired).
 *
 * @param {Session | null} session - The session to validate
 * @returns {boolean} True if session exists and is not expired, false otherwise
 * @example
 * if (isSessionValid(currentSession)) {
 *   // Session is valid
 * }
 */
export function isSessionValid(session: Session | null): boolean {
  if (!session) return false
  if (!session.expires_at) return true
  return session.expires_at > Math.floor(Date.now() / 1000)
}

/**
 * Notifies all registered auth state change listeners.
 *
 * Safely calls each listener with the event and session, catching any errors
 * to prevent one listener from breaking others.
 *
 * @param {AuthChangeEvent} event - The auth state change event (e.g., "SIGNED_IN", "SIGNED_OUT")
 * @param {Session | null} session - The current session, or null if signed out
 * @example
 * notifyAuthStateChange("SIGNED_IN", session)
 */
export function notifyAuthStateChange(event: AuthChangeEvent, session: Session | null) {
  sharedState.authStateListeners.forEach((listener) => {
    try {
      listener(event, session)
    } catch (error) {
      logger.error("Error in auth state listener", {}, error as Error)
    }
  })
}

// Simulate network delay
export const delay = (ms: number = 500) => new Promise((resolve) => setTimeout(resolve, ms))

