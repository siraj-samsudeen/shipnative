/* eslint-disable import/first */
/**
 * Welcome to the main entry point of the app. In this file, we'll
 * be kicking off our app.
 *
 * Most of this file is boilerplate and you shouldn't need to modify
 * it very often. But take some time to look through and understand
 * what is going on here.
 *
 * The app navigation resides in ./app/navigators, so head over there
 * if you're interested in adding screens and navigators.
 */
if (__DEV__ && Platform.OS !== "web") {
  // Load Reactotron in development only.
  // Note that you must be using metro's `inlineRequires` for this to work.
  // If you turn it off in metro.config.js, you'll have to manually import it.
  require("./devtools/ReactotronConfig.ts")
}
import "./utils/gestureHandler"

import "./styles"

import { useEffect, useState, type ReactElement } from "react"
import { Platform, ViewStyle } from "react-native"
import { useFonts } from "expo-font"
import * as Linking from "expo-linking"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import { logEnvValidation } from "./config/env"
import { initI18n, initializeLanguage } from "./i18n"
import { AppNavigator } from "./navigators/AppNavigator"
import { useNavigationPersistence } from "./navigators/navigationUtilities"
import { QueryProvider } from "./providers"
import { LoadingScreen } from "./screens/LoadingScreen"
import { logMockServicesStatus } from "./services/mocks"
import { certificatePinning } from "./services/certificatePinning"
import { initPosthog } from "./services/posthog"
import { initRevenueCat } from "./services/revenuecat"
import { initSentry } from "./services/sentry"
import { useAuthStore, useSubscriptionStore } from "./stores"
import { ThemeProvider } from "./theme/context"
import { customFontsToLoad } from "./theme/typography"
import { webDimension } from "./types/webStyles"
import { logger } from "./utils/Logger"
import { securityCheck } from "./utils/securityCheck"
import * as storage from "./utils/storage"

let KeyboardProvider: React.ComponentType<any> = ({ children }: any) => <>{children}</>
if (Platform.OS !== "web") {
  try {
    KeyboardProvider = require("react-native-keyboard-controller").KeyboardProvider
  } catch (e) {
    // This is expected on web, so we'll keep console.warn for visibility
    if (__DEV__) {
      console.warn("Failed to load keyboard controller", e)
    }
  }
}

export const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE"

// Web linking configuration
const prefix = Linking.createURL("/")
const config = {
  screens: {
    Onboarding: "onboarding",
    Welcome: "welcome",
    Login: "login",
    Register: "register",
    ForgotPassword: "forgot-password",
    EmailVerification: "verify-email",
    // Auth callback for email confirmation and password reset
    AuthCallback: {
      path: "auth/callback",
      parse: {
        code: (code: string) => code,
        token: (token: string) => token,
        type: (type: string) => type,
      },
    },
  },
}

/**
 * This is the root component of our app.
 * @param {AppProps} props - The props for the `App` component.
 * @returns {JSX.Element} The rendered `App` component.
 */
