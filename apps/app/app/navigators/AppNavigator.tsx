/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import { useEffect, useRef } from "react"
import { Platform } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import { Spinner } from "@/components/Spinner"
import Config from "@/config"
import * as Screens from "@/screens"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { useAuthStore } from "@/stores"
import { useAppTheme } from "@/theme/context"
import { logger } from "@/utils/Logger"

import { MainTabNavigator } from "./MainTabNavigator"
import type { AppStackParamList, NavigationProps } from "./navigationTypes"
import { navigationRef, resetRoot, useBackButtonHandler } from "./navigationUtilities"

/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createNativeStackNavigator<AppStackParamList>()

const AppStack = () => {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isEmailConfirmed = useAuthStore((state) => state.isEmailConfirmed)
  const hasCompletedOnboarding = useAuthStore((state) => state.hasCompletedOnboarding)
  const shouldShowOnboarding = !!user && isAuthenticated && !hasCompletedOnboarding
  const needsEmailVerification = !!user && !isEmailConfirmed
  const isWeb = Platform.OS === "web"
  const {
    theme: { colors },
    theme: themeContextValue,
  } = useAppTheme()
  const navigationBarColor = colors.palette.neutral900
  const statusBarStyle = themeContextValue.isDark ? "light" : "dark"

  // Track previous state to detect transitions
  const prevNeedsEmailVerificationRef = useRef(needsEmailVerification)
  const prevIsAuthenticatedRef = useRef(isAuthenticated)

  if (__DEV__) {
    logger.debug("AppStack rendering", {
      loading,
      userStatus: user ? "Logged In" : "Guest",
      isAuthenticated,
      isEmailConfirmed,
      hasCompletedOnboarding,
      needsEmailVerification,
    })
  }

  // Handle navigation when state changes (e.g., login with unverified email)
  // MUST be called before any early returns to comply with React Hooks rules
  useEffect(() => {
    // Only navigate if state actually changed (not on initial render)
    const wasNeedingVerification = prevNeedsEmailVerificationRef.current

    // If we transitioned to needing email verification, navigate to that screen
    if (needsEmailVerification && !wasNeedingVerification && navigationRef.isReady()) {
      resetRoot({
        index: 0,
        routes: [{ name: "EmailVerification" }],
      })
    }

    // Update refs for next render
    prevNeedsEmailVerificationRef.current = needsEmailVerification
    prevIsAuthenticatedRef.current = isAuthenticated
  }, [needsEmailVerification, isAuthenticated])

  if (loading) {
    return <Spinner fullScreen />
  }

  // Determine initial route
  let initialRouteName: keyof AppStackParamList = "Welcome"
  if (user) {
    if (needsEmailVerification) {
      initialRouteName = "EmailVerification"
    } else if (isAuthenticated) {
      initialRouteName = hasCompletedOnboarding ? "Main" : "Onboarding"
    }
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor,
        statusBarStyle,
        contentStyle: {
          flex: 1,
          backgroundColor: colors.background,
          ...(isWeb && {
            minHeight: "100vh" as unknown as number,
            height: "100vh" as unknown as number,
            width: "100vw" as unknown as number,
            maxWidth: "100vw" as unknown as number,
          }),
        },
        animation: "default",
      }}
      initialRouteName={initialRouteName}
    >
      {needsEmailVerification ? (
        // ------------------------------------------------------------------
        // EMAIL VERIFICATION (USER EXISTS BUT EMAIL NOT CONFIRMED)
        // ------------------------------------------------------------------
        <>
          <Stack.Screen
            name="EmailVerification"
            component={Screens.EmailVerificationScreen}
            options={{
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="Register"
            component={Screens.RegisterScreen}
            options={{
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="Login"
            component={Screens.LoginScreen}
            options={{
              animation: "slide_from_right",
            }}
          />
        </>
      ) : shouldShowOnboarding ? (
        // ------------------------------------------------------------------
        // ONBOARDING (AUTHENTICATED AND EMAIL CONFIRMED)
        // ------------------------------------------------------------------
        <>
          <Stack.Screen name="Onboarding" component={Screens.OnboardingScreen} />
          <Stack.Screen
            name="Paywall"
            component={Screens.PaywallScreen}
            options={{
              gestureEnabled: false,
            }}
          />
        </>
      ) : isAuthenticated ? (
        // ------------------------------------------------------------------
        // AUTHENTICATED STACK (EMAIL CONFIRMED)
        // ------------------------------------------------------------------
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen
            name="Paywall"
            component={Screens.PaywallScreen}
            options={{
              animation: "slide_from_right",
            }}
          />
        </>
      ) : (
        // ------------------------------------------------------------------
        // UNAUTHENTICATED STACK (Welcome, Login, Register)
        // ------------------------------------------------------------------
        <>
          <Stack.Screen
            name="Welcome"
            component={Screens.WelcomeScreen}
            options={{
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="Login"
            component={Screens.LoginScreen}
            options={{
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="Register"
            component={Screens.RegisterScreen}
            options={{
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={Screens.ForgotPasswordScreen}
            options={{
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="EmailVerification"
            component={Screens.EmailVerificationScreen}
            options={{
              animation: "slide_from_right",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  )
}

export const AppNavigator = (props: NavigationProps) => {
  const { navigationTheme } = useAppTheme()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <AppStack />
      </ErrorBoundary>
    </NavigationContainer>
  )
}
