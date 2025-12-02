import { FC, useState } from "react"
import { View, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { useNavigation } from "@react-navigation/native"

import { Text, OnboardingScreenLayout } from "@/components"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAuthStore, useNotificationStore } from "@/stores"

// =============================================================================
// TYPES
// =============================================================================

interface OnboardingScreenProps extends AppStackScreenProps<"Onboarding"> {}

// =============================================================================
// COMPONENT
// =============================================================================

export const OnboardingScreen: FC<OnboardingScreenProps> = function OnboardingScreen(_props) {
  const { theme } = useUnistyles()
  const navigation = useNavigation<AppStackScreenProps<"Onboarding">["navigation"]>()
  const setHasCompletedOnboarding = useAuthStore((state) => state.setHasCompletedOnboarding)
  const togglePush = useNotificationStore((state) => state.togglePush)
  const [step, setStep] = useState(0)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)

  // Slide animations
  const handleNext = async () => {
    if (step < 2) {
      setStep(step + 1)
    } else {
      // Navigate to Paywall first, then mark onboarding as complete
      // This ensures Paywall is shown before the navigator switches stacks
      navigation.replace("Paywall")
      // Set onboarding as complete after navigation
      // The Paywall screen will handle navigation to Main
      await setHasCompletedOnboarding(true)
    }
  }

  const handleEnableNotifications = async () => {
    if (isRequestingPermission) return

    setIsRequestingPermission(true)
    try {
      await togglePush()
    } catch (error) {
      console.warn("📬 [Onboarding] Failed to enable notifications", error)
    } finally {
      setIsRequestingPermission(false)
      handleNext()
    }
  }

  // Step 0: Welcome
  if (step === 0) {
    return (
      <OnboardingScreenLayout
        currentStep={0}
        totalSteps={3}
        headerIcon="👋"
        title="Welcome Aboard!"
        subtitle="We're excited to help you build your next great app. Let's get you set up in just a few seconds."
      >
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext} activeOpacity={0.8}>
          <Text weight="semiBold" style={styles.primaryButtonText}>
            Let&apos;s Go
          </Text>
        </TouchableOpacity>
      </OnboardingScreenLayout>
    )
  }

  // Step 1: Goal Selection
  if (step === 1) {
    return (
      <OnboardingScreenLayout
        currentStep={1}
        totalSteps={3}
        headerIcon="🎯"
        title="Your Goal"
        subtitle="What's your main focus today? This helps us personalize your experience."
      >
        <View style={styles.optionsContainer}>
          {["Build an App", "Learn React Native", "Just Exploring"].map((option, index) => (
            <TouchableOpacity key={index} style={styles.optionButton} onPress={handleNext}>
              <Text weight="semiBold" style={styles.optionText}>
                {option}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.foregroundSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </OnboardingScreenLayout>
    )
  }

  // Step 2: Notifications
  return (
    <OnboardingScreenLayout
      currentStep={2}
      totalSteps={3}
      headerIcon="🔔"
      title="Stay Updated"
      subtitle="Enable notifications to get daily updates, tips, and important announcements."
    >
      {/* Notification Preview Card */}
      <View style={styles.notificationCard}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIcon}>
            <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.card} />
          </View>
          <View>
            <Text weight="semiBold" style={styles.notificationTitle}>
              New Feature!
            </Text>
            <Text size="xs" color="secondary">
              Just now
            </Text>
          </View>
        </View>
        <Text color="secondary">Dark mode is now available. Check it out in settings!</Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isRequestingPermission && styles.primaryButtonDisabled]}
        onPress={handleEnableNotifications}
        activeOpacity={0.8}
        disabled={isRequestingPermission}
      >
        <Text weight="semiBold" style={styles.primaryButtonText}>
          {isRequestingPermission ? "Enabling..." : "Turn On Notifications"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={handleNext} activeOpacity={0.8}>
        <Text weight="medium" color="secondary">
          Maybe Later
        </Text>
      </TouchableOpacity>
    </OnboardingScreenLayout>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    width: "100%",
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  primaryButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.sizes.lg,
  },
  primaryButtonDisabled: {
    opacity: 0.8,
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  optionsContainer: {
    gap: theme.spacing.md,
    width: "100%",
  },
  optionButton: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  optionText: {
    color: theme.colors.foreground,
    fontSize: theme.typography.sizes.lg,
  },
  notificationCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
    width: "100%",
    ...theme.shadows.lg,
  },
  notificationHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: theme.spacing.sm,
  },
  notificationIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.error,
    borderRadius: theme.radius.sm,
    height: 32,
    justifyContent: "center",
    marginRight: theme.spacing.md,
    width: 32,
  },
  notificationTitle: {
    color: theme.colors.foreground,
  },
}))
