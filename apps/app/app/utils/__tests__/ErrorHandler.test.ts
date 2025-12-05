/**
 * Error Handler Tests
 */

import { errorHandler, ErrorCategory } from "../ErrorHandler"

describe("ErrorHandler", () => {
  it("classifies network errors", () => {
    const error = new Error("Network request failed")
    const result = errorHandler.handle(error)
    expect(result.category).toBe(ErrorCategory.NETWORK)
    expect(result.retryable).toBe(true)
  })

  it("classifies auth errors", () => {
    const error = new Error("Unauthorized")
    const result = errorHandler.handle(error)
    expect(result.category).toBe(ErrorCategory.AUTH)
    expect(result.retryable).toBe(false)
  })

  it("classifies server errors", () => {
    const error = new Error("Internal server error 500")
    const result = errorHandler.handle(error)
    expect(result.category).toBe(ErrorCategory.SERVER)
    expect(result.retryable).toBe(true)
  })

  it("provides user-friendly messages", () => {
    const error = new Error("Network timeout")
    const result = errorHandler.handle(error)
    expect(result.userMessage).toBeTruthy()
    expect(result.userMessage).not.toContain("timeout") // Should be user-friendly
  })

  it("gets recovery strategy for network errors", () => {
    const error = errorHandler.createError("Network error", ErrorCategory.NETWORK)
    const strategy = errorHandler.getRecoveryStrategy(error)
    expect(strategy.shouldRetry).toBe(true)
    expect(strategy.retryDelay).toBeDefined()
  })
})
