/**
 * Haptics Capability Checker
 *
 * Checks if the device supports haptic feedback before triggering haptics.
 * This prevents errors on devices/simulators that don't support haptics.
 */

import { Platform, NativeModules } from "react-native"

interface HapticsCapabilityModule {
  supportsHaptics: () => Promise<boolean>
  supportsHapticsSync: () => Promise<boolean>
}

// Get the native module if available (iOS only)
const HapticsCapability = NativeModules.HapticsCapability as HapticsCapabilityModule | undefined

// Cache the capability check result
let hapticsSupported: boolean | null = null
let capabilityCheckPromise: Promise<boolean> | null = null

/**
 * Check if the device supports haptics
 * This is async because iOS needs to check CoreHaptics capabilities
 */
export async function checkHapticsSupport(): Promise<boolean> {
  // Return cached result if available
  if (hapticsSupported !== null) {
    return hapticsSupported
  }

  // Return existing promise if check is in progress
  if (capabilityCheckPromise) {
    return capabilityCheckPromise
  }

  // Start capability check
  capabilityCheckPromise = (async () => {
    try {
      if (Platform.OS === "ios") {
        // Use native module to check iOS CoreHaptics capabilities
        if (HapticsCapability) {
          const supports = await HapticsCapability.supportsHaptics()
          hapticsSupported = supports
          return supports
        } else {
          // Native module not available - assume haptics are supported
          // This can happen during development or if module isn't linked
          hapticsSupported = true
          return true
        }
      } else if (Platform.OS === "android") {
        // Android: expo-haptics handles capability checking internally
        // Most modern Android devices support haptics
        // We'll let expo-haptics handle errors gracefully
        hapticsSupported = true
        return true
      } else {
        // Web or other platforms - no haptics
        hapticsSupported = false
        return false
      }
    } catch (error) {
      // If check fails, assume haptics are not supported
      if (__DEV__) {
        console.warn("[Haptics] Capability check failed:", error)
      }
      hapticsSupported = false
      return false
    } finally {
      // Clear the promise so we can check again if needed
      capabilityCheckPromise = null
    }
  })()

  return capabilityCheckPromise
}

/**
 * Check if the device supports haptics synchronously
 * Returns cached result or defaults to true for immediate use
 * Use checkHapticsSupport() for accurate results
 */
export function checkHapticsSupportSync(): boolean {
  if (hapticsSupported !== null) {
    return hapticsSupported
  }

  // For immediate checks, default to true on mobile platforms
  // The async check will update the cache
  if (Platform.OS === "ios" || Platform.OS === "android") {
    // Start async check in background
    checkHapticsSupport().catch(() => {
      // Silently handle errors
    })
    return true
  }

  return false
}

/**
 * Reset the capability cache (useful for testing or if device capabilities change)
 */
export function resetHapticsCapabilityCache(): void {
  hapticsSupported = null
  capabilityCheckPromise = null
}

