import { useState, useEffect, ReactNode } from "react"
import { View, Pressable, ViewStyle, LayoutChangeEvent } from "react-native"
import type { TOptions } from "i18next"
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"
import { StyleSheet } from "react-native-unistyles"

import { TxKeyPath } from "@/i18n"
import { SPRING_CONFIG_SOFT } from "@/utils/animations"
import { haptics } from "@/utils/haptics"

import { Text } from "./Text"

// =============================================================================
// TYPES
// =============================================================================

export interface Tab {
  key: string
  title?: string
  /**
   * i18n translation key for tab title
   */
  tx?: TxKeyPath
  /**
   * i18n translation options
   */
  txOptions?: TOptions
  icon?: ReactNode
  badge?: number
}

export interface TabsProps {
  /**
   * Array of tab items
   */
  tabs: Tab[]
  /**
   * Currently active tab key
   */
  activeTab: string
  /**
   * Tab change handler
   */
  onTabChange: (key: string) => void
  /**
   * Tab variant style
   */
  variant?: "default" | "pills" | "underline"
  /**
   * Full width tabs
   */
  fullWidth?: boolean
  /**
   * Enable haptic feedback
   */
  haptic?: boolean
  /**
   * Additional style
   */
  style?: ViewStyle
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Use softer spring config for tab indicator animations
const SPRING_CONFIG = SPRING_CONFIG_SOFT

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Animated tabs component with multiple variants.
 *
 * @example
 * // Basic tabs
 * const [activeTab, setActiveTab] = useState("tab1")
 * <Tabs
 *   tabs={[
 *     { key: "tab1", title: "Overview" },
 *     { key: "tab2", title: "Settings" },
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 *
 * // Pills variant
 * <Tabs variant="pills" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
 *
 * // With badges
 * <Tabs
 *   tabs={[
 *     { key: "inbox", title: "Inbox", badge: 5 },
 *     { key: "sent", title: "Sent" },
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 */
export function Tabs(props: TabsProps) {
  const {
    tabs,
    activeTab,
    onTabChange,
    variant = "default",
    fullWidth = false,
    haptic = true,
    style,
  } = props

  // Track tab positions for indicator animation
  const [tabLayouts, setTabLayouts] = useState<Record<string, { x: number; width: number }>>({})
  const indicatorX = useSharedValue(0)
  const indicatorWidth = useSharedValue(0)

  // Update indicator position when active tab changes
  useEffect(() => {
    const layout = tabLayouts[activeTab]
    if (layout) {
      indicatorX.value = withSpring(layout.x, SPRING_CONFIG)
      indicatorWidth.value = withSpring(layout.width, SPRING_CONFIG)
    }
  }, [activeTab, tabLayouts, indicatorX, indicatorWidth])

  const handleTabLayout = (key: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout
    setTabLayouts((prev) => ({
      ...prev,
      [key]: { x, width },
    }))
  }

  const handleTabPress = (key: string) => {
    if (haptic) {
      haptics.selection()
    }
    onTabChange(key)
  }

  // Animated indicator style
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }))

  // Apply variant styles - cast to handle "default" which isn't a valid style variant
  const styleVariant = variant === "default" ? undefined : variant
  styles.useVariants({ variant: styleVariant })

  return (
    <View style={[styles.container, fullWidth && styles.fullWidth, style]}>
      {/* Animated indicator - rendered BEFORE tabs so it's behind them */}
      {variant !== "pills" && (
        <Animated.View
          style={[
            styles.indicator,
            variant === "underline" && styles.indicatorUnderline,
            indicatorStyle,
          ]}
        />
      )}

      <View style={styles.tabList}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab

          return (
            <Pressable
              key={tab.key}
              onPress={() => handleTabPress(tab.key)}
              onLayout={(e) => handleTabLayout(tab.key, e)}
              style={[styles.tab, fullWidth && styles.tabFullWidth, isActive && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              {tab.icon && <View style={styles.tabIcon}>{tab.icon}</View>}
              <Text
                weight={isActive ? "semiBold" : "medium"}
                style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}
                text={tab.title}
                tx={tab.tx}
                txOptions={tab.txOptions}
              />
              {tab.badge !== undefined && tab.badge > 0 && (
                <View style={styles.badge}>
                  <Text size="xs" style={styles.badgeText}>
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  container: {
    // Default styles (applied when variant is undefined/"default")
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xxs,
    variants: {
      variant: {
        pills: {
          backgroundColor: theme.colors.transparent,
          borderRadius: 0,
          padding: 0,
          gap: theme.spacing.xs,
        },
        underline: {
          backgroundColor: theme.colors.transparent,
          borderRadius: 0,
          padding: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
      },
    },
  },
  fullWidth: {
    width: "100%",
  },
  tabList: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: theme.spacing.xs,
  },
  tabFullWidth: {
    flex: 1,
  },
  tabActive: {
    // Style applied via indicator for default/underline variants
  },
  tabIcon: {
    marginRight: theme.spacing.xxs,
  },
  tabText: {
    fontSize: theme.typography.sizes.sm,
  },
  tabTextActive: {
    color: theme.colors.foreground,
  },
  tabTextInactive: {
    color: theme.colors.foregroundSecondary,
  },
  indicator: {
    position: "absolute",
    top: theme.spacing.xxs,
    bottom: theme.spacing.xxs,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    zIndex: 0,
    ...theme.shadows.sm,
  },
  indicatorUnderline: {
    top: "auto",
    height: 2,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xxs,
  },
  badgeText: {
    color: theme.colors.card,
    fontSize: 10,
    fontFamily: theme.typography.fonts.semiBold,
  },
}))
