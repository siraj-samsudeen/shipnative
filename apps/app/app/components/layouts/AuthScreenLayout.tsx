/**
 * AuthScreenLayout - Consistent layout for authentication screens
 *
 * Use this layout for:
 * - Login, Register, ForgotPassword screens
 * - Welcome/Get Started screens
 * - Any authentication-related modal-style screens
 *
 * Features:
 * - Gradient background (theme-aware for dark mode)
 * - Modal card that slides up from bottom (mobile) or centered (web/tablet)
 * - Consistent spacing, typography, and styling
 * - Keyboard avoiding behavior
 * - Safe area handling
 *
 * @example
 * ```tsx
 * <AuthScreenLayout
 *   title="Welcome Back"
 *   subtitle="Sign in to continue"
 *   showCloseButton
 *   onClose={() => navigation.goBack()}
 * >
 *   <TextField label="Email" />
 *   <Button title="Sign In" />
 * </AuthScreenLayout>
 * ```
 */

import { Children, ReactNode } from "react"
import {
  View,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ViewStyle,
  TouchableOpacity,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { ScrollView } from "../ScrollView"
import { Text } from "../Text"

// =============================================================================
// TYPES
// =============================================================================

export interface AuthScreenLayoutProps {
  /** Main heading text */
  title?: string
  /** Subtitle/description below the title */
  subtitle?: string
  /** Screen content (form fields, buttons, etc.) */
  children: ReactNode
  /** Show close/back button in top right */
  showCloseButton?: boolean
  /** Handler for close button */
  onClose?: () => void
  /** Show back arrow button in top left */
  showBackButton?: boolean
  /** Handler for back button */
  onBack?: () => void
  /** Optional emoji/icon to display above title */
  headerIcon?: string
  /** Whether content should be scrollable (default: true) */
  scrollable?: boolean
  /** Additional style for the card container */
  cardStyle?: ViewStyle
  /** Whether to center content vertically in the card (default: false) */
  centerContent?: boolean
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MODAL_MAX_WIDTH = 480
const BREAKPOINT_TABLET = 768

// =============================================================================
// COMPONENT
// =============================================================================

export const AuthScreenLayout = ({
  title,
  subtitle,
  children,
  showCloseButton = false,
  onClose,
  showBackButton = false,
  onBack,
  headerIcon,
  scrollable = true,
  cardStyle,
  centerContent = false,
}: AuthScreenLayoutProps) => {
  const { theme } = useUnistyles()
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  // Web can complain if a View receives a raw string/number child. Normalize children so
  // any stray whitespace or primitive nodes are filtered out before rendering.
  const safeChildren = Children.toArray(children).filter(
    (child) => typeof child !== "string" && typeof child !== "number",
  )

  // Responsive layout
  const isTabletOrLarger = windowWidth >= BREAKPOINT_TABLET
  const isWeb = Platform.OS === "web"

  // Content wrapper - either ScrollView or View
  const ContentWrapper = scrollable ? ScrollView : View

  const contentWrapperProps = scrollable
    ? {
        style: [styles.scrollArea, isWeb && styles.scrollAreaWeb],
        contentContainerStyle: [
          styles.scrollContent,
          centerContent && styles.centeredContent,
          { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) },
        ],
        keyboardShouldPersistTaps: "handled" as const,
        showsVerticalScrollIndicator: false,
      }
    : {
        style: [
          styles.staticContent,
          centerContent && styles.centeredContent,
          { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) },
        ],
      }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientMiddle, theme.colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[
            styles.keyboardView,
            isWeb && isTabletOrLarger && styles.keyboardViewCentered,
          ]}
        >
          <View
            style={[
              styles.modalCard,
              // On mobile (non-centered), give the card flex to expand
              !isWeb && styles.modalCardMobile,
              isWeb && isTabletOrLarger && styles.modalCardCentered,
              { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) },
              cardStyle,
            ]}
          >
            <ContentWrapper {...contentWrapperProps}>
              {/* Close Button (top right) */}
              {showCloseButton && onClose && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={styles.closeButtonCircle}>
                    <Ionicons
                      name="close"
                      size={24}
                      color={theme.colors.foreground}
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* Back Button (top left) */}
              {showBackButton && onBack && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={onBack}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={styles.backButtonCircle}>
                    <Ionicons
                      name="arrow-back"
                      size={24}
                      color={theme.colors.foreground}
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* Header Icon */}
              {headerIcon && (
                <View style={styles.headerIconContainer}>
                  <Text style={styles.headerIcon}>{headerIcon}</Text>
                </View>
              )}

              {/* Title */}
              {title && (
                <Text size="3xl" weight="bold" style={styles.title}>
                  {title}
                </Text>
              )}

              {/* Subtitle */}
              {subtitle && (
                <Text color="secondary" style={styles.subtitle}>
                  {subtitle}
                </Text>
              )}

              {/* Content */}
              <View style={styles.content}>{safeChildren}</View>
            </ContentWrapper>
          </View>
        </KeyboardAvoidingView>
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
    backgroundColor: theme.colors.background,
    ...(Platform.OS === "web" && {
      minHeight: "100vh" as unknown as number,
      height: "100vh" as unknown as number,
      width: "100%" as unknown as number,
    }),
  },
  gradient: {
    flex: 1,
    ...(Platform.OS === "web" && {
      height: "100vh" as unknown as number,
      width: "100%" as unknown as number,
    }),
  },
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
    ...(Platform.OS === "web" && {
      minHeight: "100vh" as unknown as number,
      height: "100vh" as unknown as number,
      width: "100%" as unknown as number,
    }),
  },
  keyboardViewCentered: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius["3xl"],
    borderTopRightRadius: theme.radius["3xl"],
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    ...theme.shadows.xl,
    width: "100%",
  },
  modalCardMobile: {
    // Limit height to show gradient at top
    maxHeight: "85%",
  },
  modalCardCentered: {
    borderRadius: theme.radius["3xl"],
    maxWidth: MODAL_MAX_WIDTH,
    width: "100%",
    // Size to fit content with reasonable limits
    minHeight: 400,
    maxHeight: "80%",
  },
  scrollContent: {
    paddingBottom: theme.spacing.lg,
  },
  staticContent: {
    width: "100%",
  },
  scrollArea: {
    flex: 1,
    width: "100%",
    minHeight: 0,
  },
  scrollAreaWeb: {
    width: "100%",
    minHeight: 0,
  },
  centeredContent: {
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing.md,
    top: theme.spacing.md,
    zIndex: 10,
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    left: theme.spacing.md,
    top: theme.spacing.md,
    zIndex: 10,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconContainer: {
    marginBottom: theme.spacing.md,
    alignItems: "center",
  },
  headerIcon: {
    fontSize: 48,
    lineHeight: 56,
    textAlign: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  content: {
    // No flex constraint - let content size naturally
  },
}))
