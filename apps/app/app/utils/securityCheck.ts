/**
 * Security Configuration Check
 *
 * Validates that security features are properly configured
 * Run this during app initialization to ensure security is enabled
 */

import { logger } from "./Logger"
import { certificatePinning } from "../services/certificatePinning"

interface SecurityCheckResult {
  certificatePinning: {
    enabled: boolean
    configured: boolean
    message: string
  }
  environment: {
    isProduction: boolean
    isDevelopment: boolean
    message: string
  }
  overall: {
    status: "secure" | "warning" | "error"
    message: string
  }
}

/**
 * Run security configuration checks
 */
export function runSecurityChecks(): SecurityCheckResult {
  const isProduction = !__DEV__
  const isDevelopment = __DEV__

  // Check certificate pinning
  const pinningEnabled = certificatePinning.isEnabled()
  const pinningConfigured = pinningEnabled

  const result: SecurityCheckResult = {
    certificatePinning: {
      enabled: pinningEnabled,
      configured: pinningConfigured,
      message: pinningEnabled
        ? "Certificate pinning is enabled"
        : isProduction
          ? "⚠️ Certificate pinning is not configured - recommended for production"
          : "Certificate pinning disabled (development mode)",
    },
    environment: {
      isProduction,
      isDevelopment,
      message: isProduction ? "Running in production mode" : "Running in development mode",
    },
    overall: {
      status: "secure",
      message: "Security checks passed",
    },
  }

  // Determine overall status
  if (isProduction && !pinningConfigured) {
    result.overall.status = "warning"
    result.overall.message = "Production mode detected but certificate pinning not configured"
  } else if (isProduction && pinningConfigured) {
    result.overall.status = "secure"
    result.overall.message = "All security checks passed"
  } else {
    result.overall.status = "secure"
    result.overall.message = "Development mode - security checks passed"
  }

  return result
}

/**
 * Log security check results
 */
export function logSecurityChecks(): void {
  const checks = runSecurityChecks()

  if (__DEV__) {
    logger.debug("Security Configuration Check", {
      certificatePinning: checks.certificatePinning,
      environment: checks.environment,
      overall: checks.overall,
    })
  } else {
    // In production, only log warnings or errors
    if (checks.overall.status === "warning" || checks.overall.status === "error") {
      logger.warn("Security Configuration Warning", {
        certificatePinning: checks.certificatePinning,
        overall: checks.overall,
      })
    } else {
      logger.info("Security checks passed", {
        overall: checks.overall,
      })
    }
  }
}

/**
 * Security utilities
 */
export const securityCheck = {
  run: runSecurityChecks,
  log: logSecurityChecks,
}

