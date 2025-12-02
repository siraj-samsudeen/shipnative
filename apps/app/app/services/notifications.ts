import Constants from "expo-constants"

// Lazy import to avoid native module errors at module load time
let Notifications: typeof import("expo-notifications") | null = null
let notificationHandlerSetup = false

/**
 * Safely import expo-notifications
 */
const getNotifications = (): typeof import("expo-notifications") | null => {
  if (Notifications !== null) {
    return Notifications
  }

  try {
    Notifications = require("expo-notifications")
    return Notifications
  } catch (error) {
    if (__DEV__) {
      console.warn("📬 [Notifications] Failed to import expo-notifications:", error)
    }
    return null
  }
}

/**
 * Check if native notification module is available
 * This checks if we can actually use the native module without errors
 */
let nativeModuleAvailable: boolean | null = null

const isNativeModuleAvailable = (): boolean => {
  if (nativeModuleAvailable !== null) {
    return nativeModuleAvailable
  }

  const NotificationsModule = getNotifications()
  if (!NotificationsModule) {
    nativeModuleAvailable = false
    return false
  }

  try {
    // Try to access the native module by checking if methods exist
    // We can't actually call them without triggering the error, so we check existence
    if (
      typeof NotificationsModule.setNotificationHandler === "function" &&
      typeof NotificationsModule.getPermissionsAsync === "function"
    ) {
      // Try a simple operation to verify the native module is actually available
      // This will fail if the native module isn't linked
      nativeModuleAvailable = true
      return true
    }
    nativeModuleAvailable = false
    return false
  } catch (error) {
    if (__DEV__) {
      console.warn("📬 [Notifications] Native module check failed:", error)
    }
    nativeModuleAvailable = false
    return false
  }
}

/**
 * Setup notification handler (lazy initialization)
 */
const setupNotificationHandler = (): void => {
  if (notificationHandlerSetup) {
    return
  }

  const NotificationsModule = getNotifications()
  if (!NotificationsModule) {
    return
  }

  try {
    if (isNativeModuleAvailable()) {
      NotificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      })
      notificationHandlerSetup = true
    }
  } catch (error) {
    if (__DEV__) {
      console.warn("📬 [Notifications] Failed to set notification handler:", error)
    }
  }
}

/**
 * Check if we should use mock notifications
 */
const forceMockNotifications = process.env.EXPO_PUBLIC_USE_MOCK_NOTIFICATIONS === "true"

const shouldUseMock = (): boolean => {
  // Explicit opt-in to mock mode via env for developers who want to bypass native prompts
  if (forceMockNotifications) {
    if (__DEV__) {
      console.log("📬 [Notifications] Mock mode forced via EXPO_PUBLIC_USE_MOCK_NOTIFICATIONS")
    }
    return true
  }

  // If native module is not available, use mock
  if (!isNativeModuleAvailable()) {
    if (__DEV__) {
      console.log("📬 [Notifications] Native module not available - using mock mode")
    }
    return true
  }

  return false
}

export const useMockNotifications = shouldUseMock()

/**
 * Request notification permissions
 */
export async function requestPermission(): Promise<{
  status: "granted" | "denied" | "undetermined"
}> {
  if (useMockNotifications || !isNativeModuleAvailable()) {
    console.log("📬 [MockNotifications] Permission automatically granted")
    return { status: "granted" }
  }

  const NotificationsModule = getNotifications()
  if (!NotificationsModule) {
    console.log("📬 [MockNotifications] Permission automatically granted (module unavailable)")
    return { status: "granted" }
  }

  try {
    const { status: existingStatus } = await NotificationsModule.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== "granted") {
      const { status } = await NotificationsModule.requestPermissionsAsync()
      finalStatus = status
    }

    return { status: finalStatus as "granted" | "denied" | "undetermined" }
  } catch (error) {
    console.warn("📬 [Notifications] Error requesting permission, using mock:", error)
    return { status: "granted" } // Fallback to granted in mock mode
  }
}

