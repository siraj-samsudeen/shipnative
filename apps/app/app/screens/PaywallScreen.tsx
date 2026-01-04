import { useEffect, useCallback, useState } from "react"
import { View, Platform, ActivityIndicator } from "react-native"
import { RouteProp, useRoute } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { Text, Container, Button } from "../components"
import { env } from "../config/env"
import type { AppStackParamList } from "../navigators/navigationTypes"
import { resetRoot } from "../navigators/navigationUtilities"
import { isRevenueCatMock } from "../services/revenuecat"
import { useSubscriptionStore } from "../stores/subscriptionStore"
import type { PricingPackage } from "../types/subscription"

// Conditionally import native RevenueCat SDKs (not available on web or in mock mode)
// Note: isRevenueCatMock is imported from revenuecat service which handles the mock detection logic
type RevenueCatOfferings = { current?: unknown }
type RevenueCatPurchases = { getOfferings: () => Promise<RevenueCatOfferings> }
type RevenueCatPaywalls = {
  presentPaywall: (options: { offering: unknown }) => Promise<unknown>
}

let Purchases: RevenueCatPurchases | null = null
let Paywalls: RevenueCatPaywalls | null = null

// Only load native SDK if not web and not in mock mode
// Mock mode = dev environment without API keys
// We check isRevenueCatMock at runtime in the component, but for module-level imports
// we need to check the same conditions
const mobileApiKey = Platform.select({
  ios: env.revenueCatIosKey,
  android: env.revenueCatAndroidKey,
})
// Load SDK if: not web AND (production OR has API key)
const shouldLoadNativeSDK = Platform.OS !== "web" && (!__DEV__ || mobileApiKey)

