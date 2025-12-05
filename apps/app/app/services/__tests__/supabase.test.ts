/**
 * Supabase Service Tests
 *
 * Tests for Supabase client initialization and mock fallback
 */

import { supabase, isUsingMockSupabase } from "../supabase"

describe("Supabase Service", () => {
  it("should initialize supabase client", () => {
    expect(supabase).toBeDefined()
    expect(supabase.auth).toBeDefined()
  })

  it("should use mock when credentials are missing in dev", () => {
    // In dev mode without credentials, should use mock
    if (
      __DEV__ &&
      (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    ) {
      expect(isUsingMockSupabase).toBe(true)
    }
  })

  it("should have auth methods", () => {
    expect(supabase.auth.signInWithPassword).toBeDefined()
    expect(supabase.auth.signUp).toBeDefined()
    expect(supabase.auth.signOut).toBeDefined()
  })
})

