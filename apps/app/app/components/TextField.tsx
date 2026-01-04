import { ComponentType, forwardRef, Ref, useImperativeHandle, useRef, useState } from "react"
/* eslint-disable no-restricted-imports -- This is the wrapper component that needs the underlying RN TextInput */
import {
  TextInput as RNTextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native"
/* eslint-enable no-restricted-imports */
import { useTranslation } from "react-i18next"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { isRTL } from "@/i18n"

import { Text, TextProps } from "./Text"

// =============================================================================
// TYPES
// =============================================================================

type Sizes = "sm" | "md" | "lg"
type Status = "default" | "error" | "success" | "disabled"

export interface TextFieldAccessoryProps {
  status: Status
  multiline: boolean
  editable: boolean
  style?: ViewStyle
}

export interface TextFieldProps extends Omit<TextInputProps, "ref"> {
  /**
   * Input status
   */
  status?: Status
  /**
   * Input size
   */
  size?: Sizes
  /**
   * Label text
   */
  label?: string
  /**
   * i18n key for label
   */
  labelTx?: TextProps["tx"]
  /**
   * Label translation options
   */
  labelTxOptions?: TextProps["txOptions"]
  /**
   * Helper text (shown below input)
   */
  helper?: string
  /**
   * i18n key for helper
   */
  helperTx?: TextProps["tx"]
  /**
   * Helper translation options
   */
  helperTxOptions?: TextProps["txOptions"]
  /**
   * Placeholder text
   */
  placeholder?: string
  /**
   * i18n key for placeholder
   */
  placeholderTx?: TextProps["tx"]
  /**
   * Placeholder translation options
   */
  placeholderTxOptions?: TextProps["txOptions"]
  /**
   * Container style
   */
  containerStyle?: ViewStyle
  /**
   * Input wrapper style
   */
  inputWrapperStyle?: ViewStyle
  /**
   * Left side accessory component
   */
  LeftAccessory?: ComponentType<TextFieldAccessoryProps>
  /**
   * Right side accessory component
   */
  RightAccessory?: ComponentType<TextFieldAccessoryProps>
  /**
   * Additional label text props
   */
  LabelTextProps?: TextProps
  /**
   * Additional helper text props
   */
  HelperTextProps?: TextProps
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * A styled text input component with label and helper text support.
 *
 * @example
 * // Basic input
 * <TextField
 *   label="Email"
 *   placeholder="Enter your email"
 * />
 *
 * // With error state
 * <TextField
 *   label="Password"
 *   status="error"
 *   helper="Password is required"
 * />
 *
 * // With accessory
 * <TextField
 *   label="Search"
 *   LeftAccessory={() => <Icon name="search" />}
 * />
 *
 * // Different sizes
 * <TextField label="Small" size="sm" />
 * <TextField label="Large" size="lg" />
 */
export const TextField = forwardRef(function TextField(
  props: TextFieldProps,
  ref: Ref<RNTextInput>,
) {
  const {
    status = "default",
    size = "md",
    labelTx,
    label,
    labelTxOptions,
    placeholderTx,
    placeholder,
    placeholderTxOptions,
    helper,
    helperTx,
    helperTxOptions,
    LeftAccessory,
    RightAccessory,
    HelperTextProps,
    LabelTextProps,
    style,
    containerStyle,
    inputWrapperStyle,
    multiline,
    editable = true,
    ...textInputProps
  } = props

  const { theme } = useUnistyles()
  const { t } = useTranslation()
  const inputRef = useRef<RNTextInput>(null)
  const [isFocused, setIsFocused] = useState(false)

  const isDisabled = !editable || status === "disabled"
  const currentStatus = isDisabled ? "disabled" : status

  // Apply variants - map "default" to undefined for Unistyles
  const statusForStyles =
    isFocused && currentStatus === "default"
      ? "focused"
      : currentStatus === "default"
        ? undefined
        : currentStatus
  styles.useVariants({
    size,
    status: statusForStyles,
    multiline: multiline ? "true" : "false",
  })

  const placeholderContent = placeholderTx
    ? t(placeholderTx, placeholderTxOptions as Record<string, string>)
    : placeholder

  function focusInput() {
    if (isDisabled) return
    inputRef.current?.focus()
  }

  useImperativeHandle(ref, () => inputRef.current as RNTextInput)

  const accessoryProps: TextFieldAccessoryProps = {
    status: currentStatus,
    multiline: !!multiline,
    editable: !isDisabled,
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={containerStyle}
      onPress={focusInput}
      accessibilityState={{ disabled: isDisabled }}
    >
      {/* Label */}
      {!!(label || labelTx) && (
        <Text
          preset="label"
          text={label}
          tx={labelTx}
          txOptions={labelTxOptions}
          style={styles.label}
          {...LabelTextProps}
        />
      )}

      {/* Input wrapper */}
      <View style={[styles.inputWrapper, inputWrapperStyle]}>
        {/* Left accessory */}
        {!!LeftAccessory && (
          <View style={styles.leftAccessory}>
            <LeftAccessory {...accessoryProps} />
          </View>
        )}

        {/* Text input */}
        <RNTextInput
          ref={inputRef}
          underlineColorAndroid="transparent"
          textAlignVertical={multiline ? "top" : "center"}
          placeholder={placeholderContent}
          placeholderTextColor={theme.colors.inputPlaceholder}
          editable={!isDisabled}
          style={[styles.input, isRTL && styles.inputRTL, style]}
          onFocus={(e) => {
            setIsFocused(true)
            textInputProps.onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            textInputProps.onBlur?.(e)
          }}
          multiline={multiline}
          {...textInputProps}
        />

        {/* Right accessory */}
        {!!RightAccessory && (
          <View style={styles.rightAccessory}>
            <RightAccessory {...accessoryProps} />
          </View>
        )}
      </View>

      {/* Helper text */}
      {!!(helper || helperTx) && (
        <Text
          size="sm"
          text={helper}
          tx={helperTx}
          txOptions={helperTxOptions}
          color={currentStatus === "error" ? "error" : "secondary"}
          style={styles.helper}
          {...HelperTextProps}
        />
      )}
    </TouchableOpacity>
  )
})

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  label: {
    marginBottom: theme.spacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.input,
    borderWidth: 1,
    overflow: "hidden",
    variants: {
      size: {
        sm: {
          minHeight: theme.sizes.input.sm,
          borderRadius: theme.radius.md,
        },
        md: {
          minHeight: theme.sizes.input.md,
          borderRadius: theme.radius.lg,
        },
        lg: {
          minHeight: theme.sizes.input.lg,
          borderRadius: theme.radius.lg,
        },
      },
      status: {
        default: {
          borderColor: theme.colors.inputBorder,
        },
        focused: {
          borderColor: theme.colors.inputBorderFocus,
          borderWidth: 2,
        },
        error: {
          borderColor: theme.colors.error,
          borderWidth: 2,
        },
        success: {
          borderColor: theme.colors.success,
          borderWidth: 2,
        },
        disabled: {
          borderColor: theme.colors.border,
          opacity: 0.6,
        },
      },
      multiline: {
        true: {
          minHeight: 120,
          alignItems: "flex-start",
          paddingVertical: theme.spacing.sm,
        },
        false: {},
      },
    },
  },
  input: {
    flex: 1,
    color: theme.colors.inputForeground,
    fontFamily: theme.typography.fonts.regular,
    variants: {
      size: {
        sm: {
          fontSize: theme.typography.sizes.sm,
          paddingHorizontal: theme.spacing.sm,
        },
        md: {
          fontSize: theme.typography.sizes.base,
          paddingHorizontal: theme.spacing.md,
        },
        lg: {
          fontSize: theme.typography.sizes.lg,
          paddingHorizontal: theme.spacing.md,
        },
      },
      status: {
        default: {},
        focused: {},
        error: {},
        success: {},
        disabled: {
          color: theme.colors.foregroundTertiary,
        },
      },
      multiline: {
        true: {
          height: "auto",
          paddingTop: 0,
        },
        false: {},
      },
    },
  },
  leftAccessory: {
    marginLeft: theme.spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  rightAccessory: {
    marginRight: theme.spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  helper: {
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xxs,
  },
  inputRTL: {
    textAlign: "right",
  },
}))
