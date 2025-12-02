import { Children, ComponentType, ReactNode, useMemo } from "react"
import { ActivityIndicator, StyleProp, View, ViewStyle } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { haptics } from "@/utils/haptics"

import { Text, TextProps } from "./Text"

// =============================================================================
// TYPES
// =============================================================================

type Variants = "filled" | "outlined" | "ghost" | "secondary" | "danger"
type Sizes = "sm" | "md" | "lg"

export interface ButtonAccessoryProps {
  variant: Variants
  size: Sizes
  disabled: boolean
  pressed: boolean
  style?: ViewStyle
}

export interface ButtonProps {
  /**
   * Button text
   */
  text?: string
  /**
   * i18n translation key
   */
  tx?: TextProps["tx"]
  /**
   * i18n translation options
   */
  txOptions?: TextProps["txOptions"]
  /**
   * Button variant style
   */
  variant?: Variants
  /**
   * Button size
   */
  size?: Sizes
  /**
   * Show loading spinner
   */
  loading?: boolean
  /**
   * Button children (alternative to text)
   */
  children?: ReactNode
  /**
   * Left side accessory component
   */
  LeftAccessory?: ComponentType<ButtonAccessoryProps>
  /**
   * Right side accessory component
   */
  RightAccessory?: ComponentType<ButtonAccessoryProps>
  /**
   * Additional text props
   */
  TextProps?: Omit<TextProps, "text" | "tx" | "txOptions">
  /**
   * Press handler
   */
  onPress?: () => void
  /**
   * Long press handler
   */
  onLongPress?: () => void
  /**
   * Disabled state
   */
  disabled?: boolean
  /**
   * Enable haptic feedback (default: true)
   */
  haptic?: boolean
  /**
   * Additional style
   */
  style?: StyleProp<ViewStyle>
  /**
   * Accessibility label
   */
  accessibilityLabel?: string
  /**
   * Test ID for testing
   */
  testID?: string
}

// Spring config for snappy animations
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 400,
  mass: 0.5,
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * A customizable button component with multiple variants and sizes.
 * Includes haptic feedback and smooth microanimations.
 *
 * @example
 * // Basic filled button
 * <Button text="Press Me" onPress={() => {}} />
 *
 * // Outlined button
 * <Button text="Outlined" variant="outlined" />
 *
 * // Button with icon
 * <Button
 *   text="With Icon"
 *   LeftAccessory={({ variant }) => <Icon name="star" />}
 * />
 *
 * // Loading state
 * <Button text="Loading" loading />
 *
 * // Different sizes
 * <Button text="Small" size="sm" />
 * <Button text="Large" size="lg" />
 */
export function Button(props: ButtonProps) {
  const {
    text,
    tx,
    txOptions,
    variant = "filled",
    size = "md",
    loading = false,
    disabled,
    children,
    LeftAccessory,
    RightAccessory,
    TextProps,
    onPress,
    onLongPress,
    haptic = true,
    style,
    testID,
  } = props

  const { theme } = useUnistyles()
  const isDisabled = disabled || loading

  // Animation values
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)

  // Apply variants to styles
  styles.useVariants({ variant, size })

  const textColor = useMemo(() => {
    switch (variant) {
      case "filled":
      case "danger":
        return theme.colors.primaryForeground
      case "outlined":
      case "ghost":
        return theme.colors.foreground
      case "secondary":
        return theme.colors.foreground
    }
  }, [variant, theme])

  const spinnerColor = textColor

  const accessoryProps: ButtonAccessoryProps = {
    variant,
    size,
    disabled: isDisabled,
    pressed: false,
  }

  // Gesture handler
  const tapGesture = Gesture.Tap()
    .enabled(!isDisabled)
    .onBegin(() => {
      scale.value = withSpring(0.96, SPRING_CONFIG)
      opacity.value = withTiming(0.9, { duration: 50 })
    })
    .onFinalize(() => {
      scale.value = withSpring(1, SPRING_CONFIG)
      opacity.value = withTiming(1, { duration: 100 })
    })
    .onEnd(() => {
      if (haptic) {
        runOnJS(haptics.buttonPress)()
      }
      if (onPress) {
        runOnJS(onPress)()
      }
    })

  const longPressGesture = Gesture.LongPress()
    .enabled(!isDisabled && !!onLongPress)
    .minDuration(500)
    .onStart(() => {
      scale.value = withSpring(0.94, SPRING_CONFIG)
      if (haptic) {
        runOnJS(haptics.longPress)()
      }
      if (onLongPress) {
        runOnJS(onLongPress)()
      }
    })
    .onFinalize(() => {
      scale.value = withSpring(1, SPRING_CONFIG)
    })

  const composedGesture = Gesture.Race(tapGesture, longPressGesture)

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(opacity.value, [0.9, 1], [0.85, 1]),
  }))

  const renderLabel = useMemo(() => {
    if (children !== null && children !== undefined) {
      const childArray = Children.toArray(children)
      const allTextChildren = childArray.every(
        (child) => typeof child === "string" || typeof child === "number",
      )

      if (allTextChildren) {
        return (
          <Text
            weight="semiBold"
            {...TextProps}
            style={[{ color: textColor }, TextProps?.style]}
          >
            {childArray.join("")}
          </Text>
        )
      }

      return children
    }

    return (
      <Text
        text={text}
        tx={tx}
        txOptions={txOptions}
        weight="semiBold"
        {...TextProps}
        style={[{ color: textColor }, TextProps?.style]}
      />
    )
  }, [TextProps, children, text, textColor, tx, txOptions])

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[styles.container, isDisabled && styles.disabled, animatedStyle, style]}
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={spinnerColor} style={styles.spinner} />
        ) : (
          <>
            {LeftAccessory && (
              <View style={styles.leftAccessory}>
                <LeftAccessory {...accessoryProps} pressed={false} />
              </View>
            )}

            {renderLabel}

            {RightAccessory && (
              <View style={styles.rightAccessory}>
                <RightAccessory {...accessoryProps} pressed={false} />
              </View>
            )}
          </>
        )}
      </Animated.View>
    </GestureDetector>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    variants: {
      variant: {
        filled: {
          backgroundColor: theme.colors.primary,
        },
        outlined: {
          backgroundColor: theme.colors.transparent,
          borderWidth: 1.5,
          borderColor: theme.colors.border,
        },
        ghost: {
          backgroundColor: theme.colors.transparent,
        },
        secondary: {
          backgroundColor: theme.colors.secondary,
        },
        danger: {
          backgroundColor: theme.colors.error,
        },
      },
      size: {
        sm: {
          height: theme.sizes.button.sm,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.md,
          gap: theme.spacing.xs,
        },
        md: {
          height: theme.sizes.button.md,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          gap: theme.spacing.sm,
        },
        lg: {
          height: theme.sizes.button.lg,
          paddingHorizontal: theme.spacing.xl,
          borderRadius: theme.radius.lg,
          gap: theme.spacing.sm,
        },
      },
    },
  },
  disabled: {
    opacity: 0.5,
  },
  spinner: {
    marginRight: 0,
  },
  leftAccessory: {
    marginRight: theme.spacing.xs,
  },
  rightAccessory: {
    marginLeft: theme.spacing.xs,
  },
}))
