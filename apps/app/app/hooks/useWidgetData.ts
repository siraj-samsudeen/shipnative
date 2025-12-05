/**
 * useWidgetData Hook
 *
 * React hook for fetching widget data from Supabase.
 * Provides convenient access to widget data with caching and error handling.
 */

import { useState, useEffect, useCallback } from "react"

import { fetchWidgetData, clearWidgetCache, getWidgetConfig } from "../services/widgets"
import { logger } from "../utils/Logger"

export interface UseWidgetDataOptions {
  table: string
  select?: string
  filters?: Record<string, any>
  limit?: number
  orderBy?: { column: string; ascending?: boolean }
  requireAuth?: boolean
  cacheKey?: string
  refreshInterval?: number // in milliseconds
  enabled?: boolean
}

export interface UseWidgetDataReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  clearCache: () => void
  config: {
    supabaseUrl: string
    supabaseKey: string
    isMock: boolean
  }
}

/**
 * Hook for fetching widget data
 *
 * @example
 * ```tsx
 * function WidgetSettingsScreen() {
 *   const { data, loading, error, refetch } = useWidgetData({
 *     table: 'profiles',
 *     select: 'id, first_name, avatar_url',
 *     limit: 1,
 *     requireAuth: true,
 *   })
 *
 *   if (loading) return <Spinner />
 *   if (error) return <Text>Error: {error.message}</Text>
 *
 *   return (
 *     <View>
 *       <Text>Welcome {data?.first_name}</Text>
 *       <Button onPress={refetch} title="Refresh" />
 *     </View>
 *   )
 * }
 * ```
 */
export function useWidgetData<T = any>(options: UseWidgetDataOptions): UseWidgetDataReturn<T> {
  const {
    table,
    select,
    filters,
    limit,
    orderBy,
    requireAuth,
    cacheKey,
    refreshInterval,
    enabled = true,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchWidgetData<T>({
        table,
        select,
        filters,
        limit,
        orderBy,
        requireAuth,
        cacheKey,
      })

      if (result.error) {
        setError(result.error)
        setData(null)
      } else {
        setData(result.data)
        setError(null)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      logger.error("Widget data fetch error", { error, table })
      setError(error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [table, select, filters, limit, orderBy, requireAuth, cacheKey, enabled])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up refresh interval if provided
  useEffect(() => {
    if (!refreshInterval || !enabled) return

    const interval = setInterval(() => {
      fetchData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, fetchData, enabled])

  const handleClearCache = useCallback(() => {
    if (cacheKey) {
      clearWidgetCache(cacheKey)
    } else {
      clearWidgetCache()
    }
    // Refetch after clearing cache
    fetchData()
  }, [cacheKey, fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    clearCache: handleClearCache,
    config: getWidgetConfig(),
  }
}
