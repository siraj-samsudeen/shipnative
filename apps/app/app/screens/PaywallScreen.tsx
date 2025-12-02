import { useEffect, useCallback, useState } from "react"
import { View, Platform, ActivityIndicator } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useNavigation } from "@react-navigation/native"
import Purchases from "react-native-purchases"
import { Paywalls } from "react-native-purchases-ui"

import { Text, Container, Button } from "../components"
import { useSubscriptionStore } from "../stores/subscriptionStore"
import type { AppStackScreenProps } from "../navigators/navigationTypes"
import type { PricingPackage } from "../types/subscription"
import { isRevenueCatMock } from "../services/revenuecat"

// =============================================================================
// COMPONENT
// =============================================================================

export const PaywallScreen = () => {
  const navigation = useNavigation<AppStackScreenProps<"Paywall">["navigation"]>()
  const isPro = useSubscriptionStore((state) => state.isPro)
  const packages = useSubscriptionStore((state) => state.packages)
  const fetchPackages = useSubscriptionStore((state) => state.fetchPackages)
  const purchasePackage = useSubscriptionStore((state) => state.purchasePackage)
  const subscriptionLoading = useSubscriptionStore((state) => state.loading)
  const isWeb = Platform.OS === "web"
  const webPackages = packages as PricingPackage[]
  const isMockWebBilling = isWeb && isRevenueCatMock
  const [isPresenting, setIsPresenting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasAutoPresented, setHasAutoPresented] = useState(false)

  // Check if we can navigate back (i.e., came from onboarding)
  const canGoBack = navigation.canGoBack()
  const isFromOnboarding = !canGoBack

  // Navigate to Main after successful purchase or skip
  const navigateToMain = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.replace("Main")
    }
  }, [navigation])

  // Present RevenueCat Paywall
  const presentPaywall = useCallback(async () => {
    if (isWeb) {
      try {
        setIsPresenting(true)
        setError(null)

        // Ensure web offerings are loaded
        if (!useSubscriptionStore.getState().packages.length) {
          await fetchPackages()
        }

        if (!useSubscriptionStore.getState().packages.length) {
          throw new Error(
            "No web offering found. Add a Web Billing offering in RevenueCat and try again.",
          )
        }
      } catch (err: any) {
        console.error("Failed to load web paywall:", err)
        setError(err?.message || "Failed to load paywall. Please try again.")
      } finally {
        setIsPresenting(false)
      }
      return
    }

    try {
      setIsPresenting(true)
      setError(null)

      // Get the current offering
      const offerings = await Purchases.getOfferings()
      const currentOffering = offerings.current

      if (!currentOffering) {
        throw new Error("No offering available. Please configure an offering in RevenueCat dashboard.")
      }

      // Present the paywall configured in RevenueCat dashboard
      const result = await Paywalls.presentPaywall({
        offering: currentOffering,
      })

      // Refresh subscription status after paywall is dismissed
      const service = useSubscriptionStore.getState().getActiveService()
      const subscriptionInfo = await service.getSubscriptionInfo()
      const { platform } = useSubscriptionStore.getState()

      if (platform === "revenuecat-web") {
        useSubscriptionStore.getState().setWebSubscriptionInfo(subscriptionInfo)
      } else {
        useSubscriptionStore.getState().setCustomerInfo(subscriptionInfo as any)
      }

      // If user purchased, navigate to Main (if from onboarding)
      if (result === "PURCHASED" && isFromOnboarding) {
        navigateToMain()
      }
    } catch (err: any) {
      console.error("Failed to present paywall:", err)
      setError(err?.message || "Failed to load paywall. Please try again.")
    } finally {
      setIsPresenting(false)
    }
  }, [fetchPackages, isFromOnboarding, isWeb, navigateToMain])

  // Handle web purchase flow
  const handleWebPurchase = useCallback(
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
      } catch (err: any) {
        console.error("Web purchase failed:", err)
        setError(err?.message || "Payment failed. Please try again.")
      }
    },
    [purchasePackage, isFromOnboarding, navigateToMain],
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
            <Text preset="heading" style={styles.title}>
              Welcome to Pro! 🎉
            </Text>
            <Text style={styles.description}>
              You&apos;re all set. Enjoy all premium features!
            </Text>
          </View>
        ) : isPresenting ? (
          // Loading state while presenting paywall
          <View style={styles.content}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading paywall...</Text>
          </View>
        ) : isWeb ? (
          // Web billing uses packages + checkout links instead of native paywall
          <View style={styles.content}>
            <Text preset="heading" style={styles.title}>
              Upgrade to Pro
            </Text>
            <Text style={styles.description}>
              {isMockWebBilling
                ? "Mock checkout is enabled because no RevenueCat Web key is set. Add a key to use real billing."
                : "Secure checkout is handled by RevenueCat Web Billing."}
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.packageList}>
              {webPackages.length === 0 ? (
                <Text style={styles.errorText}>
                  No web offering found. Add a Web Billing offering in RevenueCat and try again.
                </Text>
              ) : (
                webPackages.map((pkg) => (
                  <View key={pkg.identifier} style={styles.packageCard}>
                    <View style={styles.packageHeader}>
                      <Text style={styles.packageTitle}>{pkg.title}</Text>
                      <Text style={styles.packagePrice}>
                        {pkg.priceString || `$${pkg.price.toFixed(2)}`}
                      </Text>
                    </View>
                    {pkg.description ? (
                      <Text style={styles.packageDescription}>{pkg.description}</Text>
                    ) : null}
                    <Button
                      text={subscriptionLoading || isPresenting ? "Processing..." : "Select plan"}
                      onPress={() => handleWebPurchase(pkg)}
                      variant="filled"
                      loading={subscriptionLoading || isPresenting}
                      disabled={subscriptionLoading || isPresenting}
                      style={styles.presentButton}
                    />
                  </View>
                ))
              )}
            </View>

            {isFromOnboarding && (
              <Button
                text="Continue with Free"
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
            <Text preset="heading" style={styles.title}>
              Unable to Load Paywall
            </Text>
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.buttonContainer}>
              <Button
                text="Try Again"
                onPress={handlePresentPaywall}
                variant="filled"
                style={styles.retryButton}
              />
              {isFromOnboarding && (
                <Button
                  text="Continue with Free"
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
            <Text preset="heading" style={styles.title}>
              Upgrade to Pro
            </Text>
            <Text style={styles.description}>
              Unlock all features and remove limits.
            </Text>
            <Button
              text="View Plans"
              onPress={handlePresentPaywall}
              variant="filled"
              style={styles.presentButton}
            />
            {isFromOnboarding && (
              <Button
                text="Continue with Free"
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
