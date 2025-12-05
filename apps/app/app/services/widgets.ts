/**
 * Widget Service
 *
 * Service for fetching and managing data for native widgets.
 * Handles secure Supabase data fetching with session management,
 * caching, and error handling.
 */

import { Platform } from "react-native"
import * as SecureStore from "expo-secure-store"

import { supabase, supabaseUrl, supabaseKey, isUsingMockSupabase } from "./supabase"
import { logger } from "../utils/Logger"

/**
 * Widget data cache interface
 */
interface WidgetCache<T> {
  data: T | null
  timestamp: number
  expiresAt: number
}

/**
 * Widget service configuration
 */
const WIDGET_CONFIG = {
  // Cache duration in milliseconds (15 minutes)
  cacheDuration: 15 * 60 * 1000,
  // Maximum cache size (10 items)
  maxCacheSize: 10,
  // Rate limit: minimum time between updates (5 minutes)
  rateLimitMs: 5 * 60 * 1000,
}

/**
 * In-memory cache for widget data
 */
const widgetCache = new Map<string, WidgetCache<any>>()

/**
 * Last update timestamps for rate limiting
 */
const lastUpdateTimestamps = new Map<string, number>()

/**
 * Get Supabase session token for widget authentication
 * Widgets need access to the session token stored by the main app
 */
async function _getWidgetSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === "ios") {
      // iOS uses App Group for sharing data between app and widget
      // The token should be stored in UserDefaults accessible via App Group
      // For now, we'll use SecureStore and the widget will need to read from App Group
      const token = await SecureStore.getItemAsync("supabase.auth.token")
      return token
    } else if (Platform.OS === "android") {
      // Android uses SharedPreferences
      // The token should be stored in SharedPreferences accessible by widget
      const token = await SecureStore.getItemAsync("supabase.auth.token")
      return token
    }
    return null
  } catch (error) {
    logger.error("Failed to get widget session token", { error })
    return null
  }
}

/**
 * Check if enough time has passed since last update (rate limiting)
 */
function canUpdate(key: string): boolean {
  const lastUpdate = lastUpdateTimestamps.get(key)
  if (!lastUpdate) return true

  const timeSinceLastUpdate = Date.now() - lastUpdate
  return timeSinceLastUpdate >= WIDGET_CONFIG.rateLimitMs
}

/**
 * Get cached data if valid
 */
function getCachedData<T>(key: string): T | null {
  const cached = widgetCache.get(key)
  if (!cached) return null

  if (Date.now() > cached.expiresAt) {
    widgetCache.delete(key)
    return null
  }

  return cached.data
}

/**
 * Set cached data
 */
function setCachedData<T>(key: string, data: T): void {
  // Enforce max cache size
  if (widgetCache.size >= WIDGET_CONFIG.maxCacheSize) {
    // Remove oldest entry
    const oldestKey = Array.from(widgetCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    )[0]?.[0]
    if (oldestKey) {
      widgetCache.delete(oldestKey)
    }
  }

  widgetCache.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + WIDGET_CONFIG.cacheDuration,
  })
}

/**
 * Fetch data from Supabase for widgets
 * Supports both authenticated and public queries
 */
export async function fetchWidgetData<T = any>(options: {
  table: string
  select?: string
  filters?: Record<string, any>
  limit?: number
  orderBy?: { column: string; ascending?: boolean }
  requireAuth?: boolean
  cacheKey?: string
}): Promise<{ data: T | null; error: Error | null }> {
  const {
    table,
    select = "*",
    filters = {},
    limit = 10,
    orderBy,
    requireAuth: _requireAuth = false,
    cacheKey,
  } = options

  // Generate cache key if not provided
  const key = cacheKey || `widget_${table}_${JSON.stringify(filters)}_${limit}`

  // Check cache first
  const cached = getCachedData<T>(key)
  if (cached !== null) {
    return { data: cached, error: null }
  }

  // Rate limiting
  if (!canUpdate(key)) {
    logger.warn("Widget data update rate limited", { key })
    // Return cached data even if expired, or null if no cache
    return { data: cached, error: null }
  }

  try {
    // In mock mode, return mock data
    if (isUsingMockSupabase) {
      const mockData = generateMockData<T>(table, limit)
      setCachedData(key, mockData)
      lastUpdateTimestamps.set(key, Date.now())
      return { data: mockData, error: null }
    }

    // Build query
    let query = supabase.from(table).select(select).limit(limit)

    // Apply filters
    Object.entries(filters).forEach(([column, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(column, value)
      }
    })

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, {
        ascending: orderBy.ascending !== false,
      })
    }

    // Execute query
    const { data, error } = await query

    if (error) {
      logger.error("Widget data fetch error", { error, table, filters })
      return { data: null, error: new Error(error.message) }
    }

    // Cache the result
    if (data) {
      setCachedData(key, data)
      lastUpdateTimestamps.set(key, Date.now())
    }

    return { data: data as T, error: null }
  } catch (error) {
    logger.error("Widget data fetch exception", { error, table })
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    }
  }
}

/**
 * Generate mock data for development
 */
function generateMockData<T>(table: string, limit: number): T {
  // Simple mock data generator
  // In a real scenario, you'd want more sophisticated mock data
  const mockItems = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
    id: `mock_${i + 1}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  return (limit === 1 ? mockItems[0] : mockItems) as T
}

/**
 * Clear widget cache
 */
export function clearWidgetCache(key?: string): void {
  if (key) {
    widgetCache.delete(key)
    lastUpdateTimestamps.delete(key)
  } else {
    widgetCache.clear()
    lastUpdateTimestamps.clear()
  }
}

/**
 * Get widget configuration for native widgets
 * Provides Supabase URL and key for widget authentication
 */
export function getWidgetConfig(): {
  supabaseUrl: string
  supabaseKey: string
  isMock: boolean
} {
  return {
    supabaseUrl,
    supabaseKey,
    isMock: isUsingMockSupabase,
  }
}

/**
 * Validate widget data before displaying
 */
export function validateWidgetData<T>(data: T | null, validator?: (data: T) => boolean): boolean {
  if (data === null || data === undefined) return false
  if (validator) {
    return validator(data)
  }
  return true
}
