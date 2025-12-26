/**
 * Validation Tests
 */

import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  analyzePasswordStrength,
} from "../validation"

describe("validateEmail", () => {
  it("validates correct email", () => {
    const result = validateEmail("test@example.com")
    expect(result.isValid).toBe(true)
  })

  it("rejects invalid email", () => {
    const result = validateEmail("invalid-email")
    expect(result.isValid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it("rejects empty email", () => {
    const result = validateEmail("")
    expect(result.isValid).toBe(false)
  })
})

describe("validatePassword", () => {
  it("validates strong password", () => {
    const result = validatePassword("StrongPass123!")
    expect(result.isValid).toBe(true)
  })

  it("rejects short password", () => {
    const result = validatePassword("Short1!")
    expect(result.isValid).toBe(false)
  })

  it("rejects password without uppercase", () => {
    const result = validatePassword("lowercase123!")
    expect(result.isValid).toBe(false)
  })

  it("rejects password without special character", () => {
    const result = validatePassword("NoSpecial123")
    expect(result.isValid).toBe(false)
  })
})

describe("validatePasswordConfirmation", () => {
  it("validates matching passwords", () => {
    const result = validatePasswordConfirmation("Password123!", "Password123!")
    expect(result.isValid).toBe(true)
  })

  it("rejects non-matching passwords", () => {
    const result = validatePasswordConfirmation("Password123!", "Different123!")
    expect(result.isValid).toBe(false)
  })
})

describe("analyzePasswordStrength", () => {
  it("analyzes weak password", () => {
    const result = analyzePasswordStrength("weak")
    expect(result.score).toBeLessThan(2)
    expect(result.label).toBe("weak")
  })

  it("analyzes strong password", () => {
    const result = analyzePasswordStrength("StrongPass123!")
    expect(result.score).toBeGreaterThanOrEqual(3)
    expect(result.label).toBe("strong")
  })

  it("provides feedback for weak passwords", () => {
    const result = analyzePasswordStrength("weak")
    expect(result.feedback.length).toBeGreaterThan(0)
  })
})


