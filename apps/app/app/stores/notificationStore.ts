import type * as Notifications from "expo-notifications"
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

import {
  requestPermission,
  registerForPushNotifications,
  scheduleNotification,
  cancelNotification,
  cancelAllNotifications,
  setBadgeCount as setAppBadgeCount,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getLastNotificationResponse,
  type LocalNotificationInput,
} from "@/services/notifications"
import { syncPushNotificationsPreference } from "@/services/preferencesSync"
import { storage } from "@/utils/storage"

export interface NotificationState {
  // Permission status
  permissionStatus: "granted" | "denied" | "undetermined" | "loading"

  // Push token
  pushToken: string | null

  // Notifications history (limited to last 50)
  notifications: Array<{
    id: string
    title: string
    body: string
    data?: Record<string, unknown>
    receivedAt: string
    read: boolean
  }>

  // Unread count
  unreadCount: number

  // Badge count
  badgeCount: number

  // Push enabled preference
  isPushEnabled: boolean

  // Actions
  initialize: () => Promise<void>
  togglePush: (userId?: string) => Promise<void>
  requestPermission: () => Promise<boolean>
  registerForPush: () => Promise<void>
  scheduleNotification: (input: LocalNotificationInput) => Promise<string>
  cancelNotification: (id: string) => Promise<void>
  cancelAllNotifications: () => Promise<void>
  setBadgeCount: (count: number) => Promise<void>
  clearBadge: () => Promise<void>
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  addNotification: (notification: {
    id: string
    title: string
    body: string
    data?: Record<string, unknown>
  }) => void
  handleNotificationResponse: (response: Notifications.NotificationResponse) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      permissionStatus: "undetermined",
      pushToken: null,
      notifications: [],
      unreadCount: 0,
      badgeCount: 0,
      isPushEnabled: false,

      initialize: async () => {
        // Request permission status
        const { status } = await requestPermission()
        set({ permissionStatus: status })

        // If granted, register for push
        if (status === "granted") {
          await get().registerForPush()
        }

        // Check if app was opened from notification
        const lastResponse = await getLastNotificationResponse()
        if (lastResponse) {
          get().handleNotificationResponse(lastResponse)
        }

        // Listen for notifications while app is open
        addNotificationReceivedListener((notification) => {
          const { request } = notification
          get().addNotification({
            id: request.identifier,
            title: request.content.title || "",
            body: request.content.body || "",
            data: request.content.data,
          })
        })

        // Listen for notification taps
        addNotificationResponseReceivedListener((response) => {
          get().handleNotificationResponse(response)
        })
      },

      togglePush: async (userId?: string) => {
        const { isPushEnabled, requestPermission } = get()
        let newValue: boolean

        if (isPushEnabled) {
          newValue = false
          set({ isPushEnabled: false })
        } else {
          const granted = await requestPermission()
          if (granted) {
            newValue = true
            set({ isPushEnabled: true })
          } else {
            return // Permission denied, don't sync
          }
        }

        // Sync to database (fire-and-forget)
        if (userId) {
          syncPushNotificationsPreference(userId, newValue)
        }
      },

      requestPermission: async () => {
        set({ permissionStatus: "loading" })
        const { status } = await requestPermission()
        set({ permissionStatus: status })

        if (status === "granted") {
          await get().registerForPush()
          return true
        }

        return false
      },

      registerForPush: async () => {
        const token = await registerForPushNotifications()
        set({ pushToken: token })
      },

      scheduleNotification: async (input: LocalNotificationInput) => {
        return await scheduleNotification(input)
      },

      cancelNotification: async (id: string) => {
        await cancelNotification(id)
      },

      cancelAllNotifications: async () => {
        await cancelAllNotifications()
      },

      setBadgeCount: async (count: number) => {
        await setAppBadgeCount(count)
        set({ badgeCount: count })
      },

      clearBadge: async () => {
        await get().setBadgeCount(0)
      },

      markAsRead: (id: string) => {
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          )
          const unreadCount = notifications.filter((n) => !n.read).length
          return { notifications, unreadCount }
        })

        // Update badge
        get().setBadgeCount(get().unreadCount)
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }))
        get().clearBadge()
      },

      addNotification: (notification) => {
        set((state) => {
          // Add new notification
          const newNotification = {
            ...notification,
            receivedAt: new Date().toISOString(),
            read: false,
          }

          // Keep only last 50 notifications
          const notifications = [newNotification, ...state.notifications].slice(0, 50)
          const unreadCount = notifications.filter((n) => !n.read).length

          return { notifications, unreadCount }
        })

        // Update badge
        get().setBadgeCount(get().unreadCount)
      },

      handleNotificationResponse: (response) => {
        const { notification } = response
        const { request } = notification
        const data = request.content.data

        // Mark as read
        get().markAsRead(request.identifier)

        // Handle deep linking (if data.screen is provided)
        if (data?.screen) {
          console.log("📬 [Notifications] Deep linking to screen:", data.screen)
          // Deep linking will be handled by navigation listener
        }
      },
    }),
    {
      name: "notification-storage",
      storage: createJSONStorage(() => ({
        getItem: (key) => storage.getString(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      })),
      partialize: (state) => ({
        // Don't persist listeners
        permissionStatus: state.permissionStatus,
        pushToken: state.pushToken,
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        badgeCount: state.badgeCount,
        isPushEnabled: state.isPushEnabled,
      }),
    },
  ),
)
