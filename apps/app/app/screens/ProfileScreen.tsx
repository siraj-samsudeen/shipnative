import { FC, ReactNode, useState } from "react"
import { ScrollView, Switch, Pressable, View, Platform, useWindowDimensions } from "react-native"
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

import {
  Avatar,
  Button,
  DeleteAccountModal,
  Text,
  EditProfileModal,
  LanguageSelector,
} from "@/components"
import { ANIMATION } from "@/config/constants"
import { features } from "@/config/features"
import { useAuthStore, useNotificationStore, useSubscriptionStore } from "@/stores"
import { useAppTheme } from "@/theme/context"
import { webDimension } from "@/types/webStyles"
import { haptics } from "@/utils/haptics"
import { testErrors } from "@/utils/testError"

// =============================================================================
// CONSTANTS
// =============================================================================

const isWeb = Platform.OS === "web"
const CONTENT_MAX_WIDTH = 600

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ProfileScreen: FC = () => {
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const isPro = useSubscriptionStore((state) => state.isPro)
  const { isPushEnabled, togglePush } = useNotificationStore()
  const insets = useSafeAreaInsets()
  const { setThemeContextOverride, themeContext } = useAppTheme()
  const { theme } = useUnistyles()
  const { width: windowWidth } = useWindowDimensions()

  const [editModalVisible, setEditModalVisible] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [languageModalVisible, setLanguageModalVisible] = useState(false)

  const isLargeScreen = windowWidth > 768
  const contentStyle = isLargeScreen
    ? {
        maxWidth: CONTENT_MAX_WIDTH,
        alignSelf: "center" as const,
        width: webDimension("100%"),
      }
    : {}

  const firstName =
    typeof user?.user_metadata?.first_name === "string" ? user.user_metadata.first_name : undefined
  const userName = firstName ?? user?.email?.split("@")[0] ?? "User"
  const userInitials = userName.slice(0, 2).toUpperCase()
  const avatarUrl =
    typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined

  const toggleThemeMode = () => {
    haptics.switchChange()
    setThemeContextOverride(themeContext === "dark" ? "light" : "dark")
  }

  const handleTogglePush = () => {
    haptics.switchChange()
    togglePush(user?.id)
  }

  const handleSignOut = async () => {
    haptics.buttonPress()
    await signOut()
  }

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
  }: {
    icon: keyof typeof Ionicons.glyphMap
    title: string
    subtitle?: string
    onPress?: () => void
    rightElement?: ReactNode
  }) => {
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
  }

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
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
            <Text style={styles.screenTitle}>Profile</Text>
          </Animated.View>

          {/* Profile Card */}
          <Animated.View
            entering={FadeInDown.delay(ANIMATION.STAGGER_DELAY).springify()}
            style={styles.profileCard}
          >
            <Avatar
              source={avatarUrl ? { uri: avatarUrl } : undefined}
              fallback={userInitials}
              size="xl"
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userName}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              {isPro ? (
                <View style={styles.proBadge}>
                  <Ionicons name="star" size={12} color={theme.colors.background} />
                  <Text style={styles.proText}>PRO MEMBER</Text>
                </View>
              ) : (
                <Pressable style={styles.upgradeButton} onPress={() => haptics.buttonPress()}>
                  <Text style={styles.upgradeText}>Upgrade to Pro</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>

          {/* Settings Section */}
          <Animated.View entering={FadeInDown.delay(ANIMATION.STAGGER_DELAY * 2).springify()}>
            <Text style={styles.sectionTitle}>Settings</Text>
          </Animated.View>
          <Animated.View
            entering={FadeInDown.delay(ANIMATION.STAGGER_DELAY * 2.5).springify()}
            style={styles.menuGroup}
          >
            <MenuItem
              icon="person-outline"
              title="Personal Information"
              subtitle="Edit name, email"
              onPress={() => setEditModalVisible(true)}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Manage push notifications"
              rightElement={
                <Switch
                  value={isPushEnabled}
                  onValueChange={handleTogglePush}
                  trackColor={{ false: theme.colors.borderSecondary, true: theme.colors.primary }}
                  thumbColor={theme.colors.card}
                />
              }
            />
            <View style={styles.divider} />
            <MenuItem
              icon="moon-outline"
              title="Dark Mode"
              rightElement={
                <Switch
                  value={themeContext === "dark"}
                  onValueChange={toggleThemeMode}
                  trackColor={{ false: theme.colors.borderSecondary, true: theme.colors.primary }}
                  thumbColor={theme.colors.card}
                />
              }
            />
            <View style={styles.divider} />
            <MenuItem
              icon="language-outline"
              title="Language"
              subtitle="Change app language"
              onPress={() => setLanguageModalVisible(true)}
            />
          </Animated.View>

          {/* Support Section */}
          <Animated.View entering={FadeInDown.delay(ANIMATION.STAGGER_DELAY * 3).springify()}>
            <Text style={styles.sectionTitle}>Support</Text>
          </Animated.View>
          <Animated.View
            entering={FadeInDown.delay(ANIMATION.STAGGER_DELAY * 3.5).springify()}
            style={styles.menuGroup}
          >
            <MenuItem icon="help-circle-outline" title="Help Center" />
            <View style={styles.divider} />
            <MenuItem icon="shield-checkmark-outline" title="Privacy Policy" />
          </Animated.View>

          {/* Development Section - Only visible in dev mode */}
          {features.enableDebugLogging && (
            <>
              <Animated.View entering={FadeInDown.delay(ANIMATION.STAGGER_DELAY * 3.8).springify()}>
                <Text style={styles.sectionTitle}>Development</Text>
              </Animated.View>
              <Animated.View
                entering={FadeInDown.delay(ANIMATION.STAGGER_DELAY * 4).springify()}
                style={styles.menuGroup}
              >
                <MenuItem
                  icon="bug-outline"
                  title="Test Sentry Error"
                  subtitle="Send a test error to Sentry"
                  onPress={() => {
                    haptics.buttonPress()
                    testErrors.testSimpleError()
                  }}
                />
                <View style={styles.divider} />
                <MenuItem
                  icon="warning-outline"
                  title="Test Warning"
                  subtitle="Send a test warning message"
                  onPress={() => {
                    haptics.buttonPress()
                    testErrors.testWarningMessage()
                  }}
                />
                <View style={styles.divider} />
                <MenuItem
                  icon="information-circle-outline"
                  title="Test Info Message"
                  subtitle="Send a test info message"
                  onPress={() => {
                    haptics.buttonPress()
                    testErrors.testInfoMessage()
                  }}
                />
                <View style={styles.divider} />
                <MenuItem
                  icon="code-outline"
                  title="Test Error with Context"
                  subtitle="Send error with additional context"
                  onPress={() => {
                    haptics.buttonPress()
                    testErrors.testErrorWithContext()
                  }}
                />
              </Animated.View>
            </>
          )}

          <Animated.View entering={FadeInDown.delay(ANIMATION.STAGGER_DELAY * 4).springify()}>
            <Text style={styles.sectionTitle}>Account</Text>
          </Animated.View>
          <Animated.View
            entering={FadeInDown.delay(ANIMATION.STAGGER_DELAY * 4.5).springify()}
            style={styles.dangerCard}
          >
            <MenuItem
              icon="log-out-outline"
              title="Sign Out"
              subtitle="Log out of this device"
              onPress={handleSignOut}
            />
            <View style={styles.divider} />
            <View style={styles.dangerHeader}>
              <View style={styles.dangerCopy}>
                <Text style={styles.dangerTitle}>Delete Account</Text>
                <Text style={styles.dangerSubtitle}>
                  Permanently remove your data and sign out from all devices.
                </Text>
              </View>
              <View style={styles.dangerBadge}>
                <Ionicons name="shield-half-outline" size={16} color={theme.colors.error} />
                <Text style={styles.dangerBadgeText}>Privacy-first</Text>
              </View>
            </View>

            <View style={styles.dangerBullets}>
              <View style={styles.dangerBullet}>
                <View style={styles.dangerIcon}>
                  <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                </View>
                <Text style={styles.dangerBulletText}>Removes your profile and preferences</Text>
              </View>
              <View style={styles.dangerBullet}>
                <View style={styles.dangerIcon}>
                  <Ionicons name="receipt-outline" size={16} color={theme.colors.error} />
                </View>
                <Text style={styles.dangerBulletText}>Ends your active subscription</Text>
              </View>
              <View style={styles.dangerBullet}>
                <View style={styles.dangerIcon}>
                  <Ionicons name="log-out-outline" size={16} color={theme.colors.error} />
                </View>
                <Text style={styles.dangerBulletText}>Signs you out on every device</Text>
              </View>
            </View>

            <Button
              text="Delete my account"
              variant="danger"
              onPress={() => {
                haptics.delete()
                setDeleteModalVisible(true)
              }}
              style={styles.dangerButton}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(ANIMATION.STAGGER_DELAY * 5.2).springify()}>
            <Text style={styles.versionText}>Version 1.0.0 (Build 12)</Text>
          </Animated.View>
        </ScrollView>
      </LinearGradient>

      {/* Edit Profile Modal */}
      <EditProfileModal visible={editModalVisible} onClose={() => setEditModalVisible(false)} />
      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
      />
      <LanguageSelector
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />

      <Pressable
        onPress={handleSignOut}
        style={[styles.signOutFloating, { top: insets.top + theme.spacing.lg }]}
        hitSlop={12}
      >
        <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    paddingBottom: 120,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: theme.spacing.xl,
  },
  screenTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes["3xl"],
    lineHeight: theme.typography.lineHeights["3xl"],
  },
  signOutFloating: {
    position: "absolute",
    right: theme.spacing.lg,
    alignItems: "center",
    backgroundColor: theme.colors.errorBackground,
    borderRadius: theme.radius.full,
    height: 40,
    justifyContent: "center",
    width: 40,
    zIndex: 2,
    elevation: 2,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius["3xl"],
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.xl,
    ...theme.shadows.lg,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fonts.semiBold,
    fontSize: theme.typography.sizes.xl,
    lineHeight: theme.typography.lineHeights.xl,
    marginBottom: theme.spacing.xxs,
  },
  profileEmail: {
    color: theme.colors.foregroundSecondary,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.base,
    lineHeight: theme.typography.lineHeights.base,
    marginBottom: theme.spacing.md,
  },
  proBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.foreground,
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  proText: {
    color: theme.colors.background,
    fontFamily: theme.typography.fonts.semiBold,
    fontSize: 12,
    lineHeight: 14,
  },
  upgradeButton: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  upgradeText: {
    color: theme.colors.primaryForeground,
    fontFamily: theme.typography.fonts.semiBold,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
    marginBottom: theme.spacing.md,
    marginLeft: theme.spacing.xxs,
  },
  menuGroup: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius["2xl"],
    borderWidth: 1,
    gap: theme.spacing.xxs,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.xs,
    ...theme.shadows.sm,
  },
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
  divider: {
    backgroundColor: theme.colors.separator,
    height: 1,
    marginLeft: 56,
    opacity: 0.6,
  },
  dangerCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.errorBackground,
    borderRadius: theme.radius["2xl"],
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.md,
  },
  dangerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  dangerCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  dangerTitle: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fonts.semiBold,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
  },
  dangerSubtitle: {
    color: theme.colors.foregroundSecondary,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  dangerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.errorBackground,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
  },
  dangerBadgeText: {
    color: theme.colors.error,
    fontFamily: theme.typography.fonts.semiBold,
    fontSize: theme.typography.sizes.xs,
  },
  dangerBullets: {
    gap: theme.spacing.sm,
  },
  dangerBullet: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  dangerIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.errorBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBulletText: {
    flex: 1,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.base,
    lineHeight: theme.typography.lineHeights.base,
  },
  dangerButton: {
    marginTop: theme.spacing.xs,
  },
  versionText: {
    color: theme.colors.foregroundTertiary,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    lineHeight: theme.typography.lineHeights.xs,
    marginBottom: theme.spacing.xl,
    textAlign: "center",
  },
}))
