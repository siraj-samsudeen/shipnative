/**
 * Mock Supabase Client
 *
 * Main export file that creates the MockSupabaseClient and exports all helpers.
 * This maintains the same public API as the original monolithic file.
 */

import { MockSupabaseAuth } from "./auth"
import { MockDatabaseTable } from "./database"
import {
  initializeStorage,
  delay,
  removeFromStorage,
  persistUsers,
  persistDatabase,
  notifyAuthStateChange,
  STORAGE_KEYS,
} from "./helpers"
import { MockRealtime, MockRealtimeChannel } from "./realtime"
import { MockStorage } from "./storage"
import { sharedState } from "./types"
import type { DatabaseResponse } from "../../../types/database"
import { logger } from "../../../utils/Logger"

/**
 * Mock Supabase Client
 *
 * Provides a comprehensive mock Supabase client for development without API keys.
 * Simulates authentication, database, storage, and realtime operations.
 */
export class MockSupabaseClient {
  auth: MockSupabaseAuth
  storage: MockStorage
  realtime: MockRealtime

  constructor() {
    this.auth = new MockSupabaseAuth()
    this.storage = new MockStorage()
    this.realtime = new MockRealtime()

    // Initialize storage on client creation
    initializeStorage().then(() => {
      if (__DEV__) {
        logger.debug(`[MockSupabase] Initialized mock Supabase client`)
        logger.debug(`[MockSupabase] Storage mock enabled`)
        logger.debug(`[MockSupabase] Realtime mock enabled`)
        if (sharedState.currentSession) {
          logger.debug(`[MockSupabase] Active session found`, {
            email: sharedState.currentSession.user.email,
          })
        }
      }
    })
  }

  from(table: string) {
    return new MockDatabaseTable(table)
  }

  channel(name: string): MockRealtimeChannel {
    return this.realtime.channel(name)
  }

  async rpc(fn: string, params?: Record<string, any>): Promise<DatabaseResponse> {
    await delay(300)

    if (__DEV__) {
      logger.debug(`[MockSupabase] RPC call`, { function: fn, params })
    }

    // Allow custom RPC handlers
    const handler = sharedState.mockRpcHandlers.get(fn)
    if (handler) {
      return handler(params)
    }

    return {
      data: null,
      error: new Error(`RPC function '${fn}' not implemented in mock`),
    }
  }
}

/**
 * Create a new MockSupabaseClient instance
 */
export function createMockSupabaseClient() {
  return new MockSupabaseClient()
}

/**
 * Helper methods for testing and development
 */
