import { forwardRef, ForwardedRef } from "react"
/* eslint-disable no-restricted-imports -- This is the wrapper component that needs the underlying RN Text */
import {
  Text as RNText,
  type TextProps as RNTextProps,
  type StyleProp,
  type TextStyle,
} from "react-native"
/* eslint-enable no-restricted-imports */
import { useTranslation } from "react-i18next"
import { StyleSheet } from "react-native-unistyles"

import { type TxKeyPath } from "@/i18n"

// =============================================================================
// TYPES
// =============================================================================

type Sizes = "xxs" | "xs" | "sm" | "md" | "base" | "lg" | "xl" | "xxl" | "2xl" | "3xl" | "4xl"
type Weights = "regular" | "normal" | "medium" | "semiBold" | "bold"
type Presets =
  | "default"
  | "bold"
  | "heading"
  | "subheading"
  | "label"
  | "caption"
  | "formHelper"
  | "formLabel"

export interface TextProps extends RNTextProps {
  /**
   * Text to display if not using `tx` or nested components.
   */
  text?: string
  /**
   * i18n translation key
   */
  tx?: TxKeyPath
  /**
   * i18n translation options
   */
  txOptions?: Record<string, unknown>
  /**
   * Text preset - applies predefined styles
   */
  preset?: Presets
  /**
   * Font size
   */
  size?: Sizes
  /**
   * Font weight
   */
  weight?: Weights
  /**
   * Text color (semantic name from theme)
   */
  color?: "primary" | "secondary" | "tertiary" | "error" | "success" | "warning" | "link"
  /**
   * Optional style overrides
   */
  style?: StyleProp<TextStyle>
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Text component with built-in theme support and variants.
 *
 * @example
 * // Basic usage
 * <Text>Hello World</Text>
 *
 * // With preset
 * <Text preset="heading">Page Title</Text>
 *
 * // With size and weight
 * <Text size="lg" weight="bold">Large Bold Text</Text>
 *
 * // With i18n
 * <Text tx="common.welcome" />
 *
 * // With custom color
 * <Text color="error">Error message</Text>
 */
export const Text = forwardRef(function Text(props: TextProps, ref: ForwardedRef<RNText>) {
  const {
    text,
    tx,
    txOptions,
    preset = "default",
    size,
    weight,
    color,
    children,
    style: $styleOverride,
    ...rest
  } = props

  // Use useTranslation hook for reactive language changes
  const { t } = useTranslation()

  // Get translated text if tx is provided
  const i18nText = tx ? t(tx, txOptions as Record<string, string>) : null
  const content = i18nText || text || children

  // Apply variants - map "default" to undefined for Unistyles
  const presetForStyles = preset === "default" ? undefined : preset
  styles.useVariants({
    preset: presetForStyles,
    size: size || getDefaultSize(preset),
    weight: weight || getDefaultWeight(preset),
    color: color || "primary",
  })

  return (
    <RNText ref={ref} style={[styles.base, $styleOverride]} {...rest}>
      {content}
    </RNText>
  )
})

// =============================================================================
// HELPERS
// =============================================================================

function getDefaultSize(preset: Presets): Sizes {
  switch (preset) {
    case "heading":
      return "3xl"
    case "subheading":
      return "xl"
    case "label":
    case "formLabel":
      return "sm"
    case "caption":
    case "formHelper":
      return "xs"
    default:
      return "base"
  }
}

function getDefaultWeight(preset: Presets): Weights {
  switch (preset) {
    case "heading":
    case "bold":
      return "bold"
    case "subheading":
    case "label":
    case "formLabel":
      return "medium"
    default:
      return "regular"
  }
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  base: {
    variants: {
      preset: {
        default: {},
        bold: {},
        heading: {},
        subheading: {},
        label: {},
        caption: {},
        formHelper: {},
        formLabel: {},
      },
      size: {
        "xxs": {
          fontSize: theme.typography.sizes.xs,
          lineHeight: theme.typography.lineHeights.xs,
        },
        "xs": {
          fontSize: theme.typography.sizes.xs,
          lineHeight: theme.typography.lineHeights.xs,
        },
        "sm": {
          fontSize: theme.typography.sizes.sm,
          lineHeight: theme.typography.lineHeights.sm,
        },
        "md": {
          fontSize: theme.typography.sizes.base,
          lineHeight: theme.typography.lineHeights.base,
        },
        "base": {
          fontSize: theme.typography.sizes.base,
          lineHeight: theme.typography.lineHeights.base,
        },
        "lg": {
          fontSize: theme.typography.sizes.lg,
          lineHeight: theme.typography.lineHeights.lg,
        },
        "xl": {
          fontSize: theme.typography.sizes.xl,
          lineHeight: theme.typography.lineHeights.xl,
        },
        "xxl": {
          fontSize: theme.typography.sizes["2xl"],
          lineHeight: theme.typography.lineHeights["2xl"],
        },
        "2xl": {
          fontSize: theme.typography.sizes["2xl"],
          lineHeight: theme.typography.lineHeights["2xl"],
        },
        "3xl": {
          fontSize: theme.typography.sizes["3xl"],
          lineHeight: theme.typography.lineHeights["3xl"],
        },
        "4xl": {
          fontSize: theme.typography.sizes["4xl"],
          lineHeight: theme.typography.lineHeights["4xl"],
        },
      },
      weight: {
        // Font family names are platform-specific (handled in theme/unistyles.ts)
        // Web uses key names from customFontsToLoad (e.g., "spaceGroteskBold")
        // Native uses PostScript names (e.g., "SpaceGrotesk-Bold")
        regular: {
          fontFamily: theme.typography.fonts.regular,
        },
        normal: {
          fontFamily: theme.typography.fonts.regular,
        },
        medium: {
          fontFamily: theme.typography.fonts.medium,
        },
        semiBold: {
          fontFamily: theme.typography.fonts.semiBold,
        },
        bold: {
          fontFamily: theme.typography.fonts.bold,
        },
      },
      color: {
        primary: {
          color: theme.colors.foreground,
        },
        secondary: {
          color: theme.colors.foregroundSecondary,
        },
        tertiary: {
          color: theme.colors.foregroundTertiary,
        },
        error: {
          color: theme.colors.error,
        },
        success: {
          color: theme.colors.success,
        },
        warning: {
          color: theme.colors.warning,
        },
        link: {
          color: theme.colors.link,
        },
      },
    },
  },
}))
