/**
 * Mock Supabase Types
 *
 * Type definitions for the mock Supabase implementation
 */

import type { User, Session, AuthStateChangeCallback } from "../../../types/auth"
import type { DatabaseResponse } from "../../../types/database"

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*"

export type RealtimeCallback = (payload: {
  eventType: RealtimeEvent
  new: any
  old: any
  schema: string
  table: string
}) => void

export interface RealtimeSubscription {
  table: string
  event: RealtimeEvent
  callback: RealtimeCallback
  filter?: string
}

export interface StorageFile {
  id: string
  name: string
  bucket: string
  path: string
  size: number
  mimeType: string
  data: string // Base64 encoded data
  created_at: string
  updated_at: string
}

export interface MockUserData {
  email: string
  password: string
  user: User
}

export interface PendingOAuthState {
  provider: string
  state: string
  redirectTo?: string
  onComplete?: (session: Session | null, error: Error | null) => void
}

export interface SimulatedErrors {
  auth?: { signIn?: Error; signUp?: Error; signOut?: Error }
  database?: {
    [table: string]: { select?: Error; insert?: Error; update?: Error; delete?: Error }
  }
}

// Shared state object - using object properties allows mutation across modules
export const sharedState = {
  mockUsers: new Map<string, MockUserData>(),
  mockDatabase: new Map<string, Map<string, any>>(),
  currentSession: null as Session | null,
  authStateListeners: [] as AuthStateChangeCallback[],
  isInitialized: false,
  realtimeSubscriptions: new Map<string, RealtimeSubscription[]>(),
  mockRpcHandlers: new Map<string, (params?: Record<string, any>) => Promise<DatabaseResponse>>(),
  mockFileStorage: new Map<string, StorageFile>(),
  mockBuckets: new Set<string>(["avatars", "uploads", "public"]),
  simulatedErrors: {} as SimulatedErrors,
  pendingOAuthState: null as PendingOAuthState | null,
}