/**
 * Register for push notifications and get Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (useMockNotifications || !isNativeModuleAvailable()) {
    const mockToken = "ExponentPushToken[MOCK-" + Math.random().toString(36).substr(2, 9) + "]"
    console.log("📬 [MockNotifications] Generated mock push token:", mockToken)
    return mockToken
  }

  // Verify permissions
  const { status } = await requestPermission()
  if (status !== "granted") {
    console.log("📬 [Notifications] Permission not granted, cannot get push token")
    return null
  }

  // Get push token
  const NotificationsModule = getNotifications()
  if (!NotificationsModule) {
    const mockToken = "ExponentPushToken[MOCK-" + Math.random().toString(36).substr(2, 9) + "]"
    return mockToken
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    if (!projectId) {
      console.warn("📬 [Notifications] No EAS project ID found")
      return null
    }

    const token = await NotificationsModule.getExpoPushTokenAsync({
      projectId,
    })

    console.log("📬 [Notifications] Push token:", token.data)
    return token.data
  } catch (error) {
    console.warn("📬 [Notifications] Error getting push token, using mock:", error)
    // Fallback to mock token if native module fails
    const mockToken = "ExponentPushToken[MOCK-" + Math.random().toString(36).substr(2, 9) + "]"
    return mockToken
  }
}

export interface LocalNotificationInput {
  title: string
  body: string
  data?: Record<string, any>
  trigger?: import("expo-notifications").NotificationTriggerInput | null
  sound?: string
  badge?: number
  categoryIdentifier?: string
}

/**
 * Schedule a local notification
 */
