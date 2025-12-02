import { ErrorInfo } from "react"
import { ScrollView, View, Platform } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { Button } from "@/components/Button"
import { Text } from "@/components/Text"

export interface ErrorDetailsProps {
  error: Error
  errorInfo: ErrorInfo | null
  onReset(): void
}

/**
 * Renders the error details screen with Unistyles 3.0.
 *
 * Displays a user-friendly error message with technical details
 * and a reset button to recover from the error.
 *
 * @param {ErrorDetailsProps} props - The props for the `ErrorDetails` component.
 * @returns {JSX.Element} The rendered `ErrorDetails` component.
 */
export function ErrorDetails(props: ErrorDetailsProps) {
  const { theme } = useUnistyles()
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.errorBackground, theme.colors.background, theme.colors.background]}
        style={styles.gradient}
      >
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + theme.spacing.lg,
              paddingBottom: insets.bottom + theme.spacing.lg,
            },
          ]}
        >
          {/* Error Icon and Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>⚠️</Text>
            </View>
            <Text style={styles.title} weight="bold" size="3xl">
              Oops!
            </Text>
            <Text style={styles.subtitle} color="secondary" size="lg">
              Something went wrong
            </Text>
          </View>

          {/* Friendly Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.message} size="base">
              We apologize for the inconvenience. The app encountered an unexpected error. Please
              try resetting the app.
            </Text>
          </View>

          {/* Error Details */}
          <ScrollView
            style={styles.errorSection}
            contentContainerStyle={styles.errorSectionContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            <View style={styles.errorHeader}>
              <Text style={styles.errorLabel} weight="bold" size="sm" color="secondary">
                ERROR DETAILS
              </Text>
            </View>
            <Text style={styles.errorContent} weight="semiBold" size="sm">
              {`${props.error}`.trim()}
            </Text>
            {props.errorInfo?.componentStack && (
              <>
                <View style={styles.errorDivider} />
                <Text style={styles.stackLabel} weight="bold" size="sm" color="secondary">
                  STACK TRACE
                </Text>
                <Text selectable style={styles.errorBacktrace} size="xs">
                  {`${props.errorInfo.componentStack}`.trim()}
                </Text>
              </>
            )}
          </ScrollView>

          {/* Reset Button */}
          <View style={styles.buttonContainer}>
            <Button
              variant="filled"
              style={styles.resetButton}
              onPress={props.onReset}
              text="Reset App"
            />
          </View>
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
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    alignItems: "center",
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.errorBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    ...theme.shadows.lg,
  },
  iconText: {
    fontSize: 48,
  },
  title: {
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  messageContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  message: {
    textAlign: "center",
    lineHeight: theme.typography.lineHeights.lg,
  },
  errorSection: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
    // Enable mouse wheel scrolling on web
    ...(Platform.OS === "web" && {
      overflowY: "auto" as unknown as "scroll",
    }),
  },
  errorSectionContent: {
    padding: theme.spacing.md,
  },
  errorHeader: {
    marginBottom: theme.spacing.sm,
  },
  errorLabel: {
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  errorContent: {
    color: theme.colors.error,
    lineHeight: theme.typography.lineHeights.base,
    marginBottom: theme.spacing.md,
  },
  errorDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  stackLabel: {
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  errorBacktrace: {
    color: theme.colors.foregroundSecondary,
    lineHeight: theme.typography.lineHeights.sm,
    fontFamily: Platform.select({
      ios: "Courier",
      android: "monospace",
      default: "monospace",
    }),
  },
  buttonContainer: {
    paddingVertical: theme.spacing.md,
  },
  resetButton: {
    backgroundColor: theme.colors.error,
  },
}))
