/**
 * Authorization Utilities
 *
 * Provides client-side authorization checks as defense-in-depth.
 * These checks complement server-side RLS policies and should never be
 * the only security measure.
 */

import type { User } from "../types/auth"

/**
 * Check if user is authenticated
 */
export function isAuthenticated(user: User | null): boolean {
  return user !== null && user.id !== undefined
}

/**
 * Check if user owns a resource
 */
export function isOwner(user: User | null, resourceUserId: string | null | undefined): boolean {
  if (!user || !resourceUserId) {
    return false
  }
  return user.id === resourceUserId
}

/**
 * Check if user can access a resource
 * This is a basic check - extend based on your app's authorization needs
 */
export function canAccess(
  user: User | null,
  resource: {
    userId?: string | null
    isPublic?: boolean
    requiresAuth?: boolean
  },
): boolean {
  // Public resources don't require authentication
  if (resource.isPublic) {
    return true
  }

  // If resource requires auth, user must be authenticated
  if (resource.requiresAuth && !isAuthenticated(user)) {
    return false
  }

  // If resource has a userId, check ownership
  if (resource.userId) {
    return isOwner(user, resource.userId)
  }

  // Default: require authentication
  return isAuthenticated(user)
}

/**
 * Check if user can modify a resource
 */
export function canModify(user: User | null, resourceUserId: string | null | undefined): boolean {
  return isOwner(user, resourceUserId)
}

/**
 * Check if user can delete a resource
 */
export function canDelete(user: User | null, resourceUserId: string | null | undefined): boolean {
  return isOwner(user, resourceUserId)
}

/**
 * Authorization result
 */
export interface AuthorizationResult {
  allowed: boolean
  reason?: string
}

/**
 * Authorize an action with detailed result
 */
export function authorize(
  user: User | null,
  action: "read" | "write" | "delete",
  resource: {
    userId?: string | null
    isPublic?: boolean
    requiresAuth?: boolean
  },
): AuthorizationResult {
  if (action === "read") {
    const allowed = canAccess(user, resource)
    return {
      allowed,
      reason: allowed ? undefined : "You don't have permission to view this resource",
    }
  }

  if (action === "write" || action === "delete") {
    if (!isAuthenticated(user)) {
      return {
        allowed: false,
        reason: "You must be signed in to perform this action",
      }
    }

    const allowed = canModify(user, resource.userId)
    return {
      allowed,
      reason: allowed ? undefined : "You can only modify your own resources",
    }
  }

  return {
    allowed: false,
    reason: "Unknown action",
  }
}


