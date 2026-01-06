import { FC } from "react"
import { Platform, Pressable, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { Text } from "./Text"

interface PricingCardProps {
  title: string
  price: string
  description: string
  billingPeriod: string
  features?: string[]
  isPopular?: boolean
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  savingsText?: string
  pricePerMonth?: string
  ctaText?: string
}

export const PricingCard: FC<PricingCardProps> = ({
  title,
  price,
  description,
  billingPeriod,
  features = [],
  isPopular = false,
  onPress,
  disabled = false,
  loading = false,
  savingsText,
  pricePerMonth,
  ctaText,
}) => {
  const { t } = useTranslation()
  const { theme } = useUnistyles()

  return (
    <View style={[styles.container, isPopular && styles.popularContainer]}>
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText} tx="pricingCard:mostPopular" />
        </View>
      )}

      {savingsText && (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsBadgeText}>{savingsText}</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>

      <View style={styles.priceSection}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{price}</Text>
          <Text style={styles.billingPeriod}>/{billingPeriod}</Text>
        </View>
        {pricePerMonth && (
          <Text style={styles.pricePerMonth}>{pricePerMonth}</Text>
        )}
      </View>

      {features.length > 0 && (
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.palette.success500} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          isPopular && styles.popularButton,
          (disabled || loading) && styles.disabledButton,
          pressed && styles.pressedButton,
        ]}
        onPress={onPress}
        disabled={disabled || loading}
      >
        <Text style={[styles.buttonText, isPopular && styles.popularButtonText]}>
          {loading ? t("pricingCard:processing") : (ctaText || t("pricingCard:subscribeNow"))}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  billingPeriod: {
    color: theme.colors.foregroundSecondary,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 4,
  },
  button: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 2,
    paddingVertical: 18,
    marginTop: 8,
  },
  buttonText: {
    color: theme.colors.foreground,
    fontSize: 17,
    fontWeight: "700",
  },
  container: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 20,
    padding: 28,
    ...theme.shadows.md,
  },
  description: {
    color: theme.colors.foregroundSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  featureRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  featureText: {
    color: theme.colors.foreground,
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 1,
  },
  featuresContainer: {
    marginBottom: 24,
    marginTop: 24,
  },
  header: {
    marginBottom: 20,
  },
  popularBadge: {
    backgroundColor: theme.colors.palette.primary500,
    borderRadius: 12,
    left: 28,
    paddingHorizontal: 14,
    paddingVertical: 6,
    position: "absolute",
    top: -12,
  },
  popularBadgeText: {
    color: theme.colors.palette.white,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  popularButton: {
    backgroundColor: theme.colors.palette.primary500,
    borderColor: theme.colors.palette.primary500,
    ...theme.shadows.lg,
  },
  popularButtonText: {
    color: theme.colors.palette.white,
  },
  popularContainer: {
    borderColor: theme.colors.palette.primary500,
    borderWidth: 3,
    transform: [{ scale: 1.02 }],
    shadowColor: theme.colors.palette.primary500,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: Platform.select({
      web: 0.15,
      default: 0.25,
    }),
    shadowRadius: 16,
    elevation: 8,
  },
  pressedButton: {
    opacity: 0.8,
  },
  price: {
    color: theme.colors.foreground,
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 50,
    letterSpacing: -1,
  },
  priceContainer: {
    alignItems: "baseline",
    flexDirection: "row",
  },
  pricePerMonth: {
    color: theme.colors.foregroundSecondary,
    fontSize: 14,
    marginTop: 6,
    fontWeight: "500",
  },
  priceSection: {
    marginBottom: 4,
  },
  savingsBadge: {
    backgroundColor: theme.colors.palette.success500,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    position: "absolute",
    right: 28,
    top: -12,
  },
  savingsBadgeText: {
    color: theme.colors.palette.white,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
}))
