import { FC } from "react"
import { View, ScrollView, Pressable, Platform, useWindowDimensions } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { Text, Avatar, Badge } from "@/components"
import { ANIMATION } from "@/config/constants"
import type { MainTabScreenProps } from "@/navigators/navigationTypes"
import { useAuthStore, useNotificationStore } from "@/stores"
import { webDimension } from "@/types/webStyles"
import { haptics } from "@/utils/haptics"

// =============================================================================
// TYPES
// =============================================================================

interface HomeScreenProps extends MainTabScreenProps<"Home"> {}

// =============================================================================
// CONSTANTS
// =============================================================================

const isWeb = Platform.OS === "web"
const CONTENT_MAX_WIDTH = 800

// Spring config for animations
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
}

// =============================================================================
// PRESSABLE CARD COMPONENT
// =============================================================================

interface PressableCardProps {
  children: React.ReactNode
  onPress?: () => void
  style?: any
  delay?: number
}

function PressableCard({ children, onPress, style, delay = 0 }: PressableCardProps) {
  const scale = useSharedValue(1)

  const handlePressIn = () => {
    scale.value = withSpring(0.97, SPRING_CONFIG)
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG)
  }

  const handlePress = () => {
    haptics.cardPress()
    onPress?.()
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress}
      >
        <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
      </Pressable>
    </Animated.View>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export const HomeScreen: FC<HomeScreenProps> = function HomeScreen(_props) {
  const { navigation } = _props
  const { theme } = useUnistyles()
  const user = useAuthStore((state) => state.user)
  const { isPushEnabled, togglePush } = useNotificationStore()
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()

  const isLargeScreen = windowWidth > 768
  const contentStyle = isLargeScreen
    ? {
        maxWidth: CONTENT_MAX_WIDTH,
        alignSelf: "center" as const,
        width: webDimension("100%"),
      }
    : {}

  const handleNavigateToComponents = () => {
    navigation.navigate("Components")
  }

  const handleTogglePush = () => {
    haptics.switchChange()
    togglePush()
  }

  const userName = user?.user_metadata?.first_name || user?.email?.split("@")[0] || "User"
  const userInitials = userName.slice(0, 2).toUpperCase()

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientMiddle, theme.colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            contentStyle,
            { paddingTop: insets.top + theme.spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
            <View style={styles.headerLeft}>
              <Avatar fallback={userInitials} size="md" />
              <View style={styles.headerText}>
                <Text size="sm" color="secondary">
                  Good morning,
                </Text>
                <Text size="xl" weight="bold">
                  {userName}
                </Text>
              </View>
            </View>
            <Pressable style={styles.notificationButton} onPress={handleTogglePush}>
              <Ionicons
                name={isPushEnabled ? "notifications" : "notifications-off-outline"}
                size={24}
                color={theme.colors.foreground}
              />
              {isPushEnabled && <Badge dot variant="error" size="sm" />}
            </Pressable>
          </Animated.View>

          {/* Featured Card */}
          <PressableCard style={styles.featuredCard} delay={ANIMATION.STAGGER_DELAY}>
            <View style={styles.featuredContent}>
              <Badge text="Daily Challenge" variant="info" size="sm" />
              <View style={styles.titleRow}>
                <Text style={styles.emoji}>🧘‍♀️</Text>
                <Text size="2xl" weight="bold" style={styles.featuredTitle}>
                  Meditate for 10 mins
                </Text>
              </View>
              <Text color="secondary" style={styles.featuredSubtitle}>
                Clear your mind and start fresh.
              </Text>
              <Pressable style={styles.startButton} onPress={() => haptics.buttonPress()}>
                <Text weight="semiBold" style={styles.startButtonText}>
                  Start Now
                </Text>
                <Ionicons name="play-circle" size={22} color={theme.colors.card} />
              </Pressable>
            </View>
          </PressableCard>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <PressableCard style={styles.statCard} delay={ANIMATION.STAGGER_DELAY * 2}>
              <Text size="2xl" weight="bold">
                12
              </Text>
              <Text size="sm" color="secondary">
                Streak
              </Text>
            </PressableCard>
            <PressableCard style={styles.statCard} delay={ANIMATION.STAGGER_DELAY * 2.5}>
              <Text size="2xl" weight="bold">
                85%
              </Text>
              <Text size="sm" color="secondary">
                Completed
              </Text>
            </PressableCard>
            <PressableCard style={styles.statCard} delay={ANIMATION.STAGGER_DELAY * 3}>
              <Text size="2xl" weight="bold">
                4.8
              </Text>
              <Text size="sm" color="secondary">
                Rating
              </Text>
            </PressableCard>
          </View>

          {/* Quick Actions */}
          <Animated.View entering={FadeInDown.delay(ANIMATION.STAGGER_DELAY * 3.5).springify()}>
            <Text size="xl" weight="bold" style={styles.sectionTitle}>
              Explore
            </Text>
          </Animated.View>

          <PressableCard
            style={styles.actionCard}
            onPress={handleNavigateToComponents}
            delay={ANIMATION.STAGGER_DELAY * 4}
          >
            <View style={[styles.iconBox, { backgroundColor: theme.colors.palette.primary100 }]}>
              <Ionicons name="cube-outline" size={24} color={theme.colors.palette.primary600} />
            </View>
            <View style={styles.actionContent}>
              <Text weight="semiBold">UI Components</Text>
              <Text size="sm" color="secondary">
                View all pre-built components
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.foregroundTertiary} />
          </PressableCard>

          <PressableCard
            style={styles.actionCard}
            onPress={() => navigation.navigate("Profile")}
            delay={ANIMATION.STAGGER_DELAY * 4.5}
          >
            <View style={[styles.iconBox, { backgroundColor: theme.colors.palette.secondary100 }]}>
              <Ionicons name="person-outline" size={24} color={theme.colors.palette.secondary600} />
            </View>
            <View style={styles.actionContent}>
              <Text weight="semiBold">My Profile</Text>
              <Text size="sm" color="secondary">
                Manage account and settings
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.foregroundTertiary} />
          </PressableCard>

          <PressableCard
            style={styles.actionCard}
            onPress={() => navigation.navigate("Paywall")}
            delay={ANIMATION.STAGGER_DELAY * 5}
          >
            <View style={[styles.iconBox, { backgroundColor: theme.colors.palette.accent100 }]}>
              <Ionicons name="star-outline" size={24} color={theme.colors.palette.accent600} />
            </View>
            <View style={styles.actionContent}>
              <Text weight="semiBold">Premium Features</Text>
              <Text size="sm" color="secondary">
                Upgrade to unlock more
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.foregroundTertiary} />
          </PressableCard>
        </ScrollView>
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
    // Web needs explicit height
    ...(isWeb && {
      minHeight: webDimension("100vh"),
    }),
  },
  gradient: {
    flex: 1,
    // Web needs explicit height
    ...(isWeb && {
      minHeight: webDimension("100vh"),
    }),
  },
  scrollView: {
    flex: 1,
    // Enable mouse wheel scrolling on web
    ...(isWeb && {
      overflowY: "auto" as unknown as "scroll",
    }),
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xl,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  headerText: {
    gap: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.sm,
  },
  featuredCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius["3xl"],
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.xl,
  },
  featuredContent: {
    gap: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  emoji: {
    fontSize: 32,
    lineHeight: 40,
  },
  featuredTitle: {
    flex: 1,
    lineHeight: theme.typography.lineHeights["2xl"],
    letterSpacing: -0.5,
  },
  featuredSubtitle: {
    marginBottom: theme.spacing.sm,
    lineHeight: theme.typography.lineHeights.base,
  },
  startButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.foreground,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
    minHeight: theme.sizes.button.md,
    ...theme.shadows.sm,
  },
  startButtonText: {
    color: theme.colors.card,
    fontSize: theme.typography.sizes.base,
  },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: theme.radius.xl,
    alignItems: "center",
    opacity: 0.95,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  actionContent: {
    flex: 1,
    gap: 2,
  },
}))
