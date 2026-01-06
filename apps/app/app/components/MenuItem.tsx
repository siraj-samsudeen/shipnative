import React, { ReactNode } from "react"
import { Pressable, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { Text } from "./Text"
import { haptics } from "@/utils/haptics"

// =============================================================================
// TYPES
// =============================================================================

export interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle?: string
  onPress?: () => void
  rightElement?: ReactNode
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Reusable menu item component with press animation.
 * Optimized to prevent recreation of animated values on every render.
 *
 * @example
 * <MenuItem
 *   icon="person-outline"
 *   title="Profile"
 *   subtitle="Edit your profile"
 *   onPress={() => navigate('Profile')}
 * />
 */
export const MenuItem = React.memo<MenuItemProps>(
  ({ icon, title, subtitle, onPress, rightElement }) => {
    const { theme } = useUnistyles()
    const scale = useSharedValue(1)

    const handlePressIn = () => {
      if (onPress) {
        scale.value = withSpring(0.98, SPRING_CONFIG)
      }
    }

    const handlePressOut = () => {
      scale.value = withSpring(1, SPRING_CONFIG)
    }

    const handlePress = () => {
      if (onPress) {
        haptics.listItemPress()
        onPress()
      }
    }

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }))

    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress}
      >
        <Animated.View style={[styles.menuItem, animatedStyle]}>
          <View style={styles.menuIconBox}>
            <Ionicons name={icon} size={22} color={theme.colors.foreground} />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{title}</Text>
            {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
          </View>
          {rightElement || (
            <Ionicons name="chevron-forward" size={20} color={theme.colors.foregroundTertiary} />
          )}
        </Animated.View>
      </Pressable>
    )
  },
)

MenuItem.displayName = "MenuItem"

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  menuItem: {
    alignItems: "center",
    flexDirection: "row",
    padding: theme.spacing.md,
  },
  menuIconBox: {
    alignItems: "center",
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    height: 40,
    justifyContent: "center",
    marginRight: theme.spacing.md,
    width: 40,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fonts.semiBold,
    fontSize: theme.typography.sizes.base,
    lineHeight: theme.typography.lineHeights.base,
  },
  menuSubtitle: {
    color: theme.colors.foregroundSecondary,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
}))
