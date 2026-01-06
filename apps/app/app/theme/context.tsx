/**
 * Theme Context - Simplified wrapper around Unistyles
 *
 * This context has been simplified to only manage theme persistence and syncing.
 * All theme styling now uses Unistyles directly via `useUnistyles()`.
 *
 * Migration note: The old `useAppTheme()` hook has been removed.
 * Use `useUnistyles()` and `UnistylesRuntime` directly instead.
 */
import { FC, PropsWithChildren, useCallback, useEffect } from "react"
import { UnistylesRuntime } from "react-native-unistyles"

import { syncDarkModePreference } from "@/services/preferencesSync"
import { useAuthStore } from "@/stores/auth"
import { storage, useMMKVString } from "@/utils/storage"

const THEME_STORAGE_KEY = "shipnative.themeScheme"

export interface ThemeProviderProps {
  initialContext?: "light" | "dark"
}

/**
 * ThemeProvider manages theme persistence and syncing with the database.
 * All theme styling should use Unistyles directly via `useUnistyles()`.
 *
 * @example
 * // Get theme in components
 * import { useUnistyles, UnistylesRuntime } from "react-native-unistyles"
 *
 * const { theme } = useUnistyles()
 * const isDark = UnistylesRuntime.themeName === "dark"
 *
 * // Change theme
 * UnistylesRuntime.setTheme("dark")
 */
export const ThemeProvider: FC<PropsWithChildren<ThemeProviderProps>> = ({
  children,
  initialContext,
}) => {
  // Our saved theme context: can be "light", "dark", or undefined (system theme)
  const [themeScheme, setThemeScheme] = useMMKVString(THEME_STORAGE_KEY, storage)

  // Get user ID for syncing preferences to database
  const userId = useAuthStore((state) => state.user?.id)

  // Initialize Unistyles theme on mount
  useEffect(() => {
    const savedTheme = initialContext || themeScheme

    if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
      // User has a saved preference - disable adaptive themes and use saved theme
      UnistylesRuntime.setAdaptiveThemes(false)
      UnistylesRuntime.setTheme(savedTheme as "light" | "dark")
    } else {
      // No saved preference - follow system theme
      UnistylesRuntime.setAdaptiveThemes(true)
    }
  }, [initialContext, themeScheme])

  // Sync theme changes to storage and database
  useEffect(() => {
    // Listen for theme changes from Unistyles
    const currentTheme = UnistylesRuntime.themeName

    // Only update storage if theme changed (not on initial mount)
    if (currentTheme && currentTheme !== themeScheme) {
      setThemeScheme(currentTheme)

      // Sync to database (fire-and-forget)
      if (userId) {
        syncDarkModePreference(userId, currentTheme === "dark")
      }
    }
  }, [UnistylesRuntime.themeName, themeScheme, setThemeScheme, userId])

  return <>{children}</>
}
