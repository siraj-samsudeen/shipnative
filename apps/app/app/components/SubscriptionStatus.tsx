import { FC } from "react"
import { Linking, Platform, Pressable, View } from "react-native"
import { useTranslation } from "react-i18next"
import { StyleSheet } from "react-native-unistyles"

import { Text } from "./Text"

interface SubscriptionStatusProps {
  isPro: boolean
  platform?: "revenuecat" | "revenuecat-web" | "mock"
  expirationDate?: string | null
  willRenew?: boolean
  onManagePress?: () => void
}

export const SubscriptionStatus: FC<SubscriptionStatusProps> = ({
  isPro,
  platform = "mock",
  expirationDate,
  willRenew = false,
  onManagePress,
}) => {
  const { t } = useTranslation()

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null

    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return null
    }
  }

  const getPlatformName = () => {
    switch (platform) {
      case "revenuecat":
        return Platform.OS === "ios"
          ? t("subscriptionStatus:platformAppStore")
          : t("subscriptionStatus:platformGooglePlay")
      case "revenuecat-web":
        return t("subscriptionStatus:platformWebBilling")
      case "mock":
        return t("subscriptionStatus:platformMock")
      default:
        return t("subscriptionStatus:platformUnknown")
    }
  }

  const handleManageSubscription = async () => {
    if (onManagePress) {
      onManagePress()
      return
    }

    // Default behavior: open platform-specific management
    if (platform === "revenuecat") {
      if (Platform.OS === "ios") {
        Linking.openURL("https://apps.apple.com/account/subscriptions")
      } else if (Platform.OS === "android") {
        Linking.openURL("https://play.google.com/store/account/subscriptions")
      }
    }
    // For web, the manage URL would be provided by RevenueCat
  }

  if (!isPro) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🆓</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.title} tx="subscriptionStatus:freePlan" />
          <Text style={styles.description} tx="subscriptionStatus:upgradeMessage" />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, styles.proContainer]}>
      <View style={[styles.iconContainer, styles.proIconContainer]}>
        <Text style={styles.icon}>✨</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, styles.proTitle]} tx="subscriptionStatus:proMember" />
        <Text
          style={styles.description}
          tx="subscriptionStatus:subscribedVia"
          txOptions={{ platform: getPlatformName() }}
        />
        {expirationDate && (
          <Text style={styles.expirationText}>
            {willRenew
              ? t("subscriptionStatus:renews")
              : t("subscriptionStatus:expires")}{" "}
            {t("subscriptionStatus:on")} {formatDate(expirationDate)}
          </Text>
        )}
      </View>

      {platform !== "mock" && (
        <Pressable
          style={({ pressed }) => [styles.manageButton, pressed && styles.manageButtonPressed]}
          onPress={handleManageSubscription}
        >
          <Text style={styles.manageButtonText} tx="subscriptionStatus:manage" />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    backgroundColor: theme.colors.backgroundSecondary,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    padding: 16,
  },
  content: {
    flex: 1,
  },
  description: {
    color: theme.colors.foregroundSecondary,
    fontSize: 14,
    lineHeight: 18,
  },
  expirationText: {
    color: theme.colors.foregroundSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  icon: {
    fontSize: 24,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: theme.colors.border,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    marginRight: 12,
    width: 48,
  },
  manageButton: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.palette.success500,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  manageButtonPressed: {
    opacity: 0.7,
  },
  manageButtonText: {
    color: theme.colors.palette.success500,
    fontSize: 14,
    fontWeight: "600",
  },
  proContainer: {
    backgroundColor: theme.colors.palette.success50,
    borderColor: theme.colors.palette.success500,
  },
  proIconContainer: {
    backgroundColor: theme.colors.palette.success500,
  },
  proTitle: {
    color: theme.colors.foreground,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
}))
