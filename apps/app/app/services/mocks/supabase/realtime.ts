/**
 * Mock Supabase Realtime
 *
 * Mock implementation of Supabase realtime subscriptions
 */

import type { RealtimeEvent, RealtimeCallback, RealtimeSubscription } from "./types"
import { sharedState } from "./types"
import { logger } from "../../../utils/Logger"

let _realtimeChannelCounter = 0

export class MockRealtimeChannel {
  private channelName: string
  private subscriptions: RealtimeSubscription[] = []
  private isSubscribed = false

  constructor(channelName: string) {
    this.channelName = channelName
    _realtimeChannelCounter++
  }

  on(
    event: "postgres_changes",
    config: { event: RealtimeEvent; schema: string; table: string; filter?: string },
    callback: RealtimeCallback,
  ): MockRealtimeChannel {
    this.subscriptions.push({
      table: config.table,
      event: config.event,
      callback,
      filter: config.filter,
    })

    if (__DEV__) {
      logger.debug(`[MockRealtime] Registered listener`, {
        table: config.table,
        event: config.event,
      })
    }

    return this
  }

  subscribe(
    callback?: (status: "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT") => void,
  ): MockRealtimeChannel {
    this.isSubscribed = true

    // Store subscriptions globally
    sharedState.realtimeSubscriptions.set(this.channelName, this.subscriptions)

    if (__DEV__) {
      logger.debug(`[MockRealtime] Subscribed to channel`, { channel: this.channelName })
    }

    // Simulate async subscription confirmation
    setTimeout(() => {
      callback?.("SUBSCRIBED")
    }, 100)

    return this
  }

  unsubscribe(): Promise<"ok" | "error"> {
    this.isSubscribed = false
    sharedState.realtimeSubscriptions.delete(this.channelName)

    if (__DEV__) {
      logger.debug(`[MockRealtime] Unsubscribed from channel`, { channel: this.channelName })
    }

    return Promise.resolve("ok")
  }
}

export class MockRealtime {
  channel(name: string): MockRealtimeChannel {
    return new MockRealtimeChannel(name)
  }

  removeChannel(channel: MockRealtimeChannel): Promise<"ok" | "error"> {
    return channel.unsubscribe()
  }

  removeAllChannels(): Promise<Array<"ok" | "error">> {
    const results: Array<"ok" | "error"> = []
    sharedState.realtimeSubscriptions.clear()

    if (__DEV__) {
      logger.debug(`[MockRealtime] Removed all channels`)
    }

    return Promise.resolve(results)
  }
}

// Helper to trigger realtime events (for testing)
export function triggerRealtimeEvent(
  table: string,
  eventType: RealtimeEvent,
  newData: any,
  oldData: any = null,
) {
  sharedState.realtimeSubscriptions.forEach((subscriptions) => {
    subscriptions.forEach((sub) => {
      if (sub.table === table && (sub.event === eventType || sub.event === "*")) {
        // Check filter if present
        if (sub.filter) {
          const [column, operator, value] = sub.filter.split(/[=<>]/).map((s) => s.trim())
          if (operator === "eq" && newData[column] !== value) {
            return
          }
        }

        sub.callback({
          eventType,
          new: newData,
          old: oldData,
          schema: "public",
          table,
        })
      }
    })
  })
}


