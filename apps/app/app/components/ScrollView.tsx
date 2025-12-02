import { ReactNode } from "react"
import {
  Platform,
  ScrollView as RNScrollView,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from "react-native"
import { StyleSheet } from "react-native-unistyles"

// =============================================================================
// TYPES
// =============================================================================

export interface AppScrollViewProps extends ScrollViewProps {
  children: ReactNode
}

// =============================================================================
// CONSTANTS
// =============================================================================

const isWeb = Platform.OS === "web"

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ScrollView component with web scrolling support.
 *
 * This component wraps React Native's ScrollView and adds web-specific
 * overflow styles to enable proper scrolling on web browsers.
 *
 * @example
 * ```tsx
 * <AppScrollView contentContainerStyle={styles.content}>
 *   <Text>Scrollable content</Text>
 * </AppScrollView>
 * ```
 */
export function ScrollView(props: AppScrollViewProps) {
  const { style, contentContainerStyle, ...restProps } = props

  // Web needs explicit overflow styles and height for scrolling
  const webScrollStyle: StyleProp<ViewStyle> = isWeb
    ? ({
        overflowY: "auto" as unknown as "scroll",
        flexGrow: 1,
        flexShrink: 1,
        minHeight: 0 as unknown as number,
      } as ViewStyle)
    : undefined

  return (
    <RNScrollView
      style={[styles.scrollView, webScrollStyle, style]}
      contentContainerStyle={contentContainerStyle}
      {...restProps}
    />
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create(() => ({
  scrollView: {
    flex: 1,
  },
}))
