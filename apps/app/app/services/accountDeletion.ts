import { useAuthStore, useSubscriptionStore } from "@/stores"
import { GUEST_USER_KEY } from "@/stores/auth"
import type { Session } from "@/types/auth"

import { mockSupabaseHelpers } from "./mocks/supabase"
import { supabase, supabaseKey, supabaseUrl, isUsingMockSupabase } from "./supabase"

async function deleteSupabaseAccount(session: Session) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase is not configured for account deletion")
  }

  try {
    // Prefer edge function when deployed (best-practice path)
    if ((supabase as any).functions?.invoke) {
      const { error } = await (supabase as any).functions.invoke("delete-user", {
        body: { userId: session.user.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!error) return
    }

    // Fallback to direct Supabase Auth delete endpoint
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "DELETE",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (response.ok) return

    let message = `Account deletion failed (${response.status})`
    try {
      const errorBody = await response.json()
      message = errorBody?.error_description || errorBody?.message || errorBody?.error || message
    } catch {
      // Ignore JSON parsing errors
    }

    throw new Error(message)
  } catch (error) {
    throw error instanceof Error ? error : new Error("Unable to delete account")
  }
}

async function clearSubscriptionState() {
  const subscriptionState = useSubscriptionStore.getState()

  try {
    const service = subscriptionState.getActiveService()
    await service.logOut()
  } catch (error) {
    console.warn("Failed to log out of subscription service", error)
  }

  subscriptionState.setCustomerInfo(null)
  subscriptionState.setWebSubscriptionInfo(null)
  subscriptionState.setPackages([])
  subscriptionState.checkProStatus()
}

function resetAuthState(userId: string) {
  useAuthStore.setState((state) => {
    // Remove onboarding entry for the deleted user while preserving guest state
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [userId]: _removed, ...onboardingStatusByUserId } = state.onboardingStatusByUserId
    const guestOnboarding =
      onboardingStatusByUserId[GUEST_USER_KEY] ?? state.onboardingStatusByUserId[GUEST_USER_KEY]
    return {
      session: null,
      user: null,
      isAuthenticated: false,
      hasCompletedOnboarding: guestOnboarding ?? true,
      onboardingStatusByUserId: {
        ...onboardingStatusByUserId,
        [GUEST_USER_KEY]: guestOnboarding ?? true,
      },
      loading: false,
    }
  })
}

export async function deleteAccount(): Promise<{ error?: Error }> {
  const { user } = useAuthStore.getState()

  if (!user) {
    return { error: new Error("No active user to delete") }
  }

  useAuthStore.setState({ loading: true })

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      throw sessionError || new Error("Unable to verify your session. Please sign in again.")
    }

    if (isUsingMockSupabase) {
      const removed = await mockSupabaseHelpers.deleteUser(user.id)
      if (!removed) {
        throw new Error("Unable to delete mock account")
      }
    } else {
      await deleteSupabaseAccount(session as Session)
    }

    await clearSubscriptionState()
    await supabase.auth.signOut()
    resetAuthState(user.id)

    return {}
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Unable to delete account"),
    }
  } finally {
    useAuthStore.setState({ loading: false })
  }
}
