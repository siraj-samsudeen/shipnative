/**
 * Mock Supabase Database
 *
 * Mock implementation of Supabase database query builder and table operations
 */

import { delay, persistDatabase } from "./helpers"
import { sharedState } from "./types"
import type { DatabaseResponse } from "../../../types/database"
import { logger } from "../../../utils/Logger"

// Mock database query builder
export class MockDatabaseQuery {
  private tableName: string
  private filters: Array<{ column: string; operator: string; value: any }> = []
  private orderColumn?: string
  private orderAscending: boolean = true
  private limitCount?: number
  private rangeFrom?: number
  private rangeTo?: number

  constructor(tableName: string) {
    this.tableName = tableName
  }

  /**
   * Get filters for external use (update/delete operations)
   */
  getFilters(): Array<{ column: string; operator: string; value: any }> {
    return this.filters
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: "eq", value })
    return this
  }

  neq(column: string, value: any) {
    this.filters.push({ column, operator: "neq", value })
    return this
  }

  gt(column: string, value: any) {
    this.filters.push({ column, operator: "gt", value })
    return this
  }

  gte(column: string, value: any) {
    this.filters.push({ column, operator: "gte", value })
    return this
  }

  lt(column: string, value: any) {
    this.filters.push({ column, operator: "lt", value })
    return this
  }

  lte(column: string, value: any) {
    this.filters.push({ column, operator: "lte", value })
    return this
  }

  like(column: string, pattern: string) {
    this.filters.push({ column, operator: "like", value: pattern })
    return this
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ column, operator: "ilike", value: pattern })
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, operator: "in", value: values })
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column
    this.orderAscending = options?.ascending ?? true
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  range(from: number, to: number) {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  match(query: Record<string, any>) {
    Object.entries(query).forEach(([column, value]) => {
      this.eq(column, value)
    })
    return this
  }

  /**
   * Apply filters to items - public for use by update/delete operations
   */
  applyFilters(items: any[]): any[] {
    return items.filter((item) => {
      return this.filters.every((filter) => {
        const value = item[filter.column]

        switch (filter.operator) {
          case "eq":
            return value === filter.value
          case "neq":
            return value !== filter.value
          case "gt":
            return value > filter.value
          case "gte":
            return value >= filter.value
          case "lt":
            return value < filter.value
          case "lte":
            return value <= filter.value
          case "like":
          case "ilike":
            const pattern = filter.value.replace(/%/g, ".*")
            const regex = new RegExp(pattern, filter.operator === "ilike" ? "i" : "")
            return regex.test(String(value))
          case "in":
            return filter.value.includes(value)
          default:
            return true
        }
      })
    })
  }

  private applyOrdering(items: any[]): any[] {
    if (!this.orderColumn) return items

    return [...items].sort((a, b) => {
      const aVal = a[this.orderColumn!]
      const bVal = b[this.orderColumn!]

      if (aVal < bVal) return this.orderAscending ? -1 : 1
      if (aVal > bVal) return this.orderAscending ? 1 : -1
      return 0
    })
  }

  private applyLimiting(items: any[]): any[] {
    if (this.rangeFrom !== undefined && this.rangeTo !== undefined) {
      return items.slice(this.rangeFrom, this.rangeTo + 1)
    }
    if (this.limitCount !== undefined) {
      return items.slice(0, this.limitCount)
    }
    return items
  }

  async single(): Promise<DatabaseResponse> {
    await delay(200)

    const table = sharedState.mockDatabase.get(this.tableName)
    if (!table) {
      return { data: null, error: new Error(`Table ${this.tableName} not found`) }
    }

    const items = Array.from(table.values())
    const filtered = this.applyFilters(items)

    if (filtered.length === 0) {
      return { data: null, error: new Error("No rows found") }
    }

    if (filtered.length > 1) {
      return { data: null, error: new Error("Multiple rows found") }
    }

    return { data: filtered[0], error: null }
  }

  async maybeSingle(): Promise<DatabaseResponse> {
    await delay(200)

    const table = sharedState.mockDatabase.get(this.tableName)
    if (!table) {
      return { data: null, error: null }
    }

    const items = Array.from(table.values())
    const filtered = this.applyFilters(items)

    if (filtered.length === 0) {
      return { data: null, error: null }
    }

    if (filtered.length > 1) {
      return { data: null, error: new Error("Multiple rows found") }
    }

    return { data: filtered[0], error: null }
  }

  async then(resolve: (value: DatabaseResponse) => void) {
    await delay(200)

    const table = sharedState.mockDatabase.get(this.tableName)
    if (!table) {
      resolve({ data: [], error: null })
      return
    }

    let items = Array.from(table.values())
    items = this.applyFilters(items)
    items = this.applyOrdering(items)
    items = this.applyLimiting(items)

    resolve({ data: items, error: null, count: items.length })
  }
}