if (shouldLoadNativeSDK) {
  try {
    Purchases = require("react-native-purchases").default
    Paywalls = require("react-native-purchases-ui").Paywalls
  } catch (e) {
    if (__DEV__) {
      console.warn("Failed to load react-native-purchases", e)
    }
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PaywallScreen = () => {
  const route = useRoute<RouteProp<AppStackParamList, "Paywall">>()
  const { theme } = useUnistyles()
  const { t } = useTranslation()
  const isPro = useSubscriptionStore((state) => state.isPro)
  const packages = useSubscriptionStore((state) => state.packages)
  const fetchPackages = useSubscriptionStore((state) => state.fetchPackages)
  const purchasePackage = useSubscriptionStore((state) => state.purchasePackage)
  const subscriptionLoading = useSubscriptionStore((state) => state.loading)
  const isWeb = Platform.OS === "web"
  const isMock = isRevenueCatMock
  const isMockMode = isMock || !Purchases || !Paywalls
  const [isPresenting, setIsPresenting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasAutoPresented, setHasAutoPresented] = useState(false)
  const loadErrorMessage = t("paywallScreen:loadFailed")
  const purchaseErrorMessage = t("paywallScreen:purchaseFailed")
  const noWebOfferingMessage = t("paywallScreen:noWebOfferingError")
  const noPackagesMessage = t("paywallScreen:noPackagesError")
  const sdkUnavailableMessage = t("paywallScreen:sdkUnavailableError")

  const isFromOnboarding = route.params?.fromOnboarding === true

  // Navigate to Main after successful purchase or skip
  const navigateToMain = useCallback(() => {
    if (!isFromOnboarding) return
    // Reset root navigation stack to Main screen (Paywall can be mounted under tabs or onboarding)
    resetRoot({
      index: 0,
      routes: [{ name: "Main" }],
    })
  }, [isFromOnboarding])

  // Present RevenueCat Paywall
  const presentPaywall = useCallback(async () => {
    // Web path or Mock mode - use subscription store packages
    if (isWeb || isMockMode) {
      try {
        setIsPresenting(true)
        setError(null)

        // Ensure packages are loaded
        if (!useSubscriptionStore.getState().packages.length) {
          await fetchPackages()
        }

        if (!useSubscriptionStore.getState().packages.length) {
          throw new Error(isWeb ? noWebOfferingMessage : noPackagesMessage)
        }
      } catch (err) {
        console.error("Failed to load paywall:", err)
        setError(err instanceof Error ? err.message : loadErrorMessage)
      } finally {
        setIsPresenting(false)
      }
      return
    }

    // Native path (iOS/Android) with real RevenueCat SDK
    if (!Purchases || !Paywalls) {
      console.error("RevenueCat native SDK not available")
      setError(sdkUnavailableMessage)
      return
    }

    try {
      setIsPresenting(true)
      setError(null)

      // Get the current offering
      const offerings = await Purchases.getOfferings()
      const currentOffering = offerings.current

      if (!currentOffering) {
        throw new Error(t("paywallScreen:noOfferingError"))
      }

      // Present the paywall configured in RevenueCat dashboard
      const result = await Paywalls.presentPaywall({
        offering: currentOffering,
      })

      // Normalize result shape from SDK
      const resultValue =
        typeof result === "string" ? result : (result as { result?: string } | null)?.result

      // If the SDK returned fresh customer info (e.g., "Test Valid Purchase"/restore),
      // apply it immediately so the Pro state updates without waiting on a fetch.
      // Refresh subscription status after paywall is dismissed (authoritative fetch)
      const service = useSubscriptionStore.getState().getActiveService()
      const subscriptionInfo = await service.getSubscriptionInfo()
      const { platform } = useSubscriptionStore.getState()

      if (platform === "revenuecat-web") {
        useSubscriptionStore.getState().setWebSubscriptionInfo(subscriptionInfo)
      } else {
        useSubscriptionStore.getState().setCustomerInfo(subscriptionInfo)
      }

      // If user purchased or restored, navigate to Main (if from onboarding)
      if ((resultValue === "PURCHASED" || resultValue === "RESTORED") && isFromOnboarding) {
        navigateToMain()
      }

      // Log unexpected results for debugging
      if (resultValue && resultValue !== "PURCHASED" && resultValue !== "RESTORED") {
        console.info("[Paywall] Unexpected paywall result", resultValue)
      }
    } catch (err) {
      console.error("Failed to present paywall:", err)
      setError(err instanceof Error ? err.message : loadErrorMessage)
    } finally {
      setIsPresenting(false)
    }
  }, [
    fetchPackages,
    isFromOnboarding,
    isWeb,
    isMockMode,
    loadErrorMessage,
    navigateToMain,
    noPackagesMessage,
    noWebOfferingMessage,
    sdkUnavailableMessage,
  ])

  // Handle purchase flow (web or mock mode)
  const handlePackagePurchase = useCallback(
    async (pkg: PricingPackage) => {
      try {
        setError(null)

        const result = await purchasePackage(pkg)

        if (result.error) {
          throw result.error
        }

        if (isFromOnboarding) {
          navigateToMain()
        }
      } catch (err) {
        console.error("Purchase failed:", err)
        setError(err instanceof Error ? err.message : purchaseErrorMessage)
      }
    },
    [purchaseErrorMessage, purchasePackage, isFromOnboarding, navigateToMain],
  )

  // Auto-present paywall when screen loads (if not Pro)
  useEffect(() => {
    if (!isPro && !isPresenting && !hasAutoPresented) {
      setHasAutoPresented(true)
      presentPaywall()
    }
  }, [isPro, isPresenting, presentPaywall, hasAutoPresented])

  // Auto-navigate to Main if user is already Pro
  useEffect(() => {
    if (isPro && isFromOnboarding) {
      const timer = setTimeout(() => {
        navigateToMain()
      }, 500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isPro, isFromOnboarding, navigateToMain])

  // Handle manual paywall presentation (for retry or if auto-present failed)
  const handlePresentPaywall = useCallback(() => {
    presentPaywall()
  }, [presentPaywall])

  // Handle skip/continue (only shown if paywall failed to present)
  const handleSkip = useCallback(() => {
    navigateToMain()
  }, [navigateToMain])

  return (
    <Container safeAreaEdges={["top", "bottom"]}>
      <View style={styles.container}>
        {isPro ? (
          // User is already Pro - show success message
          <View style={styles.content}>
            <Text preset="heading" style={styles.title} tx="paywallScreen:welcomeTitle" />
            <Text style={styles.description} tx="paywallScreen:welcomeDescription" />
          </View>
        ) : isPresenting ? (
          // Loading state while presenting paywall
          <View style={styles.content}>
            <ActivityIndicator size="large" color={theme.colors.tint} />
            <Text style={styles.loadingText} tx="paywallScreen:loadingPaywall" />
          </View>
        ) : isWeb || isMockMode ? (
          // Web billing or Mock mode - use packages + custom UI instead of native paywall
          <View style={styles.content}>
            <Text preset="heading" style={styles.title} tx="paywallScreen:upgradeTitle" />
            <Text style={styles.description}>
              {isMock
                ? isWeb
                  ? t("paywallScreen:mockWebDescription")
                  : t("paywallScreen:mockNativeDescription")
                : t("paywallScreen:secureCheckoutDescription")}
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.packageList}>
              {packages.length === 0 ? (
                <Text style={styles.errorText}>
                  {isWeb ? noWebOfferingMessage : noPackagesMessage}
                </Text>
              ) : (
                packages.map((pricingPkg) => {
                  return (
                    <View key={pricingPkg.identifier} style={styles.packageCard}>
                      <View style={styles.packageHeader}>
                        <Text style={styles.packageTitle}>{pricingPkg.title}</Text>
                        <Text style={styles.packagePrice}>
                          {pricingPkg.priceString || `$${pricingPkg.price.toFixed(2)}`}
                        </Text>
                      </View>
                      {pricingPkg.description ? (
                        <Text style={styles.packageDescription}>{pricingPkg.description}</Text>
                      ) : null}
                      <Button
                        text={
                          subscriptionLoading || isPresenting
                            ? t("paywallScreen:processing")
                            : t("paywallScreen:selectPlan")
                        }
                        onPress={() => handlePackagePurchase(pricingPkg)}
                        variant="filled"
                        loading={subscriptionLoading || isPresenting}
                        disabled={subscriptionLoading || isPresenting}
                        style={styles.presentButton}
                      />
                    </View>
                  )
                })
              )}
            </View>

            {isFromOnboarding && (
              <Button
                text={t("paywallScreen:continueWithFree")}
                onPress={handleSkip}
                variant="ghost"
                style={styles.skipButton}
                disabled={subscriptionLoading || isPresenting}
              />
            )}
          </View>
        ) : error ? (
          // Error state - show error and retry option
          <View style={styles.content}>
            <Text preset="heading" style={styles.title} tx="paywallScreen:unableToLoadTitle" />
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.buttonContainer}>
              <Button
                text={t("paywallScreen:tryAgain")}
                onPress={handlePresentPaywall}
                variant="filled"
                style={styles.retryButton}
              />
              {isFromOnboarding && (
                <Button
                  text={t("paywallScreen:continueWithFree")}
                  onPress={handleSkip}
                  variant="ghost"
                  style={styles.skipButton}
                />
              )}
            </View>
          </View>
        ) : (
          // Fallback - should not reach here, but show option to present paywall
          <View style={styles.content}>
            <Text preset="heading" style={styles.title} tx="paywallScreen:upgradeTitle" />
            <Text style={styles.description} tx="paywallScreen:upgradeDescription" />
            <Button
              text={t("paywallScreen:viewPlans")}
              onPress={handlePresentPaywall}
              variant="filled"
              style={styles.presentButton}
            />
            {isFromOnboarding && (
              <Button
                text={t("paywallScreen:continueWithFree")}
                onPress={handleSkip}
                variant="ghost"
                style={styles.skipButton}
              />
            )}
          </View>
        )}
      </View>
    </Container>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xl,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 400,
    width: "100%",
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 36,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  description: {
    color: theme.colors.foregroundSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
    textAlign: "center",
  },
  loadingText: {
    color: theme.colors.foregroundSecondary,
    fontSize: 14,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
    textAlign: "center",
  },
  buttonContainer: {
    alignItems: "center",
    gap: theme.spacing.md,
    width: "100%",
  },
  presentButton: {
    width: "100%",
  },
  retryButton: {
    width: "100%",
  },
  skipButton: {
    marginTop: theme.spacing.sm,
  },
  packageList: {
    gap: theme.spacing.md,
    width: "100%",
  },
  packageCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: theme.spacing.lg,
    width: "100%",
  },
  packageHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
    width: "100%",
  },
  packageTitle: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: "700",
  },
  packagePrice: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  packageDescription: {
    color: theme.colors.foregroundSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
}))