export function App() {
  const {
    initialNavigationState,
    onNavigationStateChange,
    isRestored: isNavigationStateRestored,
  } = useNavigationPersistence(storage, NAVIGATION_PERSISTENCE_KEY)

  const [areFontsLoaded, fontLoadError] = useFonts(customFontsToLoad)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)
  const [isStoresInitialized, setIsStoresInitialized] = useState(false)

  useEffect(() => {
    const initialize = async () => {
      try {
        if (__DEV__) {
          logger.debug("App initialize started")
        }

        // Log environment validation and mock services status (after logger is ready)
        logEnvValidation()
        logMockServicesStatus()

        // Initialize security features
        certificatePinning.initialize()
        securityCheck.log()

        // Initialize i18n
        await initI18n()
        if (__DEV__) {
          logger.debug("i18n initialized")
        }
        // Initialize language from persisted preference or device locale
        await initializeLanguage()
        if (__DEV__) {
          logger.debug("language initialized")
        }
        setIsI18nInitialized(true)

        // Initialize services
        initSentry()
        initPosthog()
        // Initialize RevenueCat BEFORE stores (subscription store depends on it)
        await initRevenueCat()
        if (__DEV__) {
          logger.debug("services initialized")
        }

        // Handle email confirmation code from deep link
        // Check if app was opened with a code parameter (email confirmation)
        const initialUrl = await Linking.getInitialURL()
        if (initialUrl) {
          try {
            const url = new URL(initialUrl)
            const code = url.searchParams.get("code")
            const type = url.searchParams.get("type")

            if (code && (type === "signup" || type === "email")) {
              // Email confirmation code detected - verify it
              if (__DEV__) {
                logger.debug("Email confirmation code detected, verifying...")
              }
              await useAuthStore.getState().verifyEmail(code)
            }
          } catch {
            // Not a valid URL or not an email confirmation link - ignore
            if (__DEV__) {
              logger.debug("No email confirmation code in initial URL")
            }
          }
        }

        // Initialize Zustand stores
        if (__DEV__) {
          logger.debug("initializing auth store...")
        }
        await useAuthStore.getState().initialize()
        if (__DEV__) {
          logger.debug("auth store initialized")
        }

        // Initialize subscription store in background (non-blocking)
        // This allows the app to render while subscription data loads
        if (__DEV__) {
          logger.debug("initializing subscription store...")
        }
        useSubscriptionStore
          .getState()
          .initialize()
          .catch((error) => {
            logger.error("Subscription initialization failed", {}, error as Error)
          })

        // Don't wait for subscription store - it can load in background
        // The app can render with cached/default subscription values
        setIsStoresInitialized(true)
        if (__DEV__) {
          logger.debug("App initialize completed")
        }
      } catch (e) {
        logger.error("App initialize failed", {}, e as Error)
      }
    }

    initialize()
  }, [])

  const isLoading =
    !isNavigationStateRestored ||
    !isI18nInitialized ||
    !isStoresInitialized ||
    (!areFontsLoaded && !fontLoadError)

  const linking = {
    prefixes: [prefix],
    config,
  }

  let content: ReactElement

  // Before we show the app, we have to wait for our state to be ready.
  // Show a loading screen with a nice animation while initializing.
  if (isLoading) {
    const status = {
      isNavigationStateRestored,
      isI18nInitialized,
      isStoresInitialized,
      areFontsLoaded,
      fontLoadError,
    }
    if (__DEV__) {
      logger.debug("App loading state", status)
    }

    // Determine loading message based on state
    const loadingMessage = "Loading"
    let loadingStatus = "Preparing your experience..."
    if (!isI18nInitialized) {
      loadingStatus = "Initializing language..."
    } else if (!isStoresInitialized) {
      loadingStatus = "Setting up your account..."
    } else if (!areFontsLoaded) {
      loadingStatus = "Loading fonts..."
    } else if (!isNavigationStateRestored) {
      loadingStatus = "Restoring navigation..."
    }

    content = <LoadingScreen message={loadingMessage} status={loadingStatus} />
  } else {
    content = (
      <AppNavigator
        linking={linking}
        initialState={initialNavigationState}
        onStateChange={onNavigationStateChange}
      />
    )
  }

  // otherwise, we're ready to render the app
  return (
    <GestureHandlerRootView style={$gestureHandlerRoot}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics} style={$safeAreaProvider}>
        <QueryProvider>
          {Platform.OS === "web" ? (
            <ThemeProvider>{content}</ThemeProvider>
          ) : (
            <KeyboardProvider>
              <ThemeProvider>{content}</ThemeProvider>
            </KeyboardProvider>
          )}
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const $gestureHandlerRoot: ViewStyle = {
  flex: 1,
  // Web needs explicit height for proper scrolling
  ...(Platform.OS === "web" && {
    minHeight: webDimension("100vh"),
    height: webDimension("100vh"),
    overflow: "hidden",
  }),
}

const $safeAreaProvider: ViewStyle = {
  flex: 1,
  ...(Platform.OS === "web" && {
    minHeight: webDimension("100vh"),
    height: webDimension("100vh"),
    width: webDimension("100%"),
  }),
}
