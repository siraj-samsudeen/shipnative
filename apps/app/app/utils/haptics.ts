/**
 * Haptics Utility
 *
 * Provides haptic feedback for interactive elements.
 * Gracefully handles platforms where haptics are not available (web).
 * Checks device capabilities before triggering haptics to prevent errors.
 */

import { Platform } from "react-native"
import * as Haptics from "expo-haptics"

import { checkHapticsSupport, checkHapticsSupportSync } from "./hapticsCapability"
import { logger } from "./Logger"

/**
 * Check if haptics are available on this platform
 * This is a basic platform check - use checkHapticsSupport() for device capability
 */
const isHapticsAvailable = Platform.OS === "ios" || Platform.OS === "android"

/**
 * Internal function to safely trigger haptic feedback
 * Checks device capabilities before triggering
 */
async function _safeHapticTrigger(hapticFunction: () => Promise<void> | void): Promise<void> {
  if (!isHapticsAvailable) {
    return
  }

  try {
    // Check if device supports haptics (uses cached result if available)
    const supportsHaptics = await checkHapticsSupport()
    if (!supportsHaptics) {
      return
    }

    // Trigger haptic feedback
    await hapticFunction()
  } catch (error) {
    // Silently fail if haptics are not available or trigger fails
    // This prevents console errors on devices/simulators without haptics
    if (__DEV__) {
      // Only log in dev mode for debugging
      logger.error("[Haptics] Haptic feedback failed", {}, error as Error)
    }
  }
}

/**
 * Synchronous version for immediate haptic feedback
 * Uses cached capability result or defaults to attempting haptics
 */
function safeHapticTriggerSync(hapticFunction: () => Promise<void> | void): void {
  if (!isHapticsAvailable) {
    return
  }

  // Use sync check (may default to true for immediate feedback)
  const supportsHaptics = checkHapticsSupportSync()
  if (!supportsHaptics) {
    return
  }

  // Trigger haptic feedback asynchronously
  const result = hapticFunction()
  if (result instanceof Promise) {
    result.catch(() => {
      // Silently fail
    })
  }
}

/**
 * Impact feedback styles for different interaction types
 */
export const hapticImpact = {
  /**
   * Light impact - for small UI elements like toggles, checkboxes
   */
  light: () => {
    safeHapticTriggerSync(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
  },

  /**
   * Medium impact - for standard buttons and selections
   */
  medium: () => {
    safeHapticTriggerSync(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))
  },

  /**
   * Heavy impact - for significant actions like confirming or deleting
   */
  heavy: () => {
    safeHapticTriggerSync(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy))
  },

  /**
   * Soft impact - for subtle feedback
   */
  soft: () => {
    safeHapticTriggerSync(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft))
  },

  /**
   * Rigid impact - for snappy feedback
   */
  rigid: () => {
    safeHapticTriggerSync(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid))
  },
}

/**
 * Notification feedback for system-level feedback
 */
export const hapticNotification = {
  /**
   * Success notification - for successful actions
   */
  success: () => {
    safeHapticTriggerSync(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
  },

  /**
   * Warning notification - for warnings
   */
  warning: () => {
    safeHapticTriggerSync(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning))
  },

  /**
   * Error notification - for errors
   */
  error: () => {
    safeHapticTriggerSync(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error))
  },
}

/**
 * Selection feedback - for selection changes
 */
export const hapticSelection = () => {
  safeHapticTriggerSync(() => Haptics.selectionAsync())
}

/**
 * Pre-configured haptic presets for common interactions
 */
export const haptics = {
  // Button presses
  buttonPress: hapticImpact.medium,
  buttonPressLight: hapticImpact.light,
  buttonPressHeavy: hapticImpact.heavy,

  // Tab bar and navigation
  tabPress: hapticImpact.light,
  navigationPress: hapticImpact.light,

  // Toggles and switches
  toggleOn: hapticImpact.light,
  toggleOff: hapticImpact.soft,
  switchChange: hapticSelection,

  // Selection
  selection: hapticSelection,
  listItemPress: hapticImpact.light,
  cardPress: hapticImpact.light,

  // Status
  success: hapticNotification.success,
  warning: hapticNotification.warning,
  error: hapticNotification.error,

  // Gestures
  longPress: hapticImpact.heavy,
  swipe: hapticImpact.soft,
  pull: hapticImpact.rigid,

  // Special
  refresh: hapticImpact.rigid,
  delete: hapticNotification.warning,
  confirm: hapticNotification.success,
}
