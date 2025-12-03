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

// Mock react-native-unistyles to avoid NitroModules errors in tests
jest.mock("react-native-unistyles", () => {
  const mockTheme = {
    colors: {},
    spacing: {},
    typography: {
      fonts: {},
      sizes: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20 },
      lineHeights: { xs: 16, sm: 20, base: 24, lg: 28, xl: 32 },
      weights: {},
    },
    radius: {},
    shadows: {},
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
