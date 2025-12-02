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
import type { MainTabScreenProps } from "@/navigators/navigationTypes"
import { useAuthStore, useNotificationStore } from "@/stores"
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
        width: "100%" as unknown as number,
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
          <PressableCard style={styles.featuredCard} delay={100}>
            <View style={styles.featuredContent}>
              <Badge text="Daily Challenge" variant="info" size="sm" />
              <Text size="2xl" weight="bold" style={styles.featuredTitle}>
                Meditate for 10 mins
              </Text>
              <Text color="secondary" style={styles.featuredSubtitle}>
                Clear your mind and start fresh.
              </Text>
              <Pressable style={styles.startButton} onPress={() => haptics.buttonPress()}>
                <Text weight="semiBold" style={styles.startButtonText}>
                  Start Now
                </Text>
                <Ionicons name="play-circle" size={20} color={theme.colors.foreground} />
              </Pressable>
            </View>
            <View style={styles.featuredIcon}>
              <Text style={styles.emoji}>🧘‍♀️</Text>
            </View>
          </PressableCard>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <PressableCard style={styles.statCard} delay={200}>
              <Text size="2xl" weight="bold">
                12
              </Text>
              <Text size="sm" color="secondary">
                Streak
              </Text>
            </PressableCard>
            <PressableCard style={styles.statCard} delay={250}>
              <Text size="2xl" weight="bold">
                85%
              </Text>
              <Text size="sm" color="secondary">
                Completed
              </Text>
            </PressableCard>
            <PressableCard style={styles.statCard} delay={300}>
              <Text size="2xl" weight="bold">
                4.8
              </Text>
              <Text size="sm" color="secondary">
                Rating
              </Text>
            </PressableCard>
          </View>

          {/* Quick Actions */}
          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <Text size="xl" weight="bold" style={styles.sectionTitle}>
              Explore
            </Text>
          </Animated.View>

          <PressableCard style={styles.actionCard} onPress={handleNavigateToComponents} delay={400}>
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
            delay={450}
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
            delay={500}
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
      minHeight: "100vh" as unknown as number,
    }),
  },
  gradient: {
    flex: 1,
    // Web needs explicit height
    ...(isWeb && {
      minHeight: "100vh" as unknown as number,
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
    padding: theme.spacing.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
    ...theme.shadows.lg,
  },
  featuredContent: {
    flex: 1,
    marginRight: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  featuredTitle: {
    marginTop: theme.spacing.xs,
  },
  featuredSubtitle: {
    marginBottom: theme.spacing.sm,
  },
  featuredIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 64,
    lineHeight: 72,
  },
  startButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xxs,
  },
  startButtonText: {
    color: theme.colors.foreground,
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
