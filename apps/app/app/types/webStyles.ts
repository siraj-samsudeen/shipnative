/**
 * Web Style Types
 *
 * Type definitions for web-specific style values to avoid `as unknown as number` assertions
 */

/**
 * Web dimension values that React Native accepts on web
 */
export type WebDimension = number | string | "100%" | "100vh" | "100vw"

/**
 * Web overflow values
 */
export type WebOverflow = "visible" | "hidden" | "scroll" | "auto"

/**
 * Helper to safely cast web dimension values
 * Use this instead of `as unknown as number` for web-specific styles
 */
export function webDimension(value: WebDimension): number {
  if (typeof value === "number") {
    return value
  }
  // For web, React Native accepts string values, but TypeScript needs number
  // This is a type-safe way to handle the web/mobile difference
  return value as unknown as number
}

/**
 * Helper to safely cast web overflow values
 * Note: React Native ViewStyle only accepts "visible" | "hidden" | "scroll", but web supports "auto"
 */
export function webOverflow(value: WebOverflow): "visible" | "hidden" | "scroll" {
  // Map "auto" to "scroll" for React Native compatibility
  if (value === "auto") {
    return "scroll"
  }
  return value as unknown as "visible" | "hidden" | "scroll"
}
