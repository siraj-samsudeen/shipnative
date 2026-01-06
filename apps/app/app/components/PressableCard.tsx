import React, { ReactNode } from "react"
import { Pressable, ViewStyle } from "react-native"
import type { StyleProp } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from "react-native-reanimated"

import { haptics } from "@/utils/haptics"

// =============================================================================
// TYPES
// =============================================================================

export interface PressableCardProps {
  children: ReactNode
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  containerStyle?: StyleProp<ViewStyle>
  delay?: number
  disabled?: boolean
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Spring config for animations
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Reusable pressable card component with scale animation.
 * Optimized to prevent recreation of animated values on every render.
 *
 * @example
 * <PressableCard onPress={() => console.log('pressed')} delay={100}>
 *   <Text>Card content</Text>
 * </PressableCard>
 */
export const PressableCard = React.memo<PressableCardProps>(
  ({ children, onPress, style, containerStyle, delay = 0, disabled = false }) => {
    const scale = useSharedValue(1)

    const handlePressIn = () => {
      if (!disabled && onPress) {
        scale.value = withSpring(0.97, SPRING_CONFIG)
      }
    }

    const handlePressOut = () => {
      scale.value = withSpring(1, SPRING_CONFIG)
    }

    const handlePress = () => {
      if (!disabled && onPress) {
        haptics.cardPress()
        onPress()
      }
    }

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }))

    return (
      <Animated.View entering={FadeInDown.delay(delay).springify()} style={containerStyle}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || !onPress}
        >
          <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
        </Pressable>
      </Animated.View>
    )
  },
)

PressableCard.displayName = "PressableCard"
