import {
  Children,
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react"
import { useColorScheme, View } from "react-native"
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  Theme as NavTheme,
} from "@react-navigation/native"
import { StyleSheet, UnistylesRuntime, useUnistyles } from "react-native-unistyles"

import { storage, useMMKVString } from "@/utils/storage"

import { setImperativeTheming } from "./context.utils"
import { darkTheme, lightTheme } from "./theme"
import type { ImmutableThemeContextModeT, Theme, ThemeContextModeT, ThemedStyle } from "./types"

export type ThemeContextType = {
  navigationTheme: NavTheme
  setThemeContextOverride: (newTheme: ThemeContextModeT) => void
  theme: Theme
  themeContext: ImmutableThemeContextModeT
  themed: <T>(style: ThemedStyle<T>) => T
}

export const ThemeContext = createContext<ThemeContextType | null>(null)

export interface ThemeProviderProps {
  initialContext?: ThemeContextModeT
}

/**
 * The ThemeProvider is the heart and soul of the design token system. It provides a context wrapper
 * for your entire app to consume the design tokens as well as global functionality like the app's theme.
 *
 * To get started, you want to wrap your entire app's JSX hierarchy in `ThemeProvider`
 * and then use the `useAppTheme()` hook to access the theme context.
 */
export const ThemeProvider: FC<PropsWithChildren<ThemeProviderProps>> = ({
  children,
  initialContext,
}) => {
  const THEME_STORAGE_KEY = "shipnative.themeScheme"
  // The operating system theme:
  const systemColorScheme = useColorScheme()
  // Our saved theme context: can be "light", "dark", or undefined (system theme)
  const [themeScheme, setThemeScheme] = useMMKVString(THEME_STORAGE_KEY, storage as any)

  /**
   * This function is used to set the theme context and is exported from the useAppTheme() hook.
   *  - setThemeContextOverride("dark") sets the app theme to dark no matter what the system theme is.
   *  - setThemeContextOverride("light") sets the app theme to light no matter what the system theme is.
   *  - setThemeContextOverride(undefined) the app will follow the operating system theme.
   */
  const setThemeContextOverride = useCallback(
    (newTheme: ThemeContextModeT) => {
      setThemeScheme(newTheme)
      // Update Unistyles theme when user manually changes theme
      if (newTheme) {
        // Disable adaptive themes and manually set the theme
        UnistylesRuntime.setAdaptiveThemes(false)
        UnistylesRuntime.setTheme(newTheme)
      } else {
        // Re-enable adaptive themes to follow system
        UnistylesRuntime.setAdaptiveThemes(true)
      }
    },
    [setThemeScheme],
  )

  /**
   * initialContext is the theme context passed in from the app.tsx file and always takes precedence.
   * themeScheme is the value from MMKV. If undefined, we fall back to the system theme
   * systemColorScheme is the value from the device. If undefined, we fall back to "light"
   */
  const themeContext: ImmutableThemeContextModeT = useMemo(() => {
    const t = initialContext || themeScheme || (!!systemColorScheme ? systemColorScheme : "light")
    return t === "dark" ? "dark" : "light"
  }, [initialContext, themeScheme, systemColorScheme])

  // Sync Unistyles theme with app theme context
  useEffect(() => {
    // If there's a saved theme scheme (user override), use it; otherwise follow system
    if (themeScheme) {
      UnistylesRuntime.setAdaptiveThemes(false)
      UnistylesRuntime.setTheme(themeContext)
    } else {
      UnistylesRuntime.setAdaptiveThemes(true)
    }
  }, [themeContext, themeScheme])

  const navigationTheme: NavTheme = useMemo(() => {
    switch (themeContext) {
      case "dark":
        return NavDarkTheme
      default:
        return NavDefaultTheme
    }
  }, [themeContext])

  const theme: Theme = useMemo(() => {
    switch (themeContext) {
      case "dark":
        return darkTheme
      default:
        return lightTheme
    }
  }, [themeContext])

  useEffect(() => {
    setImperativeTheming(theme)
  }, [theme])

  /**
   * Applies a themed style function to the current theme
   */
  const themed = useCallback(
    <T,>(style: ThemedStyle<T>): T => {
      return style(theme)
    },
    [theme],
  )

  const value = {
    navigationTheme,
    theme,
    themeContext,
    setThemeContextOverride,
    themed,
  }

  // React Native Web will warn if a View receives a raw text child. Strip out any
  // accidental string/number children (e.g., whitespace) before rendering.
  const safeChildren = Children.toArray(children).filter(
    (child) => typeof child !== "string" && typeof child !== "number",
  )

  return (
    <ThemeContext.Provider value={value}>
      <View style={styles.container}>{safeChildren}</View>
    </ThemeContext.Provider>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
}))

/**
 * This is the primary hook that you will use to access the theme context in your components.
 */
export const useAppTheme = () => {
  const context = useContext(ThemeContext)
  const { theme } = useUnistyles()

  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider")
  }

  return {
    ...context,
    // Also expose Unistyles theme for convenience
    unistylesTheme: theme,
  }
}