export const mockSupabaseHelpers = {
  /**
   * Clear all mock data (including persisted storage)
   */
  async clearAll() {
    sharedState.mockUsers.clear()
    sharedState.mockDatabase.clear()
    sharedState.mockFileStorage.clear()
    sharedState.realtimeSubscriptions.clear()
    sharedState.mockRpcHandlers.clear()
    sharedState.currentSession = null
    sharedState.authStateListeners = []
    sharedState.simulatedErrors = {}
    sharedState.pendingOAuthState = null

    // Clear persisted storage
    await removeFromStorage(STORAGE_KEYS.SESSION)
    await removeFromStorage(STORAGE_KEYS.USERS)
    await removeFromStorage(STORAGE_KEYS.DATABASE)

    if (__DEV__) {
      logger.debug(`[MockSupabase] Cleared all data and storage`)
    }
  },

  /**
   * Get all users
   */
  getUsers() {
    return Array.from(sharedState.mockUsers.values())
  },

  /**
   * Get table data
   */
  getTableData(tableName: string) {
    const table = sharedState.mockDatabase.get(tableName)
    return table ? Array.from(table.values()) : []
  },

  /**
   * Seed table with data (persists to storage)
   */
  async seedTable(tableName: string, data: any[]) {
    const table = new Map()
    data.forEach((item) => {
      const id = item.id || `mock-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      table.set(id, { ...item, id })
    })
    sharedState.mockDatabase.set(tableName, table)
    await persistDatabase()
  },

  /**
   * Get current session
   */
  getCurrentSession() {
    return sharedState.currentSession
  },

  /**
   * Delete a user and purge their data from mock storage
   */
  async deleteUser(userId: string) {
    let removedUser = false

    // Remove from user store
    sharedState.mockUsers.forEach((value, key) => {
      if (value.user.id === userId) {
        sharedState.mockUsers.delete(key)
        removedUser = true
      }
    })

    if (removedUser) {
      await persistUsers()
    }

    // Remove database records that belong to the user
    let databaseChanged = false
    sharedState.mockDatabase.forEach((table) => {
      let tableChanged = false
      table.forEach((row, key) => {
        if (row.id === userId || row.user_id === userId) {
          table.delete(key)
          tableChanged = true
        }
      })
      if (tableChanged) {
        databaseChanged = true
      }
    })

    if (databaseChanged) {
      await persistDatabase()
    }

    // Remove related files (best effort - matches by user id in metadata/path)
    Array.from(sharedState.mockFileStorage.entries()).forEach(([key, file]) => {
      if (
        (file as any).user_id === userId ||
        (typeof file.path === "string" && file.path.includes(userId))
      ) {
        sharedState.mockFileStorage.delete(key)
      }
    })

    // Clear active session if it belongs to the deleted user
    if (sharedState.currentSession?.user.id === userId) {
      sharedState.currentSession = null
      await removeFromStorage(STORAGE_KEYS.SESSION)
      notifyAuthStateChange("SIGNED_OUT", null)
    }

    return removedUser
  },

  /**
   * Simulate errors for testing error handling
   * @example
   * mockSupabaseHelpers.simulateError('auth', 'signIn', new Error('Network error'))
   * mockSupabaseHelpers.simulateError('database', 'posts.select', new Error('Table not found'))
   */
  simulateError(type: "auth" | "database", operation: string, error: Error | null) {
    if (type === "auth") {
      sharedState.simulatedErrors.auth = sharedState.simulatedErrors.auth || {}
      if (error) {
        ;(sharedState.simulatedErrors.auth as any)[operation] = error
      } else {
        delete (sharedState.simulatedErrors.auth as any)[operation]
      }
    } else if (type === "database") {
      const [table, op] = operation.split(".")
      sharedState.simulatedErrors.database = sharedState.simulatedErrors.database || {}
      sharedState.simulatedErrors.database[table] =
        sharedState.simulatedErrors.database[table] || {}
      if (error) {
        ;(sharedState.simulatedErrors.database[table] as any)[op] = error
      } else {
        delete (sharedState.simulatedErrors.database[table] as any)[op]
      }
    }

    if (__DEV__) {
      logger.debug(`[MockSupabase] ${error ? "Set" : "Cleared"} simulated error`, {
        type,
        operation,
      })
    }
  },

  /**
   * Clear all simulated errors
   */
  clearSimulatedErrors() {
    sharedState.simulatedErrors = {}
    if (__DEV__) {
      logger.debug(`[MockSupabase] Cleared all simulated errors`)
    }
  },

  /**
   * Get simulated error for an operation (internal use)
   */
  getSimulatedError(type: "auth" | "database", operation: string): Error | null {
    if (type === "auth") {
      return (sharedState.simulatedErrors.auth as any)?.[operation] || null
    } else {
      const [table, op] = operation.split(".")
      return (
        sharedState.simulatedErrors.database?.[table]?.[
          op as keyof (typeof sharedState.simulatedErrors.database)[string]
        ] || null
      )
    }
  },

  // ============================================================================
  // STORAGE HELPERS
  // ============================================================================

  /**
   * Get all files in mock storage
   */
  getStorageFiles() {
    return Array.from(sharedState.mockFileStorage.values())
  },

  /**
   * Get files in a specific bucket
   */
  getBucketFiles(bucket: string) {
    return Array.from(sharedState.mockFileStorage.values()).filter((f) => f.bucket === bucket)
  },

  /**
   * Clear all files in storage
   */
  clearStorage() {
    sharedState.mockFileStorage.clear()
    if (__DEV__) {
      logger.debug(`[MockSupabase] Cleared all storage files`)
    }
  },

  /**
   * Seed storage with files (for testing)
   */
  seedStorage(files: Array<{ bucket: string; path: string; data: string; mimeType?: string }>) {
    files.forEach((file) => {
      const fullPath = `${file.bucket}/${file.path}`
      sharedState.mockFileStorage.set(fullPath, {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.path.split("/").pop() || "file",
        bucket: file.bucket,
        path: file.path,
        size: file.data.length,
        mimeType: file.mimeType || "application/octet-stream",
        data: file.data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    })
    if (__DEV__) {
      logger.debug(`[MockSupabase] Seeded files`, { count: files.length })
    }
  },

  // ============================================================================
  // REALTIME HELPERS
  // ============================================================================

  /**
   * Trigger a realtime event (simulates database change notification)
   * @example
   * mockSupabaseHelpers.triggerRealtimeEvent('posts', 'INSERT', { id: 1, title: 'New Post' })
   */
  triggerRealtimeEvent(
    table: string,
    eventType: "INSERT" | "UPDATE" | "DELETE",
    newData: any,
    oldData: any = null,
  ) {
    sharedState.realtimeSubscriptions.forEach((subscriptions) => {
      subscriptions.forEach((sub) => {
        if (sub.table === table && (sub.event === eventType || sub.event === "*")) {
          // Check filter if present
          if (sub.filter) {
            const [column, operator, value] = sub.filter.split(/[=<>]/).map((s) => s.trim())
            if (operator === "eq" && newData[column] !== value) {
              return
            }
          }

          sub.callback({
            eventType,
            new: newData,
            old: oldData,
            schema: "public",
            table,
          })
        }
      })
    })
    if (__DEV__) {
      logger.debug(`[MockSupabase] Triggered realtime event`, { table, event: eventType })
    }
  },

  /**
   * Get all active realtime subscriptions
   */
  getRealtimeSubscriptions() {
    const subs: Array<{ channel: string; table: string; event: string }> = []
    sharedState.realtimeSubscriptions.forEach((subscriptions, channel) => {
      subscriptions.forEach((sub) => {
        subs.push({ channel, table: sub.table, event: sub.event })
      })
    })
    return subs
  },

  /**
   * Clear all realtime subscriptions
   */
  clearRealtimeSubscriptions() {
    sharedState.realtimeSubscriptions.clear()
    if (__DEV__) {
      logger.debug(`[MockSupabase] Cleared all realtime subscriptions`)
    }
  },

  // ============================================================================
  // RPC HELPERS
  // ============================================================================

  /**
   * Register a custom RPC handler for testing
   * @example
   * mockSupabaseHelpers.registerRpcHandler('get_user_stats', async (params) => ({
   *   data: { posts: 10, followers: 100 },
   *   error: null
   * }))
   */
  registerRpcHandler(
    functionName: string,
    handler: (params?: Record<string, any>) => Promise<DatabaseResponse>,
  ) {
    sharedState.mockRpcHandlers.set(functionName, handler)
    if (__DEV__) {
      logger.debug(`[MockSupabase] Registered RPC handler`, { function: functionName })
    }
  },

  /**
   * Unregister an RPC handler
   */
  unregisterRpcHandler(functionName: string) {
    sharedState.mockRpcHandlers.delete(functionName)
    if (__DEV__) {
      logger.debug(`[MockSupabase] Unregistered RPC handler`, { function: functionName })
    }
  },

  /**
   * Clear all RPC handlers
   */
  clearRpcHandlers() {
    sharedState.mockRpcHandlers.clear()
    if (__DEV__) {
      logger.debug(`[MockSupabase] Cleared all RPC handlers`)
    }
  },

  // ============================================================================
  // OAUTH HELPERS
  // ============================================================================

  /**
   * Check if there's a pending OAuth flow
   */
  hasPendingOAuth() {
    return sharedState.pendingOAuthState !== null
  },

  /**
   * Get pending OAuth state (for debugging)
   */
  getPendingOAuthState() {
    return sharedState.pendingOAuthState
  },

  /**
   * Cancel pending OAuth flow
   */
  cancelPendingOAuth() {
    sharedState.pendingOAuthState = null
    if (__DEV__) {
      logger.debug(`[MockSupabase] Cancelled pending OAuth flow`)
    }
  },
}

// Re-export types and classes for convenience
export { MockSupabaseAuth } from "./auth"
export { MockDatabaseTable, MockDatabaseQuery } from "./database"
export { MockStorage, MockStorageBucket, MockStorageFileApi } from "./storage"
export { MockRealtime, MockRealtimeChannel } from "./realtime"

