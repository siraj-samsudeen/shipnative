/**
 * Theme Exports
 *
 * The boilerplate now uses Unistyles as the single source of truth for theming.
 * Most theme-related exports here are legacy and kept for backward compatibility.
 *
 * For new code, use Unistyles directly:
 * @example
 * import { useUnistyles, UnistylesRuntime, StyleSheet } from "react-native-unistyles"
 *
 * // In components
 * const { theme } = useUnistyles()
 * const isDark = UnistylesRuntime.themeName === "dark"
 *
 * // Define styles
 * const styles = StyleSheet.create((theme) => ({
 *   container: {
 *     backgroundColor: theme.colors.background,
 *     padding: theme.spacing.md,
 *   }
 * }))
 */

// Theme Provider - manages persistence and database sync
export * from "./context"

// Legacy exports - kept for backward compatibility during migration
// These should gradually be removed as code is migrated to Unistyles
export * from "./styles"
