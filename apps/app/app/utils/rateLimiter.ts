/**
 * Rate Limiter Utility
 *
 * Provides client-side rate limiting to prevent abuse of authentication endpoints
 * and other sensitive operations. This is a defense-in-depth measure - server-side
 * rate limiting should also be implemented.
 */

import { Platform } from "react-native"

import * as storage from "./storage"

interface RateLimitEntry {
  count: number
  resetAt: number // Timestamp when limit resets
}

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number // Time window in milliseconds
  keyPrefix: string
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyPrefix: "rate_limit",
}

/**
 * Rate limiter class
 */
class RateLimiter {
  private config: RateLimitConfig

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Get storage key for rate limit entry
   */
  private getStorageKey(identifier: string): string {
    return `${this.config.keyPrefix}:${identifier}`
  }

  /**
   * Check if an action is allowed
   * Returns true if allowed, false if rate limited
   */
  async isAllowed(identifier: string): Promise<boolean> {
    try {
      const key = this.getStorageKey(identifier)
      const stored = storage.load(key) as RateLimitEntry | undefined

      const now = Date.now()

      // If no entry exists or window has expired, allow and create new entry
      if (!stored || now >= stored.resetAt) {
        const newEntry: RateLimitEntry = {
          count: 1,
          resetAt: now + this.config.windowMs,
        }
        storage.save(key, newEntry)
        return true
      }

      // Check if limit exceeded
      if (stored.count >= this.config.maxAttempts) {
        return false
      }

      // Increment count
      stored.count++
      storage.save(key, stored)
      return true
    } catch (error) {
      // On error, allow the request (fail open) but log the error
      console.warn("[RateLimiter] Error checking rate limit, allowing request", error)
      return true
    }
  }

  /**
   * Get remaining attempts for an identifier
   */
  async getRemainingAttempts(identifier: string): Promise<number> {
    try {
      const key = this.getStorageKey(identifier)
      const stored = storage.load(key) as RateLimitEntry | undefined

      if (!stored) {
        return this.config.maxAttempts
      }

      const now = Date.now()
      if (now >= stored.resetAt) {
        return this.config.maxAttempts
      }

      return Math.max(0, this.config.maxAttempts - stored.count)
    } catch {
      return this.config.maxAttempts
    }
  }

  /**
   * Get time until rate limit resets (in milliseconds)
   */
  async getResetTime(identifier: string): Promise<number> {
    try {
      const key = this.getStorageKey(identifier)
      const stored = storage.load(key) as RateLimitEntry | undefined

      if (!stored) {
        return 0
      }

      const now = Date.now()
      return Math.max(0, stored.resetAt - now)
    } catch {
      return 0
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string): Promise<void> {
    try {
      const key = this.getStorageKey(identifier)
      storage.remove(key)
    } catch (error) {
      console.warn("[RateLimiter] Error resetting rate limit", error)
    }
  }

  /**
   * Clear all rate limit entries (useful for testing)
   */
  async clearAll(): Promise<void> {
    try {
      const keys = storage.getAllKeys()
      const prefix = `${this.config.keyPrefix}:`
      keys.forEach((key) => {
        if (key.startsWith(prefix)) {
          storage.remove(key)
        }
      })
    } catch (error) {
      console.warn("[RateLimiter] Error clearing rate limits", error)
    }
  }
}

// Pre-configured rate limiters for common use cases
export const authRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyPrefix: "rate_limit_auth",
})

export const passwordResetRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: "rate_limit_password_reset",
})

export const signUpRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: "rate_limit_signup",
})

// Export class for custom configurations
export { RateLimiter }


