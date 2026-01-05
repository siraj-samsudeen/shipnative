import { Image, ImageProps, ImageStyle, StyleProp, TextStyle, View, ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { Button, ButtonProps } from "./Button"
import { Icon, IconTypes } from "./Icon"
import { Text, TextProps } from "./Text"

const sadFace = require("@assets/images/sad-face.png")

// =============================================================================
// TYPES
// =============================================================================

type EmptyStatePreset =
  | "generic"
  | "noResults"
  | "noConnection"
  | "error"
  | "noNotifications"
  | "noMessages"
  | "noFavorites"
  | "emptyCart"
  | "emptyInbox"

interface EmptyStateProps {
  /**
   * An optional prop that specifies the text/image set to use for the empty state.
   * Available presets: generic, noResults, noConnection, error, noNotifications,
   * noMessages, noFavorites, emptyCart, emptyInbox
   */
  preset?: EmptyStatePreset
  /**
   * Style override for the container.
   */
  style?: StyleProp<ViewStyle>
  /**
   * An Image source to be displayed above the heading.
   */
  imageSource?: ImageProps["source"]
  /**
   * An icon to display instead of an image (uses Icon component).
   * Takes precedence over imageSource when using presets.
   */
  icon?: IconTypes
  /**
   * Size of the icon. Defaults to 64.
   */
  iconSize?: number
  /**
   * Style overrides for image.
   */
  imageStyle?: StyleProp<ImageStyle>
  /**
   * Pass any additional props directly to the Image component.
   */
  ImageProps?: Omit<ImageProps, "source">
  /**
   * The heading text to display if not using `headingTx`.
   */
  heading?: TextProps["text"]
  /**
   * Heading text which is looked up via i18n.
   */
  headingTx?: TextProps["tx"]
  /**
   * Optional heading options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  headingTxOptions?: TextProps["txOptions"]
  /**
   * Style overrides for heading text.
   */
  headingStyle?: StyleProp<TextStyle>
  /**
   * Pass any additional props directly to the heading Text component.
   */
  HeadingTextProps?: TextProps
  /**
   * The content text to display if not using `contentTx`.
   */
  content?: TextProps["text"]
  /**
   * Content text which is looked up via i18n.
   */
  contentTx?: TextProps["tx"]
  /**
   * Optional content options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  contentTxOptions?: TextProps["txOptions"]
  /**
   * Style overrides for content text.
   */
  contentStyle?: StyleProp<TextStyle>
  /**
   * Pass any additional props directly to the content Text component.
   */
  ContentTextProps?: TextProps
  /**
   * The button text to display if not using `buttonTx`.
   */
  button?: TextProps["text"]
  /**
   * Button text which is looked up via i18n.
   */
  buttonTx?: TextProps["tx"]
  /**
   * Optional button options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  buttonTxOptions?: TextProps["txOptions"]
  /**
   * Style overrides for button.
   */
  buttonStyle?: ButtonProps["style"]
  /**
   * Called when the button is pressed.
   */
  buttonOnPress?: ButtonProps["onPress"]
  /**
   * Pass any additional props directly to the Button component.
   */
  ButtonProps?: ButtonProps
}

interface EmptyStatePresetItem {
  imageSource?: ImageProps["source"]
  icon?: IconTypes
  heading: TextProps["text"]
  content: TextProps["text"]
  button?: TextProps["text"]
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * A component to use when there is no data to display.
 * It can be utilized to direct the user what to do next.
 *
 * @example
 * // Basic empty state
 * <EmptyState
 *   heading="No items found"
 *   content="Try adding some items to get started"
 *   button="Add Item"
 *   buttonOnPress={() => {}}
 * />
 *
 * // Using preset
 * <EmptyState preset="generic" />
 *
 * // Other presets
 * <EmptyState preset="noResults" />
 * <EmptyState preset="noConnection" buttonOnPress={handleRetry} />
 * <EmptyState preset="error" buttonOnPress={handleRetry} />
 * <EmptyState preset="noNotifications" />
 * <EmptyState preset="noMessages" />
 * <EmptyState preset="noFavorites" />
 * <EmptyState preset="emptyCart" buttonOnPress={handleShop} />
 * <EmptyState preset="emptyInbox" />
 *
 * // With custom icon
 * <EmptyState icon="settings" heading="No Settings" content="Configure your preferences" />
 */
export function EmptyState(props: EmptyStateProps) {
  const { theme } = useUnistyles()
  const { t } = useTranslation()

  const EmptyStatePresets: Record<EmptyStatePreset, EmptyStatePresetItem> = {
    generic: {
      imageSource: sadFace,
      heading: t("emptyStateComponent:generic.heading"),
      content: t("emptyStateComponent:generic.content"),
      button: t("emptyStateComponent:generic.button"),
    },
    noResults: {
      icon: "view",
      heading: "No results found",
      content: "Try adjusting your search or filters to find what you're looking for.",
    },
    noConnection: {
      icon: "community",
      heading: "No connection",
      content: "Please check your internet connection and try again.",
      button: "Try Again",
    },
    error: {
      icon: "x",
      heading: "Something went wrong",
      content: "We encountered an error. Please try again later.",
      button: "Retry",
    },
    noNotifications: {
      icon: "bell",
      heading: "No notifications",
      content: "You're all caught up! Check back later for new updates.",
    },
    noMessages: {
      icon: "community",
      heading: "No messages yet",
      content: "Start a conversation to see your messages here.",
      button: "Start Chat",
    },
    noFavorites: {
      icon: "heart",
      heading: "No favorites yet",
      content: "Items you favorite will appear here for quick access.",
    },
    emptyCart: {
      icon: "components",
      heading: "Your cart is empty",
      content: "Browse our products and add items to your cart.",
      button: "Start Shopping",
    },
    emptyInbox: {
      icon: "components",
      heading: "Inbox is empty",
      content: "New items will appear here when you receive them.",
    },
  }

  const presetData = EmptyStatePresets[props.preset ?? "generic"]

  const {
    button = presetData.button,
    buttonTx,
    buttonOnPress,
    buttonTxOptions,
    content = presetData.content,
    contentTx,
    contentTxOptions,
    heading = presetData.heading,
    headingTx,
    headingTxOptions,
    imageSource = presetData.imageSource,
    icon = presetData.icon,
    iconSize = 64,
    style: $containerStyleOverride,
    buttonStyle: $buttonStyleOverride,
    contentStyle: $contentStyleOverride,
    headingStyle: $headingStyleOverride,
    imageStyle: $imageStyleOverride,
    ButtonProps: buttonProps,
    ContentTextProps,
    HeadingTextProps,
    ImageProps,
  } = props

  const isIconPresent = !!icon
  const isImagePresent = !!imageSource && !isIconPresent
  const isHeadingPresent = !!(heading || headingTx)
  const isContentPresent = !!(content || contentTx)
  const isButtonPresent = !!(button || buttonTx)

  return (
    <View style={[styles.container, $containerStyleOverride]}>
      {/* Render icon if present, otherwise render image */}
      {isIconPresent && (
        <View
          style={[
            styles.iconContainer,
            (isHeadingPresent || isContentPresent || isButtonPresent) && styles.imageSpacing,
          ]}
        >
          <Icon
            icon={icon}
            size={iconSize}
            color={theme.colors.foregroundTertiary}
          />
        </View>
      )}

      {isImagePresent && (
        <Image
          source={imageSource}
          {...ImageProps}
          style={[
            styles.image,
            (isHeadingPresent || isContentPresent || isButtonPresent) && styles.imageSpacing,
            $imageStyleOverride,
            ImageProps?.style,
          ]}
          tintColor={theme.colors.foregroundSecondary}
        />
      )}

      {isHeadingPresent && (
        <Text
          preset="subheading"
          text={heading}
          tx={headingTx}
          txOptions={headingTxOptions}
          {...HeadingTextProps}
          style={[
            styles.heading,
            (isImagePresent || isIconPresent) && styles.headingAfterImage,
            (isContentPresent || isButtonPresent) && styles.headingSpacing,
            $headingStyleOverride,
            HeadingTextProps?.style,
          ]}
        />
      )}

      {isContentPresent && (
        <Text
          text={content}
          tx={contentTx}
          txOptions={contentTxOptions}
          color="secondary"
          {...ContentTextProps}
          style={[
            styles.content,
            (isImagePresent || isIconPresent || isHeadingPresent) && styles.contentAfterHeading,
            isButtonPresent && styles.contentSpacing,
            $contentStyleOverride,
            ContentTextProps?.style,
          ]}
        />
      )}

      {isButtonPresent && (
        <Button
          onPress={buttonOnPress}
          text={button}
          tx={buttonTx}
          txOptions={buttonTxOptions}
          {...buttonProps}
          style={[
            styles.button,
            (isImagePresent || isIconPresent || isHeadingPresent || isContentPresent) &&
              styles.buttonSpacing,
            $buttonStyleOverride,
            buttonProps?.style,
          ]}
        />
      )}
    </View>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 96,
    height: 96,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  image: {
    alignSelf: "center",
    width: 80,
    height: 80,
    opacity: 0.8,
  },
  imageSpacing: {
    marginBottom: theme.spacing.md,
  },
  heading: {
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  headingAfterImage: {
    marginTop: theme.spacing.sm,
  },
  headingSpacing: {
    marginBottom: theme.spacing.xs,
  },
  content: {
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  contentAfterHeading: {
    marginTop: theme.spacing.xs,
  },
  contentSpacing: {
    marginBottom: theme.spacing.md,
  },
  button: {
    alignSelf: "center",
  },
  buttonSpacing: {
    marginTop: theme.spacing.xl,
  },
}))
