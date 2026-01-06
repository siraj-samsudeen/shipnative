import { useCallback, useMemo, useState } from "react"
import { View, ViewStyle, Pressable, Platform } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { format } from "date-fns"
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"
import { StyleSheet, UnistylesRuntime, useUnistyles } from "react-native-unistyles"
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker"

import { SPRING_CONFIG } from "@/utils/animations"

import { Text, TextProps } from "./Text"

// =============================================================================
// TYPES
// =============================================================================

type DatePickerMode = "date" | "time" | "datetime"

export interface DatePickerProps {
  /**
   * Currently selected date
   */
  value?: Date
  /**
   * Callback when date changes
   */
  onChange?: (date: Date) => void
  /**
   * Picker mode: date, time, or both
   */
  mode?: DatePickerMode
  /**
   * Minimum selectable date
   */
  minDate?: Date
  /**
   * Maximum selectable date
   */
  maxDate?: Date
  /**
   * Label text
   */
  label?: string
  /**
   * Label translation key
   */
  labelTx?: TextProps["tx"]
  /**
   * Placeholder text
   */
  placeholder?: string
  /**
   * Placeholder translation key
   */
  placeholderTx?: TextProps["tx"]
  /**
   * Error message
   */
  error?: string
  /**
   * Error translation key
   */
  errorTx?: TextProps["tx"]
  /**
   * Helper text
   */
  helper?: string
  /**
   * Helper translation key
   */
  helperTx?: TextProps["tx"]
  /**
   * Disabled state
   */
  disabled?: boolean
  /**
   * Additional style
   */
  style?: ViewStyle
  /**
   * Test ID
   */
  testID?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * A native date and time picker component using platform-specific pickers.
 * On iOS, shows the native wheel picker. On Android, shows the material picker modal.
 *
 * @example
 * // Basic date picker
 * <DatePicker
 *   value={selectedDate}
 *   onChange={setSelectedDate}
 *   label="Select Date"
 * />
 *
 * // Time picker
 * <DatePicker
 *   value={selectedTime}
 *   onChange={setSelectedTime}
 *   mode="time"
 *   label="Select Time"
 * />
 *
 * // Date and time picker
 * <DatePicker
 *   value={selectedDateTime}
 *   onChange={setSelectedDateTime}
 *   mode="datetime"
 *   label="Select Date & Time"
 * />
 *
 * // With min/max dates
 * <DatePicker
 *   value={selectedDate}
 *   onChange={setSelectedDate}
 *   minDate={new Date()}
 *   maxDate={addMonths(new Date(), 3)}
 * />
 */
export function DatePicker(props: DatePickerProps) {
  const {
    value,
    onChange,
    mode = "date",
    minDate,
    maxDate,
    label,
    labelTx,
    placeholder = "Select date",
    placeholderTx,
    error,
    errorTx,
    helper,
    helperTx,
    disabled = false,
    style,
    testID,
  } = props

  const { theme } = useUnistyles()
  const [showPicker, setShowPicker] = useState(false)
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date")
  const [tempDate, setTempDate] = useState(value || new Date())

  const scale = useSharedValue(1)

  const animatedInputStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = useCallback(() => {
    if (!disabled) {
      scale.value = withSpring(0.98, SPRING_CONFIG)
    }
  }, [disabled, scale])

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG)
  }, [scale])

  const handleOpen = useCallback(() => {
    if (!disabled) {
      setTempDate(value || new Date())
      // For datetime mode, start with date picker
      setPickerMode(mode === "time" ? "time" : "date")
      setShowPicker(true)
    }
  }, [disabled, value, mode])

  const handleChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      // On Android, the picker dismisses after selection
      if (Platform.OS === "android") {
        setShowPicker(false)

        // If user cancelled, don't update
        if (event.type === "dismissed") {
          return
        }

        if (!selectedDate) {
          return
        }

        // For datetime mode on Android, show time picker after date is selected
        if (mode === "datetime" && pickerMode === "date") {
          setTempDate(selectedDate)
          setPickerMode("time")
          // Show time picker after a brief delay
          setTimeout(() => setShowPicker(true), 100)
          return
        }

        // If we just selected time in datetime mode, merge with previously selected date
        if (mode === "datetime" && pickerMode === "time") {
          const finalDate = new Date(tempDate)
          finalDate.setHours(selectedDate.getHours())
          finalDate.setMinutes(selectedDate.getMinutes())
          onChange?.(finalDate)
          return
        }

        // Otherwise, just update with the selected date/time
        onChange?.(selectedDate)
      } else {
        // On iOS, the picker stays open and updates in real-time
        if (selectedDate) {
          setTempDate(selectedDate)
          onChange?.(selectedDate)
        }
      }
    },
    [mode, pickerMode, tempDate, onChange],
  )

  const handleDismiss = useCallback(() => {
    setShowPicker(false)
  }, [])

  // Format display value
  const displayValue = useMemo(() => {
    if (!value) return null

    switch (mode) {
      case "date":
        return format(value, "MMM d, yyyy")
      case "time":
        return format(value, "h:mm a")
      case "datetime":
        return format(value, "MMM d, yyyy 'at' h:mm a")
      default:
        return format(value, "MMM d, yyyy")
    }
  }, [value, mode])

  const hasError = !!error || !!errorTx

  return (
    <View style={[styles.wrapper, style]} testID={testID}>
      {/* Label */}
      {(label || labelTx) && (
        <Text text={label} tx={labelTx} weight="medium" size="sm" style={styles.label} />
      )}

      {/* Input Button */}
      <Pressable
        onPress={handleOpen}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label || "Date picker"}
        accessibilityState={{ disabled }}
      >
        <Animated.View
          style={[
            styles.input,
            hasError && styles.inputError,
            disabled && styles.inputDisabled,
            animatedInputStyle,
          ]}
        >
          <Ionicons
            name={mode === "time" ? "time-outline" : "calendar-outline"}
            size={20}
            color={disabled ? theme.colors.foregroundTertiary : theme.colors.foregroundSecondary}
          />
          {displayValue ? (
            <Text style={styles.value}>{displayValue}</Text>
          ) : (
            <Text text={placeholder} tx={placeholderTx} style={styles.placeholder} />
          )}
          <Ionicons name="chevron-down" size={20} color={theme.colors.foregroundTertiary} />
        </Animated.View>
      </Pressable>

      {/* Helper/Error Text */}
      {(helper || helperTx || error || errorTx) && (
        <Text
          text={error || helper}
          tx={errorTx || helperTx}
          size="xs"
          style={[styles.helper, hasError && styles.helperError]}
        />
      )}

      {/* Native Picker */}
      {showPicker && Platform.OS !== "web" && (
        <DateTimePicker
          value={tempDate}
          mode={pickerMode}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
          minimumDate={minDate}
          maximumDate={maxDate}
          themeVariant={UnistylesRuntime.themeName === "dark" ? "dark" : "light"}
          // iOS specific props
          {...(Platform.OS === "ios" && {
            onTouchCancel: handleDismiss,
          })}
        />
      )}

      {/* Web Fallback - Native HTML5 input */}
      {showPicker && Platform.OS === "web" && (
        <input
          type={pickerMode === "date" ? "date" : "time"}
          value={
            pickerMode === "date"
              ? format(tempDate, "yyyy-MM-dd")
              : format(tempDate, "HH:mm")
          }
          onChange={(e) => {
            const value = e.target.value
            if (!value) return

            let newDate: Date
            if (pickerMode === "date") {
              // Parse date value (format: yyyy-MM-dd)
              const [year, month, day] = value.split("-").map(Number)
              newDate = new Date(tempDate)
              newDate.setFullYear(year, month - 1, day)
            } else {
              // Parse time value (format: HH:mm)
              const [hours, minutes] = value.split(":").map(Number)
              newDate = new Date(tempDate)
              newDate.setHours(hours, minutes)
            }

            // For datetime mode on web, handle both date and time
            if (mode === "datetime" && pickerMode === "date") {
              setTempDate(newDate)
              setPickerMode("time")
            } else {
              onChange?.(newDate)
              setShowPicker(false)
            }
          }}
          onBlur={() => setShowPicker(false)}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${theme.colors.inputBorder}`,
            backgroundColor: theme.colors.card,
            color: theme.colors.foreground,
            fontSize: 16,
            fontFamily: theme.typography.fonts.regular,
            zIndex: 1000,
          }}
          autoFocus
        />
      )}
    </View>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    width: "100%",
  },
  label: {
    marginBottom: theme.spacing.xs,
    color: theme.colors.foreground,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    height: theme.sizes.input.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.input,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.sm,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  value: {
    flex: 1,
    color: theme.colors.foreground,
  },
  placeholder: {
    flex: 1,
    color: theme.colors.inputPlaceholder,
  },
  helper: {
    marginTop: theme.spacing.xs,
    color: theme.colors.foregroundSecondary,
  },
  helperError: {
    color: theme.colors.error,
  },
}))
