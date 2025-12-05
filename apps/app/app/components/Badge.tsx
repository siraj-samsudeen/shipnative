import { View } from "react-native"
import type { TOptions } from "i18next"
import { StyleSheet } from "react-native-unistyles"

import { TxKeyPath } from "@/i18n"

import { Text } from "./Text"

// =============================================================================
// TYPES
// =============================================================================

type Variants = "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info"
type Sizes = "sm" | "md" | "lg"

export interface BadgeProps {
  /**
   * Badge text
   */
  text?: string
  /**
   * i18n translation key for badge text
   */
  tx?: TxKeyPath
  /**
   * i18n translation options
   */
  txOptions?: TOptions
  /**
   * Badge variant/color
   */
  variant?: Variants
  /**
   * Badge size
   */
  size?: Sizes
  /**
   * Show as dot (no text)
   */
  dot?: boolean
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Badge component for status indicators, counts, or labels.
 *
 * @example
 * // Basic badge
 * <Badge text="New" />
 *
 * // Status badges
 * <Badge text="Active" variant="success" />
 * <Badge text="Pending" variant="warning" />
 * <Badge text="Error" variant="error" />
 *
 * // Dot indicator
 * <Badge dot variant="error" />
 *
 * // Different sizes
 * <Badge text="Small" size="sm" />
 * <Badge text="Large" size="lg" />
 */
export function Badge(props: BadgeProps) {
  const { text, tx, txOptions, variant = "default", size = "md", dot = false } = props

  // Apply variants - map "default" to undefined for Unistyles
  const variantForStyles = variant === "default" ? undefined : variant
  styles.useVariants({ variant: variantForStyles, size, dot: dot ? "true" : "false" })

  if (dot) {
    return <View style={styles.dot} />
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text} text={text} tx={tx} txOptions={txOptions} />
    </View>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  container: {
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    variants: {
      variant: {
        default: {
          backgroundColor: theme.colors.secondary,
        },
        primary: {
          backgroundColor: theme.colors.primary,
        },
        secondary: {
          backgroundColor: theme.colors.backgroundTertiary,
        },
        success: {
          backgroundColor: theme.colors.successBackground,
        },
        error: {
          backgroundColor: theme.colors.errorBackground,
        },
        warning: {
          backgroundColor: theme.colors.warningBackground,
        },
        info: {
          backgroundColor: theme.colors.infoBackground,
        },
      },
      size: {
        sm: {
          paddingHorizontal: theme.spacing.xs,
          paddingVertical: 2,
          borderRadius: theme.radius.xs,
        },
        md: {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xxs,
          borderRadius: theme.radius.sm,
        },
        lg: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.radius.md,
        },
      },
      dot: {
        true: {},
        false: {},
      },
    },
  },
  text: {
    fontFamily: theme.typography.fonts.medium,
    variants: {
      variant: {
        default: {
          color: theme.colors.foreground,
        },
        primary: {
          color: theme.colors.primaryForeground,
        },
        secondary: {
          color: theme.colors.foreground,
        },
        success: {
          color: theme.colors.successForeground,
        },
        error: {
          color: theme.colors.errorForeground,
        },
        warning: {
          color: theme.colors.warningForeground,
        },
        info: {
          color: theme.colors.infoForeground,
        },
      },
      size: {
        sm: {
          fontSize: 10,
          lineHeight: 14,
        },
        md: {
          fontSize: 12,
          lineHeight: 16,
        },
        lg: {
          fontSize: 14,
          lineHeight: 20,
        },
      },
      dot: {
        true: {},
        false: {},
      },
    },
  },
  dot: {
    variants: {
      variant: {
        default: {
          backgroundColor: theme.colors.foregroundTertiary,
        },
        primary: {
          backgroundColor: theme.colors.primary,
        },
        secondary: {
          backgroundColor: theme.colors.foregroundSecondary,
        },
        success: {
          backgroundColor: theme.colors.success,
        },
        error: {
          backgroundColor: theme.colors.error,
        },
        warning: {
          backgroundColor: theme.colors.warning,
        },
        info: {
          backgroundColor: theme.colors.info,
        },
      },
      size: {
        sm: {
          width: 6,
          height: 6,
          borderRadius: 3,
        },
        md: {
          width: 8,
          height: 8,
          borderRadius: 4,
        },
        lg: {
          width: 12,
          height: 12,
          borderRadius: 6,
        },
      },
      dot: {
        true: {},
        false: {},
      },
    },
  },
}))
