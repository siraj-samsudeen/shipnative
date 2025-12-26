/**
 * Format Auth Error Tests
 */

import { formatAuthError } from "../formatAuthError"

describe("formatAuthError", () => {
  it("returns empty string for email not confirmed", () => {
    const error = new Error("Email not confirmed")
    const result = formatAuthError(error)
    expect(result).toBe("")
  })

  it("formats network errors", () => {
    const error = new Error("Network request failed")
    const result = formatAuthError(error)
    expect(result).toContain("Network error")
  })

  it("formats invalid credentials", () => {
    const error = new Error("Invalid login credentials")
    const result = formatAuthError(error)
    expect(result).toContain("Invalid email or password")
  })

  it("formats email not found", () => {
    const error = new Error("Email not found")
    const result = formatAuthError(error)
    expect(result).toContain("Email not found")
  })

  it("formats already registered errors", () => {
    const error = new Error("User already registered")
    const result = formatAuthError(error)
    expect(result).toContain("already registered")
  })

  it("formats rate limit errors", () => {
    const error = new Error("Too many sign-in attempts. Please try again in 5 minutes.")
    const result = formatAuthError(error)
    expect(result).toContain("Too many")
  })

  it("returns generic error for unknown errors", () => {
    const error = new Error("Unknown error")
    const result = formatAuthError(error)
    expect(result).toBe("Unknown error")
  })

  it("handles errors without message", () => {
    const error = new Error("")
    const result = formatAuthError(error)
    expect(result).toContain("unexpected error")
  })
})


