/**
 * Web Storage Encryption Utility
 *
 * Provides basic encryption for sensitive data stored in localStorage on web platform.
 * This is a defense-in-depth measure - sensitive data should ideally be stored server-side
 * or in secure HTTP-only cookies.
 *
 * Note: This uses a simple obfuscation method. For production apps handling highly
 * sensitive data, consider using a proper encryption library or storing data server-side.
 */

/**
 * Simple obfuscation for web storage (not cryptographically secure, but better than plaintext)
 * For production apps with sensitive data, use proper encryption or server-side storage
 */
function obfuscate(data: string): string {
  // Simple XOR obfuscation with a key derived from the data itself
  // This is NOT cryptographically secure but provides basic obfuscation
  const key = "shipnative_secure_storage_key_2024"
  let result = ""
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    result += String.fromCharCode(charCode)
  }
  return btoa(result) // Base64 encode
}

/**
 * De-obfuscate data
 */
function deobfuscate(obfuscated: string): string {
  try {
    const data = atob(obfuscated) // Base64 decode
    const key = "shipnative_secure_storage_key_2024"
    let result = ""
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      result += String.fromCharCode(charCode)
    }
    return result
  } catch {
    throw new Error("Failed to deobfuscate data")
  }
}

/**
 * Secure storage adapter for web platform
 * Encrypts sensitive data before storing in localStorage
 */
export const webSecureStorage = {
  /**
   * Store encrypted value
   */
  setItem(key: string, value: string): void {
    try {
      if (typeof localStorage === "undefined") {
        return
      }
      const encrypted = obfuscate(value)
      localStorage.setItem(`secure_${key}`, encrypted)
    } catch (error) {
      console.warn("[WebSecureStorage] Failed to store encrypted value", error)
    }
  },

  /**
   * Retrieve and decrypt value
   */
  getItem(key: string): string | null {
    try {
      if (typeof localStorage === "undefined") {
        return null
      }
      const encrypted = localStorage.getItem(`secure_${key}`)
      if (!encrypted) {
        return null
      }
      return deobfuscate(encrypted)
    } catch (error) {
      console.warn("[WebSecureStorage] Failed to retrieve encrypted value", error)
      return null
    }
  },

  /**
   * Remove encrypted value
   */
  removeItem(key: string): void {
    try {
      if (typeof localStorage === "undefined") {
        return
      }
      localStorage.removeItem(`secure_${key}`)
    } catch (error) {
      console.warn("[WebSecureStorage] Failed to remove encrypted value", error)
    }
  },
}

