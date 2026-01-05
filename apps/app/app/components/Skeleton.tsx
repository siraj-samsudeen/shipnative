import { useEffect } from "react"
import { View, ViewStyle, DimensionValue } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated"
import { LinearGradient } from "expo-linear-gradient"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

// =============================================================================
// TYPES
// =============================================================================

type Variants = "text" | "circular" | "rectangular" | "rounded"

export interface SkeletonProps {
  /**
   * Skeleton variant
   */
  variant?: Variants
  /**
   * Width (number for pixels, string for percentage)
   */
  width?: number | string
  /**
   * Height (number for pixels, string for percentage)
   */
  height?: number | string
  /**
   * Border radius (only for rectangular variant)
   */
  borderRadius?: number
  /**
   * Animation type: "shimmer" for horizontal sweep, "pulse" for opacity fade
   */
  animation?: "shimmer" | "pulse"
  /**
   * Additional style
   */
  style?: ViewStyle
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Skeleton loading placeholder component with shimmer animation.
 *
 * @example
 * // Text skeleton with shimmer
 * <Skeleton variant="text" width="80%" />
 *
 * // Circular skeleton (avatar)
 * <Skeleton variant="circular" width={48} height={48} />
 *
 * // Rectangular skeleton (card)
 * <Skeleton variant="rectangular" width="100%" height={200} />
 *
 * // Rounded skeleton with pulse animation
 * <Skeleton variant="rounded" width="100%" height={100} animation="pulse" />
 */
export function Skeleton(props: SkeletonProps) {
  const {
    variant = "rectangular",
    width = "100%",
    height,
    borderRadius,
    animation = "shimmer",
    style,
  } = props

  const { theme } = useUnistyles()

  // Animation value for shimmer/pulse effect
  const animationValue = useSharedValue(0)

  useEffect(() => {
    animationValue.value = withRepeat(
      withTiming(1, {
        duration: animation === "shimmer" ? 1500 : 1200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      animation === "pulse", // Reverse for pulse, not for shimmer
    )
  }, [animationValue, animation])

  // Get dimensions based on variant
  const getDimensions = (): { width: DimensionValue; height: DimensionValue } => {
    switch (variant) {
      case "text":
        return { width: width as DimensionValue, height: (height ?? 16) as DimensionValue }
      case "circular":
        const size = typeof width === "number" ? width : 40
        return { width: size as DimensionValue, height: (height ?? size) as DimensionValue }
      case "rounded":
        return { width: width as DimensionValue, height: (height ?? 40) as DimensionValue }
      default:
        return { width: width as DimensionValue, height: (height ?? 100) as DimensionValue }
    }
  }

  // Get border radius based on variant
  const getBorderRadius = (): number => {
    if (borderRadius !== undefined) return borderRadius
    switch (variant) {
      case "circular":
        return 9999
      case "rounded":
        return theme.radius.md
      case "text":
        return theme.radius.xs
      default:
        return theme.radius.sm
    }
  }

  const dimensions = getDimensions()
  const computedBorderRadius = getBorderRadius()

  // Animated shimmer style - horizontal sweep
  const shimmerStyle = useAnimatedStyle(() => {
    if (animation === "pulse") {
      return {
        opacity: interpolate(animationValue.value, [0, 0.5, 1], [0.4, 0.7, 0.4]),
      }
    }
    // Shimmer animation - translate gradient from left to right
    return {
      transform: [
        {
          translateX: interpolate(animationValue.value, [0, 1], [-200, 200]),
        },
      ],
    }
  })

  // Pulse animation (simpler, no gradient)
  if (animation === "pulse") {
    return (
      <Animated.View
        style={[
          styles.skeleton,
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: computedBorderRadius,
          },
          shimmerStyle,
          style,
        ]}
      />
    )
  }

  // Shimmer animation with gradient sweep
  return (
    <View
      style={[
        styles.skeleton,
        {
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: computedBorderRadius,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
        <LinearGradient
          colors={[
            "transparent",
            theme.colors.backgroundTertiary,
            "transparent",
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  )
}

// =============================================================================
// SKELETON GROUP
// =============================================================================

export interface SkeletonGroupProps {
  /**
   * Number of skeleton items
   */
  count?: number
  /**
   * Gap between items
   */
  gap?: number
  /**
   * Children skeletons
   */
  children?: React.ReactNode
  /**
   * Additional style
   */
  style?: ViewStyle
}

/**
 * Group multiple skeletons together.
 *
 * @example
 * // Multiple text lines
 * <SkeletonGroup count={3} gap={8}>
 *   <Skeleton variant="text" width="100%" />
 *   <Skeleton variant="text" width="80%" />
 *   <Skeleton variant="text" width="60%" />
 * </SkeletonGroup>
 */
export function SkeletonGroup(props: SkeletonGroupProps) {
  const { count = 1, gap = 8, children, style } = props

  if (children) {
    return <View style={[styles.group, { gap }, style]}>{children}</View>
  }

  return (
    <View style={[styles.group, { gap }, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} variant="text" width={`${100 - index * 10}%`} />
      ))}
    </View>
  )
}

// =============================================================================
// SKELETON PRESETS
// =============================================================================

/**
 * Pre-built skeleton for card layouts
 */
export function SkeletonCard(props: { style?: ViewStyle }) {
  return (
    <View style={[styles.cardPreset, props.style]}>
      <Skeleton variant="rectangular" width="100%" height={120} />
      <View style={styles.cardPresetContent}>
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="100%" height={14} />
        <Skeleton variant="text" width="40%" height={14} />
      </View>
    </View>
  )
}

/**
 * Pre-built skeleton for list item layouts
 */
export function SkeletonListItem(props: { style?: ViewStyle; showAvatar?: boolean }) {
  const { showAvatar = true, style } = props
  return (
    <View style={[styles.listItemPreset, style]}>
      {showAvatar && <Skeleton variant="circular" width={48} height={48} />}
      <View style={styles.listItemPresetContent}>
        <Skeleton variant="text" width="60%" height={16} />
        <Skeleton variant="text" width="80%" height={14} />
      </View>
    </View>
  )
}

/**
 * Pre-built skeleton for paragraph text
 */
export function SkeletonParagraph(props: { lines?: number; style?: ViewStyle }) {
  const { lines = 3, style } = props
  return (
    <SkeletonGroup gap={8} style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? "60%" : "100%"}
          height={14}
        />
      ))}
    </SkeletonGroup>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  skeleton: {
    backgroundColor: theme.colors.backgroundSecondary,
    overflow: "hidden",
  },
  shimmerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "200%",
  },
  shimmerGradient: {
    flex: 1,
    width: "50%",
  },
  group: {
    flexDirection: "column",
  },
  cardPreset: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.card,
    overflow: "hidden",
  },
  cardPresetContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  listItemPreset: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  listItemPresetContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
}))
