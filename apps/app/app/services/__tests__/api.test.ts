/**
 * API Service Tests
 *
 * Tests for API client configuration and error handling
 */

import type { ApiResponse } from "apisauce"

import { getGeneralApiProblem } from "../api/apiProblem"

describe("API Service", () => {
  describe("getGeneralApiProblem", () => {
    it("handles connection errors", () => {
      const response = { problem: "CONNECTION_ERROR" } as ApiResponse<any>
      const result = getGeneralApiProblem(response)
      expect(result?.kind).toBe("cannot-connect")
      if (result && "temporary" in result) {
        expect(result.temporary).toBe(true)
      }
    })

    it("handles timeout errors", () => {
      const response = { problem: "TIMEOUT_ERROR" } as ApiResponse<any>
      const result = getGeneralApiProblem(response)
      expect(result?.kind).toBe("timeout")
      if (result && "temporary" in result) {
        expect(result.temporary).toBe(true)
      }
    })

    it("handles 401 unauthorized", () => {
      const response = { problem: "CLIENT_ERROR", status: 401 } as ApiResponse<any>
      const result = getGeneralApiProblem(response)
      expect(result?.kind).toBe("unauthorized")
    })

    it("handles 404 not found", () => {
      const response = { problem: "CLIENT_ERROR", status: 404 } as ApiResponse<any>
      const result = getGeneralApiProblem(response)
      expect(result?.kind).toBe("not-found")
    })

    it("handles server errors", () => {
      const response = { problem: "SERVER_ERROR" } as ApiResponse<any>
      const result = getGeneralApiProblem(response)
      expect(result?.kind).toBe("server")
    })
  })
})