// Mock database table
export class MockDatabaseTable {
  private tableName: string

  constructor(tableName: string) {
    this.tableName = tableName

    // Initialize table if it doesn't exist
    if (!sharedState.mockDatabase.has(tableName)) {
      sharedState.mockDatabase.set(tableName, new Map())
    }
  }

  select(columns?: string) {
    if (__DEV__) {
      logger.debug(`[MockSupabase] SELECT`, { table: this.tableName, columns: columns || "*" })
    }
    return new MockDatabaseQuery(this.tableName)
  }

  async insert(data: any | any[]): Promise<DatabaseResponse> {
    await delay(300)

    const table = sharedState.mockDatabase.get(this.tableName)!
    const items = Array.isArray(data) ? data : [data]
    const inserted: any[] = []

    items.forEach((item) => {
      const id = item.id || `mock-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const record = {
        ...item,
        id,
        created_at: item.created_at || new Date().toISOString(),
      }
      table.set(id, record)
      inserted.push(record)
    })

    // Persist database changes
    await persistDatabase()

    if (__DEV__) {
      logger.debug(`[MockSupabase] INSERT`, { table: this.tableName, rows: inserted.length })
    }

    return {
      data: Array.isArray(data) ? inserted : inserted[0],
      error: null,
    }
  }

  update(data: any) {
    if (__DEV__) {
      logger.debug(`[MockSupabase] UPDATE`, { table: this.tableName })
    }

    const query = new MockDatabaseQuery(this.tableName)

    query.then = async (resolve) => {
      await delay(300)

      const table = sharedState.mockDatabase.get(this.tableName)!
      const items = Array.from(table.values())
      const filtered = query.applyFilters(items)

      filtered.forEach((item: any) => {
        const updated = { ...item, ...data, updated_at: new Date().toISOString() }
        table.set(item.id, updated)
      })

      // Persist database changes
      await persistDatabase()

      if (__DEV__) {
        logger.debug(`[MockSupabase] Updated rows`, {
          table: this.tableName,
          count: filtered.length,
        })
      }

      resolve({ data: filtered, error: null })
    }

    return query
  }

  delete() {
    if (__DEV__) {
      logger.debug(`[MockSupabase] DELETE`, { table: this.tableName })
    }

    const query = new MockDatabaseQuery(this.tableName)

    query.then = async (resolve) => {
      await delay(300)

      const table = sharedState.mockDatabase.get(this.tableName)!
      const items = Array.from(table.values())
      const filtered = query.applyFilters(items)

      filtered.forEach((item: any) => {
        table.delete(item.id)
      })

      // Persist database changes
      await persistDatabase()

      if (__DEV__) {
        logger.debug(`[MockSupabase] Deleted rows`, {
          table: this.tableName,
          count: filtered.length,
        })
      }

      resolve({ data: filtered, error: null })
    }

    return query
  }

  async upsert(data: any | any[]): Promise<DatabaseResponse> {
    await delay(300)

    const table = sharedState.mockDatabase.get(this.tableName)!
    const items = Array.isArray(data) ? data : [data]
    const upserted: any[] = []

    items.forEach((item) => {
      const id = item.id || `mock-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const existing = table.get(id)
      const record = {
        ...existing,
        ...item,
        id,
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      table.set(id, record)
      upserted.push(record)
    })

    // Persist database changes
    await persistDatabase()

    if (__DEV__) {
      logger.debug(`[MockSupabase] UPSERT`, { table: this.tableName, rows: upserted.length })
    }

    return {
      data: Array.isArray(data) ? upserted : upserted[0],
      error: null,
    }
  }
}

