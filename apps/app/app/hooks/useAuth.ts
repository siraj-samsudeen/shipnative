import { useState, useEffect, useCallback } from "react"
import { Platform } from "react-native"
import * as Linking from "expo-linking"

import { supabase } from "../services/supabase"
import type { User, Session, SignUpCredentials, SignInCredentials } from "../types/auth"
import { logger } from "../utils/Logger"

// Conditionally import expo-web-browser only on native platforms
const getWebBrowser = () => {
  if (Platform.OS === "web") {
    return null
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-web-browser")
  } catch {
    console.warn("expo-web-browser not available, falling back to Linking")
    return null
  }
}

const WebBrowser = getWebBrowser()

export interface UseAuthReturn {
  // State
  user: User | null
  session: Session | null
  loading: boolean

  // Methods
  signUp: (credentials: SignUpCredentials) => Promise<{ error: Error | null }>
  signIn: (credentials: SignInCredentials) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signInWithApple: () => Promise<{ error: Error | null }>
  signInWithMagicLink: (email: string, captchaToken?: string) => Promise<{ error: Error | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updateUser: (attributes: {
    email?: string
    password?: string
    data?: Record<string, any>
  }) => Promise<{ error: Error | null }>

  // Helpers
  isAuthenticated: boolean
}

/**
 * Hook for authentication
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    setLoading(true)
    const { error } = await supabase.auth.signUp(credentials)
    setLoading(false)
    return { error }
  }, [])

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword(credentials)
    setLoading(false)
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setLoading(false)
    return { error }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setLoading(false)
    return { error }
  }, [])

  const updateUser = useCallback(
    async (attributes: { email?: string; password?: string; data?: Record<string, any> }) => {
      setLoading(true)
      const { error } = await (supabase.auth as any).updateUser(attributes)
      setLoading(false)
      return { error }
    },
    [],
  )

  const signInWithGoogle = useCallback(async () => {
    setLoading(true)
    try {
      let redirectTo: string | undefined

      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          redirectTo = `${window.location.origin}/auth/callback`
        }
      } else {
        redirectTo = Linking.createURL("/auth/callback")
      }

      const { data, error } = await (supabase.auth as any).signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== "web",
        },
      })

      if (error) {
        return { error }
      }

      if (Platform.OS !== "web" && data?.url) {
        if (WebBrowser) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

          if (result.type === "success" && result.url) {
            const urlStr = result.url
            const getParam = (name: string) => {
              const regex = new RegExp(`[?&|#]${name}=([^&|#]*)`)
              const match = urlStr.match(regex)
              return match ? decodeURIComponent(match[1]) : null
            }

            const accessToken = getParam("access_token")
            const refreshToken = getParam("refresh_token")
            const code = getParam("code")

            if (code) {
              const { data: sessionData, error: sessionError } = await (
                supabase.auth as any
              ).exchangeCodeForSession(code)
              if (sessionError) {
                logger.error("[useAuth] Failed to exchange code for session", { error: sessionError.message }, sessionError)
                return { error: sessionError }
              }
              setSession(sessionData.session)
              setUser(sessionData.user)
            } else if (accessToken && refreshToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              })
              if (sessionError) {
                return { error: sessionError }
              }
            }
          } else if (result.type === "cancel") {
            return { error: new Error("OAuth flow cancelled") }
          }
        } else {
          const canOpen = await Linking.canOpenURL(data.url)
          if (canOpen) {
            await Linking.openURL(data.url)
          } else {
            return { error: new Error("Unable to open OAuth URL") }
          }
        }
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    } finally {
      if (Platform.OS === "web") {
        setLoading(false)
      }
    }
  }, [])

  const signInWithApple = useCallback(async () => {
    setLoading(true)
    try {
      let redirectTo: string | undefined

      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          redirectTo = `${window.location.origin}/auth/callback`
        }
      } else {
        redirectTo = Linking.createURL("/auth/callback")
      }

      const { data, error } = await (supabase.auth as any).signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== "web",
        },
      })

      if (error) {
        return { error }
      }

      if (Platform.OS !== "web" && data?.url) {
        if (WebBrowser) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

          if (result.type === "success" && result.url) {
            const urlStr = result.url
            const getParam = (name: string) => {
              const regex = new RegExp(`[?&|#]${name}=([^&|#]*)`)
              const match = urlStr.match(regex)
              return match ? decodeURIComponent(match[1]) : null
            }

            const accessToken = getParam("access_token")
            const refreshToken = getParam("refresh_token")
            const code = getParam("code")

            if (code) {
              const { data: sessionData, error: sessionError } = await (
                supabase.auth as any
              ).exchangeCodeForSession(code)
              if (sessionError) {
                logger.error("[useAuth] Failed to exchange code for session (Apple)", { error: sessionError.message }, sessionError)
                return { error: sessionError }
              }
              setSession(sessionData.session)
              setUser(sessionData.user)
            } else if (accessToken && refreshToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              })
              if (sessionError) {
                return { error: sessionError }
              }
            }
          } else if (result.type === "cancel") {
            return { error: new Error("OAuth flow cancelled") }
          }
        } else {
          const canOpen = await Linking.canOpenURL(data.url)
          if (canOpen) {
            await Linking.openURL(data.url)
          } else {
            return { error: new Error("Unable to open OAuth URL") }
          }
        }
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    } finally {
      if (Platform.OS === "web") {
        setLoading(false)
      }
    }
  }, [])

  const signInWithMagicLink = useCallback(async (email: string, captchaToken?: string) => {
    setLoading(true)
    try {
      const { error } = await (supabase.auth as any).signInWithOtp({
        email,
        options: {
          emailRedirectTo: undefined,
          ...(captchaToken ? { captchaToken } : {}),
        },
      })
      return { error }
    } finally {
      setLoading(false)
    }
  }, [])

  const verifyOtp = useCallback(async (email: string, token: string) => {
    setLoading(true)
    const { data, error } = await (supabase.auth as any).verifyOtp({
      email,
      token,
      type: "email",
    })
    if (!error && data?.session) {
      const { session } = data
      setSession(session)
      setUser(session?.user ?? null)
    }
    setLoading(false)
    return { error }
  }, [])

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signInWithMagicLink,
    verifyOtp,
    signOut,
    resetPassword,
    updateUser,
    isAuthenticated: !!session,
  }
}
