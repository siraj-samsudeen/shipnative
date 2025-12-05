/**
 * OnboardingScreenLayout - Full-screen gradient layout for onboarding
 *
 * Use this layout for:
 * - Multi-step onboarding flows
 * - Feature introductions
 * - First-time user experiences
 *
 * Features:
 * - Full-screen gradient background (theme-aware)
 * - Centered content area
 * - Optional step indicator dots
 * - Safe area handling
 * - Consistent spacing and typography
 *
 * @example
 * ```tsx
 * <OnboardingScreenLayout
 *   currentStep={1}
 *   totalSteps={3}
 *   headerIcon="👋"
 *   title="Welcome Aboard!"
 *   subtitle="We're excited to help you build your next great app."
 * >
 *   {// Buttons and content here //}
 * </OnboardingScreenLayout>
 * ```
 */

import { ReactNode } from "react"
import { View, Platform, useWindowDimensions } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import type { TOptions } from "i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { TxKeyPath } from "@/i18n"
import { webDimension } from "@/types/webStyles"

import { Text } from "../Text"

// =============================================================================
// TYPES
// =============================================================================

export interface OnboardingScreenLayoutProps {
  /** Main heading text */
  title?: string
  /** i18n translation key for title */
  titleTx?: TxKeyPath
  /** i18n translation options for title */
  titleTxOptions?: TOptions
  /** Subtitle/description below the title */
  subtitle?: string
  /** i18n translation key for subtitle */
  subtitleTx?: TxKeyPath
  /** i18n translation options for subtitle */
  subtitleTxOptions?: TOptions
  /** Emoji/icon displayed in a circle above the title */
  headerIcon?: string
  /** Screen content (buttons, options, etc.) */
  children: ReactNode
  /** Current step number (0-indexed) */
  currentStep?: number
  /** Total number of steps */
  totalSteps?: number
  /** Whether to show step indicator dots */
  showStepIndicator?: boolean
  /** Footer content (appears above step indicator) */
  footer?: ReactNode
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CONTENT_MAX_WIDTH = 480
const BREAKPOINT_LARGE = 768

// =============================================================================
// COMPONENT
// =============================================================================

export const OnboardingScreenLayout = ({
  title,
  titleTx,
  titleTxOptions,
  subtitle,
  subtitleTx,
  subtitleTxOptions,
  headerIcon,
  children,
  currentStep = 0,
  totalSteps = 3,
  showStepIndicator = true,
  footer,
}: OnboardingScreenLayoutProps) => {
  const { theme } = useUnistyles()
  const insets = useSafeAreaInsets()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()

  const isLargeScreen = windowWidth > BREAKPOINT_LARGE
  const isWeb = Platform.OS === "web"
  const webViewportStyle = isWeb
    ? // Force full-viewport sizing on web where parent containers can collapse.
      {
        minHeight: windowHeight,
        height: windowHeight,
        width: webDimension("100%"),
        maxWidth: webDimension("100%"),
      }
    : undefined

  return (
    <View style={[styles.container, webViewportStyle]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientMiddle, theme.colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, webViewportStyle]}
      >
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + 40,
              paddingBottom: insets.bottom + 20,
            },
            isWeb && isLargeScreen && styles.contentCentered,
          ]}
        >
          {/* Main Content Area */}
          <View
            style={[styles.mainContent, isWeb && isLargeScreen && { maxWidth: CONTENT_MAX_WIDTH }]}
          >
            {/* Header Icon */}
            {headerIcon && (
              <View style={styles.iconContainer}>
                <Text style={styles.iconEmoji}>{headerIcon}</Text>
              </View>
            )}

            {/* Title */}
            {(title || titleTx) && (
              <Text
                size="4xl"
                weight="bold"
                style={styles.title}
                text={title}
                tx={titleTx}
                txOptions={titleTxOptions}
              />
            )}

            {/* Subtitle */}
            {(subtitle || subtitleTx) && (
              <Text
                size="lg"
                color="secondary"
                style={styles.subtitle}
                text={subtitle}
                tx={subtitleTx}
                txOptions={subtitleTxOptions}
              />
            )}

            {/* Content */}
            <View style={styles.childrenContainer}>{children}</View>
          </View>

          {/* Footer */}
          {footer && <View style={styles.footer}>{footer}</View>}

          {/* Step Indicator */}
          {showStepIndicator && totalSteps > 1 && (
            <View style={styles.dotsContainer}>
              {Array.from({ length: totalSteps }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentStep ? styles.activeDot : styles.inactiveDot,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    ...(Platform.OS === "web" && {
      minHeight: webDimension("100vh"),
      height: webDimension("100vh"),
      width: webDimension("100%"),
    }),
  },
  gradient: {
    flex: 1,
    ...(Platform.OS === "web" && {
      minHeight: webDimension("100vh"),
      height: webDimension("100vh"),
      width: webDimension("100%"),
    }),
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl,
    ...(Platform.OS === "web" && {
      width: webDimension("100%"),
    }),
  },
  contentCentered: {
    alignItems: "center",
  },
  mainContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: webDimension("100%"),
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderRadius: 80,
    height: 160,
    width: 160,
    marginBottom: theme.spacing.xl,
    opacity: 0.9,
    ...theme.shadows.lg,
  },
  iconEmoji: {
    fontSize: 64,
    lineHeight: 72,
  },
  title: {
    textAlign: "center",
    marginBottom: theme.spacing.md,
    color: theme.colors.foreground,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: theme.spacing["2xl"],
    paddingHorizontal: theme.spacing.md,
  },
  childrenContainer: {
    width: webDimension("100%"),
  },
  footer: {
    width: webDimension("100%"),
    marginBottom: theme.spacing.lg,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 20,
  },
  dot: {
    borderRadius: 4,
    height: 8,
  },
  activeDot: {
    backgroundColor: theme.colors.primary,
    width: 24,
  },
  inactiveDot: {
    backgroundColor: theme.colors.foregroundTertiary,
    opacity: 0.3,
    width: 8,
  },
}))
