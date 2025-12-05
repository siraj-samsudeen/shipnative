/**
 * Auth Flow Integration Tests
 *
 * Tests for complete authentication flows
 */

import { act, renderHook, waitFor } from "@testing-library/react-native"

import * as supabaseService from "../../services/supabase"
import { useAuthStore } from "../../stores/auth"

// Mock Supabase
jest.mock("../../services/supabase")

describe("Auth Flow Integration", () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    // Reset store state
    const { result } = renderHook(() => useAuthStore())
    await act(async () => {
      await result.current.signOut()
    })
  })

  describe("Sign Up → Email Verification → Sign In", () => {
    it("should complete full sign up flow", async () => {
      const { result } = renderHook(() => useAuthStore())

      // Step 1: Sign up
      const mockUser = { id: "123", email: "new@example.com", email_confirmed_at: null }
      ;(supabaseService.supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      })

      let signUpResult: any
      await act(async () => {
        signUpResult = await result.current.signUp("new@example.com", "password123")
      })
      expect(signUpResult.error).toBeUndefined()
      await waitFor(() => {
        expect(result.current.user?.email).toBe("new@example.com")
        expect(result.current.isEmailConfirmed).toBe(false)
      })

      // Step 2: Verify email
      const confirmedUser = { ...mockUser, email_confirmed_at: new Date().toISOString() }
      const mockSession = { user: confirmedUser, access_token: "token" }
      ;(supabaseService.supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { user: confirmedUser, session: mockSession },
        error: null,
      })

      let verifyResult: any
      await act(async () => {
        verifyResult = await result.current.verifyEmail("verification-code")
      })
      expect(verifyResult.error).toBeUndefined()
      await waitFor(() => {
        expect(result.current.isEmailConfirmed).toBe(true)
        expect(result.current.isAuthenticated).toBe(true)
      })

      // Step 3: Sign in (should work now)
      ;(supabaseService.supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: confirmedUser, session: mockSession },
        error: null,
      })

      let signInResult: any
      await act(async () => {
        signInResult = await result.current.signIn("new@example.com", "password123")
      })
      expect(signInResult.error).toBeUndefined()
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })
    })
  })

  describe("Error Scenarios", () => {
    it("should handle network errors during sign up", async () => {
      const { result } = renderHook(() => useAuthStore())

      ;(supabaseService.supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error("Network request failed"),
      })

      const signUpResult = await result.current.signUp("test@example.com", "password123")
      expect(signUpResult.error).toBeDefined()
    })
  })
})
