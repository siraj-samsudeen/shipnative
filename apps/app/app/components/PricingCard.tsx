import { FC } from "react"
import { Platform, Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"

import { translate } from "@/i18n/translate"

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
}) => {
  return (
    <View style={[styles.container, isPopular && styles.popularContainer]}>
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText} tx="pricingCard:mostPopular" />
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.price}>{price}</Text>
        <Text style={styles.billingPeriod}>/{billingPeriod}</Text>
      </View>

      {features.length > 0 && (
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.checkmark}>✓</Text>
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
          {loading ? translate("pricingCard:processing") : translate("pricingCard:subscribeNow")}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  billingPeriod: {
    color: theme.colors.foregroundSecondary,
    fontSize: 16,
    marginLeft: 4,
  },
  button: {
    alignItems: "center",
    backgroundColor: theme.colors.palette.primary50,
    borderColor: theme.colors.palette.primary500,
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 16,
  },
  buttonText: {
    color: theme.colors.palette.primary500,
    fontSize: 16,
    fontWeight: "700",
  },
  checkmark: {
    color: theme.colors.palette.success500,
    fontSize: 18,
    fontWeight: "700",
    marginRight: 12,
  },
  container: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.transparent,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
    padding: 24,
    ...theme.shadows.md,
  },
  description: {
    color: theme.colors.foregroundSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  featureRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 12,
  },
  featureText: {
    color: theme.colors.foreground,
    flex: 1,
    fontSize: 15,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 16,
  },
  popularBadge: {
    backgroundColor: theme.colors.palette.primary500,
    borderRadius: 12,
    left: 24,
    paddingHorizontal: 12,
    paddingVertical: 4,
    position: "absolute",
    top: -12,
  },
  popularBadgeText: {
    color: theme.colors.palette.white,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  popularButton: {
    backgroundColor: theme.colors.palette.primary500,
    borderColor: theme.colors.palette.primary500,
  },
  popularButtonText: {
    color: theme.colors.palette.white,
  },
  popularContainer: {
    borderColor: theme.colors.palette.primary500,
    // Keep primary color shadow for popular cards
    shadowColor: theme.colors.palette.primary500,
    shadowOpacity: Platform.select({
      web: 0.12,
      default: 0.2,
    }),
  },
  pressedButton: {
    opacity: 0.8,
  },
  price: {
    color: theme.colors.foreground,
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 42,
  },
  priceContainer: {
    alignItems: "baseline",
    flexDirection: "row",
    marginBottom: 20,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
}))
