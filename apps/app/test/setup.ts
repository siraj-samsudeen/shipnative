// we always make sure 'react-native' gets included first
// eslint-disable-next-line no-restricted-imports
import * as ReactNative from "react-native"

import mockFile from "./mockFile"

// libraries to mock
jest.doMock("react-native", () => {
  // Extend ReactNative
  return Object.setPrototypeOf(
    {
      Image: {
        ...ReactNative.Image,
        resolveAssetSource: jest.fn((_source) => mockFile), // eslint-disable-line @typescript-eslint/no-unused-vars
        getSize: jest.fn(
          (
            uri: string, // eslint-disable-line @typescript-eslint/no-unused-vars
            success: (width: number, height: number) => void,
            failure?: (_error: any) => void, // eslint-disable-line @typescript-eslint/no-unused-vars
          ) => success(100, 100),
        ),
      },
    },
    ReactNative,
  )
})

jest.mock("i18next", () => ({
  currentLocale: "en",
  t: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
  translate: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
}))

// Mock react-i18next to avoid "You will need to pass in an i18next instance" warnings
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
    i18n: {
      language: "en",
      changeLanguage: jest.fn(),
    },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: jest.fn(),
  },
  Trans: ({ children }: { children: unknown }) => children,
}))

jest.mock("expo-localization", () => ({
  ...jest.requireActual("expo-localization"),
  getLocales: () => [{ languageTag: "en-US", textDirection: "ltr" }],
}))

jest.mock("../app/i18n/index.ts", () => ({
  i18n: {
    isInitialized: true,
    language: "en",
    t: (key: string, params: Record<string, string>) => {
      return `${key} ${JSON.stringify(params)}`
    },
    numberToCurrency: jest.fn(),
  },
}))

// Mock keyboard controller which isn't available in the Jest environment
jest.mock("react-native-keyboard-controller", () => {
  return {
    KeyboardProvider: ({ children }: { children: unknown }) => children,
    KeyboardAwareScrollView: ({ children }: { children: unknown }) => children,
    useKeyboardHandler: () => {},
  }
})

// Mock logger before other modules that depend on it
jest.mock("../app/utils/Logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
    scope: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  },
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  LogLevel: {
    DEBUG: "DEBUG",
    INFO: "INFO",
    WARN: "WARN",
    ERROR: "ERROR",
  },
}))

// Mock react-native-unistyles to avoid NitroModules errors in tests
jest.mock("react-native-unistyles", () => {
  const mockTheme = {
    colors: {
      palette: {
        white: "#FFFFFF",
        black: "#000000",
      },
      primary: "#000000",
      primaryForeground: "#FFFFFF",
      secondary: "#F3F4F6",
      secondaryForeground: "#111827",
      accent: "#F97316",
      accentForeground: "#FFFFFF",
      background: "#F9FAFB",
      backgroundSecondary: "#F3F4F6",
      backgroundTertiary: "#E5E7EB",
      foreground: "#111827",
      foregroundSecondary: "#4B5563",
      foregroundTertiary: "#9CA3AF",
      card: "#FFFFFF",
      cardForeground: "#111827",
      border: "#E5E7EB",
      borderSecondary: "#D1D5DB",
      input: "#F3F4F6",
      inputForeground: "#111827",
      inputPlaceholder: "#9CA3AF",
      inputBorder: "#D1D5DB",
      inputBorderFocus: "#0EA5E9",
      success: "#22C55E",
      successBackground: "#F0FDF4",
      successForeground: "#15803D",
      error: "#EF4444",
      errorBackground: "#FEF2F2",
      errorForeground: "#B91C1C",
      warning: "#F59E0B",
      warningBackground: "#FFFBEB",
      warningForeground: "#D97706",
    },
    spacing: {
      "xxxs": 2,
      "xxs": 4,
      "xs": 8,
      "sm": 12,
      "md": 16,
      "lg": 24,
      "xl": 32,
      "2xl": 40,
      "3xl": 48,
      "4xl": 64,
      "5xl": 80,
    },
    typography: {
      fonts: {
        regular: "SpaceGrotesk-Regular",
        medium: "SpaceGrotesk-Medium",
        semiBold: "SpaceGrotesk-SemiBold",
        bold: "SpaceGrotesk-Bold",
      },
      sizes: { "xs": 12, "sm": 14, "base": 16, "lg": 18, "xl": 20, "2xl": 24 },
      lineHeights: { xs: 16, sm: 20, base: 24, lg: 28, xl: 32 },
      weights: {},
    },
    radius: {
      "none": 0,
      "xs": 4,
      "sm": 8,
      "md": 12,
      "lg": 16,
      "xl": 20,
      "2xl": 24,
      "3xl": 32,
      "full": 9999,
    },
    sizes: {
      icon: {
        xs: 16,
        sm: 20,
        md: 24,
        lg: 32,
        xl: 40,
      },
      button: {
        sm: 36,
        md: 44,
        lg: 56,
      },
      input: {
        sm: 40,
        md: 48,
        lg: 56,
      },
      avatar: {
        xs: 24,
        sm: 32,
        md: 40,
        lg: 48,
        xl: 64,
      },
    },
    shadows: {
      none: {},
      xs: {},
      sm: {},
      md: {},
      lg: {},
    },
  }
  return {
    StyleSheet: {
      create: (styles: any) => {
        let computedStyles = styles
        if (typeof styles === "function") {
          // Call the function with a mock theme
          computedStyles = styles(mockTheme)
        }
        // Add useVariants method to the styles object
        return {
          ...computedStyles,
          useVariants: jest.fn(() => ({})),
        }
      },
      configure: jest.fn(),
    },
    useUnistyles: () => ({
      theme: mockTheme,
      breakpoint: "xs",
      runtime: {},
    }),
    UnistylesRegistry: {
      addThemes: jest.fn(),
      addBreakpoints: jest.fn(),
      addConfig: jest.fn(),
    },
    UnistylesRuntime: {
      setTheme: jest.fn(),
      setAdaptiveThemes: jest.fn(),
      themeName: "light",
      colorScheme: "light",
    },
    createStyleSheet: (styles: any) => styles,
  }
})

declare const tron // eslint-disable-line @typescript-eslint/no-unused-vars

declare global {
  let __TEST__: boolean
}