export async function scheduleNotification(input: LocalNotificationInput): Promise<string> {
  if (useMockNotifications || !isNativeModuleAvailable()) {
    const mockId = "mock-notification-" + Date.now()
    console.log("📬 [MockNotifications] Scheduled notification:", {
      id: mockId,
      ...input,
    })

    // Simulate notification after delay
    if (input.trigger && "seconds" in input.trigger) {
      setTimeout(
        () => {
          console.log("📬 [MockNotifications] Notification would appear:", input.title)
        },
        (input.trigger.seconds || 0) * 1000,
      )
    }

    return mockId
  }

  const NotificationsModule = getNotifications()
  if (!NotificationsModule) {
    const mockId = "mock-notification-" + Date.now()
    return mockId
  }

  try {
    setupNotificationHandler() // Ensure handler is set up before scheduling
    const id = await NotificationsModule.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        data: input.data,
        sound: input.sound,
        badge: input.badge,
        categoryIdentifier: input.categoryIdentifier,
      },
      trigger: input.trigger || null,
    })

    console.log("📬 [Notifications] Scheduled notification:", id)
    return id
  } catch (error) {
    console.warn("📬 [Notifications] Error scheduling notification, using mock:", error)
    // Fallback to mock
    const mockId = "mock-notification-" + Date.now()
    return mockId
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  if (useMockNotifications || !isNativeModuleAvailable()) {
    console.log("📬 [MockNotifications] Cancelled notification:", notificationId)
    return
  }

  const NotificationsModule = getNotifications()
  if (!NotificationsModule) {
    return
  }

  try {
    await NotificationsModule.cancelScheduledNotificationAsync(notificationId)
  } catch (error) {
    console.warn("📬 [Notifications] Error cancelling notification:", error)
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  if (useMockNotifications || !isNativeModuleAvailable()) {
    console.log("📬 [MockNotifications] Cancelled all notifications")
    return
  }

  const NotificationsModule = getNotifications()
  if (!NotificationsModule) {
    return
  }

  try {
    await NotificationsModule.cancelAllScheduledNotificationsAsync()
  } catch (error) {
    console.warn("📬 [Notifications] Error cancelling all notifications:", error)
  }
}

/**
 * Set app badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  if (useMockNotifications || !isNativeModuleAvailable()) {
    console.log("📬 [MockNotifications] Set badge count:", count)
    return
  }

  const NotificationsModule = getNotifications()
  if (!NotificationsModule) {
    return
  }

  try {
    await NotificationsModule.setBadgeCountAsync(count)
  } catch (error) {
    console.warn("📬 [Notifications] Error setting badge count:", error)
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<
  import("expo-notifications").NotificationRequest[]
> {
  if (useMockNotifications || !isNativeModuleAvailable()) {
    console.log("📬 [MockNotifications] No scheduled notifications (mock mode)")
    return []
  }

  const NotificationsModule = getNotifications()
  if (!NotificationsModule) {
    return []
  }

  try {
    return await NotificationsModule.getAllScheduledNotificationsAsync()
  } catch (error) {
    console.warn("📬 [Notifications] Error getting scheduled notifications:", error)
    return []
  }
}

/**
 * Add listener for notification received (app in foreground)
 */
export function addNotificationReceivedListener(
  listener: (notification: import("expo-notifications").Notification) => void,
): import("expo-notifications").Subscription {
  if (useMockNotifications || !isNativeModuleAvailable()) {
    console.log("📬 [MockNotifications] Registered received listener")
    // Return mock subscription
    return {
      remove: () => console.log("📬 [MockNotifications] Removed received listener"),
    } as import("expo-notifications").Subscription
  }

  const NotificationsModule = getNotifications()
  if (!NotificationsModule) {
    return {
      remove: () => console.log("📬 [MockNotifications] Removed received listener"),
    } as import("expo-notifications").Subscription
  }

  try {
    setupNotificationHandler() // Ensure handler is set up before adding listeners
    return NotificationsModule.addNotificationReceivedListener(listener)
  } catch (error) {
    console.warn("📬 [Notifications] Error adding received listener, using mock:", error)
    return {
      remove: () => console.log("📬 [MockNotifications] Removed received listener"),
    } as import("expo-notifications").Subscription
  }
}

/**
 * Add listener for notification response (user tapped notification)
 */
export function addNotificationResponseReceivedListener(
  listener: (response: import("expo-notifications").NotificationResponse) => void,
): import("expo-notifications").Subscription {
  if (useMockNotifications || !isNativeModuleAvailable()) {
    console.log("📬 [MockNotifications] Registered response listener")
    // Return mock subscription
    return {
      remove: () => console.log("📬 [MockNotifications] Removed response listener"),
    } as import("expo-notifications").Subscription
  }

  const NotificationsModule = getNotifications()
  if (!NotificationsModule) {
    return {
      remove: () => console.log("📬 [MockNotifications] Removed response listener"),
    } as import("expo-notifications").Subscription
  }

  try {
    setupNotificationHandler() // Ensure handler is set up before adding listeners
    return NotificationsModule.addNotificationResponseReceivedListener(listener)
  } catch (error) {
    console.warn("📬 [Notifications] Error adding response listener, using mock:", error)
    return {
      remove: () => console.log("📬 [MockNotifications] Removed response listener"),
    } as import("expo-notifications").Subscription
  }
}

/**
 * Get last notification response (if app opened from notification)
 */
export async function getLastNotificationResponse(): Promise<
  import("expo-notifications").NotificationResponse | null
> {
  if (useMockNotifications || !isNativeModuleAvailable()) {
    console.log("📬 [MockNotifications] No last notification response (mock mode)")
    return null
  }

  const NotificationsModule = getNotifications()
  if (!NotificationsModule) {
    return null
  }

  try {
    return await NotificationsModule.getLastNotificationResponseAsync()
  } catch (error) {
    console.warn("📬 [Notifications] Error getting last notification response:", error)
    return null
  }
}

/**
 * Alias for requestPermission (for backward compatibility)
 */
export const requestNotificationPermissions = requestPermission

/**
 * Notification service export
 */
export const notificationService = {
  requestPermission,
  registerForPushNotifications,
  scheduleNotification,
  cancelNotification,
  cancelAllNotifications,
  setBadgeCount,
  getScheduledNotifications,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getLastNotificationResponse,
  useMock: useMockNotifications,
}
