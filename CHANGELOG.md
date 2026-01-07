# Changelog

All notable changes to Shipnative will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed - App Store Compliance
- **iOS Privacy Manifest**: Added proper data collection declarations
  - Declares `NSPrivacyCollectedDataTypeProductInteraction` for PostHog analytics
  - Declares `NSPrivacyCollectedDataTypeCrashData` for Sentry error tracking
  - Both marked as not linked to user and not used for tracking
  - Purposes: Analytics and App Functionality
  - Complies with iOS 17+ privacy requirements (App Review Guideline 5.1.1)
- **Android Permissions**: Removed `SYSTEM_ALERT_WINDOW` from production builds
  - Permission now debug-only (for React Native dev overlay)
  - Already properly isolated in `android/app/src/debug/AndroidManifest.xml`
  - Prevents unnecessary permission request in production

### Changed - Unistyles Migration
- **Single Theme System**: Migrated entire boilerplate to use Unistyles exclusively
  - Removed dual theme system (old custom theme + Unistyles)
  - All components now use `StyleSheet.create((theme) => ({...}))`
  - Dark mode detection via `UnistylesRuntime.themeName === "dark"`
  - Theme switching via `UnistylesRuntime.setTheme()`
  - Theme context simplified to persistence layer only
- **Components Migrated**: Header, Screen, DatePicker, Toggle, Switch, Checkbox, Radio
- **Navigators Migrated**: AppNavigator, MainTabNavigator
- **Screens Migrated**: ProfileScreen, ComponentShowcaseScreen
- **Breaking Changes**:
  - Removed `useAppTheme()` hook - use `useUnistyles()` instead
  - Removed `themed()` wrapper function - use styles directly
  - Removed `ThemedStyle` type - use `StyleSheet.create()` instead
  - Removed `setThemeContextOverride()` - use `UnistylesRuntime.setTheme()` instead
- **Native Date/Time Pickers**: Replaced custom modal calendar with platform-native pickers
  - iOS: Native spinner picker
  - Android: Material Design picker
  - Web: HTML5 input fallback
  - Better UX with system-native controls

### Added - Subscription Enhancements
- **Lifecycle Event Tracking**: Automatic detection and tracking of subscription events
  - Events: `trial_started`, `trial_converted`, `subscription_renewed`, `subscription_cancelled`, `billing_issue`, etc.
  - `addLifecycleListener()` method in subscription store
  - Automatic event detection on state changes with logging
- **Promotional Offers Support**: Full support for free trials and introductory pricing from RevenueCat
  - Automatic extraction of trial periods (e.g., "7 days free")
  - Intro pricing display (e.g., "$0.99 for first month")
  - Enhanced package data with `freeTrialPeriod`, `introPriceString`, `introPricePeriod` fields
  - Support for both mobile (react-native-purchases) and web (@revenuecat/purchases-js) SDKs
- **Price Localization Helpers**: New utility functions in `utils/subscriptionHelpers.ts`
  - `formatLocalizedPrice()` - Currency/locale formatting with Intl.NumberFormat
  - `calculateSavings()` - Percentage savings calculator
  - `getMonthlyEquivalent()` - Annual to monthly price conversion
  - `getPromotionalOfferText()` - Automatic promo copy generation
  - `formatExpirationStatus()` - Relative date formatting (e.g., "Renews in 5 days")
  - `getDaysRemaining()`, `isExpiringWithin()`, `isInGracePeriod()` - Status helpers
- **Mock RevenueCat Updates**: Realistic promotional offers for testing
  - Monthly: 7-day free trial + $9.99/month
  - Annual: 14-day free trial + $49.99 intro year + $99.99/year
- **Developer Tools**: Mock subscription toggle in Profile screen (dev mode only)
  - Toggle Pro on/off for testing in simulator
  - Shows "(Mock)" badge when using mock RevenueCat

### Documentation
- Added `vibe/SUBSCRIPTION_ADVANCED.md` - Comprehensive guide with examples for lifecycle events, promotional offers, and price localization
- Updated `mintlify_docs/docs/core-features/payments.mdx` - Added sections on new features with code examples
- Updated `boilerplate/AGENTS.md` - Added subscription helper function references
- Updated `boilerplate/vibe/MONETIZATION.md` - Enhanced setup and testing guide

### Changed
- **Paywall & Pricing Redesign** - Complete overhaul for higher conversion:
  - **Clear Pricing Anchors**: Annual plans show yearly price with monthly breakdown (e.g., "$69.99/year ≈ $5.83/month")
  - **Value Delta**: Added prominent benefit stack (Unlimited projects, Priority support, Advanced analytics, No watermarks)
  - **Outcome-Driven CTAs**: "Unlock Pro" for annual, "Choose Monthly" for monthly (instead of generic "Subscribe Now")
  - **Visual Hierarchy**: Annual plan gets 3px border, subtle scale transform, enhanced shadow, and "Save 40%" badge
  - **Risk Reversal**: Added "Cancel anytime • Secure App Store checkout" messaging
  - **Better Spacing**: Increased card padding (28px), larger price typography (44px), more generous gaps between elements
  - **Professional Icons**: Replaced emojis with Ionicons throughout (gift-outline for free, sparkles for pro, checkmark-circle for features)
  - Removed confusing "month" billing for annual plans
  - Monthly plan has intentionally weaker visual weight (outline button, lower contrast)

### Planned
- Stripe/PayPal add-ons alongside RevenueCat
- Offline-first data patterns and caching presets

## [1.0.0-rc8] - 2026-01-06

### Added
- **Push Token Backend Sync**: Automatic sync of Expo push tokens to Supabase `push_tokens` table:
  - Device info capture (device ID, name, platform)
  - Token activation/deactivation on logout
  - Fire-and-forget pattern for non-blocking sync
  - TypeScript types for push_tokens table in `types/supabase.ts`
- **Integration Tests**: Comprehensive test suites for core flows:
  - `notificationFlow.test.tsx`: Permission requests, token registration, notification management, badges
  - `subscriptionFlow.test.tsx`: Initialization, package fetching, purchases, restores, pro status

### Changed
- **Logger Consolidation**: Converted ~25 console.log/warn/error calls to use Logger utility across:
  - Store files (subscriptionStore, notificationStore)
  - Screen components (OnboardingScreen, PaywallScreen, EditProfileModal)
  - Service files (accountDeletion, languageSwitcher, hapticsCapability)
  - Navigation utilities and auth hooks

### Developer Experience
- Better debugging with structured logging and sensitive data redaction
- Test coverage for notification and subscription flows
- Type-safe push token database operations

## [1.0.0-rc7] - 2026-01-06

### Added
- **DatePicker Component**: Full-featured date and time picker with:
  - Calendar view with month navigation
  - Time picker with hour/minute selection
  - Support for date-only, time-only, or datetime modes
  - Min/max date constraints
  - i18n support with translation keys
  - Dark mode support
- **FilePicker Component**: File selection component with:
  - Image picker (camera roll) integration via `expo-image-picker`
  - Document picker integration via `expo-document-picker`
  - File type filtering (image, document, or any)
  - Multiple file selection with max file limit
  - File size validation
  - Image preview for selected files
  - Compact mode for inline display
- **Chart Components**: SVG-based data visualization:
  - `LineChart`: Multi-series line charts with smooth curves, area fills, and legend
  - `BarChart`: Vertical and horizontal bar charts with animated bars
  - `PieChart`: Pie and donut charts with percentage labels and legend
  - All charts support theming, animation, and responsive sizing

### Dependencies
- Added `expo-image-picker` (^17.0.10) for image selection
- Added `expo-document-picker` (^14.0.8) for document selection

## [1.0.0-rc6] - 2026-01-06

### Added
- **Supabase Realtime Hooks**: Ready-to-use hooks for common realtime patterns:
  - `useRealtimeMessages`: Full-featured chat with typing indicators, message CRUD, and connection status
  - `useRealtimePresence`: Track online users with status (online/away/busy) and custom presence data
  - `useRealtimeSubscription`: Generic hook for subscribing to any table changes
  - `useActivityFeed`: Helper for activity feed subscriptions
- **Realtime Types**: TypeScript types for messages, activities, presence, and subscriptions (`types/realtime.ts`)
- **GitHub Actions CI/CD Templates**:
  - `deploy.yml`: Production deployments for web (Vercel), iOS (EAS + App Store), Android (EAS + Play Store)
  - `preview.yml`: PR preview deployments with web URL and mobile QR code
  - Manual workflow dispatch for selective deployments
  - Build artifact uploads when Vercel isn't configured
- **Database Schemas**: SQL schemas for messages and activities tables with RLS policies

### Documentation
- **Realtime Guide**: Comprehensive documentation in `vibe/SUPABASE.md` with usage examples and database setup
- **CI/CD Guide**: New Mintlify docs page for GitHub Actions workflows (`deployment/ci-cd.mdx`)
- **Realtime Docs**: New Mintlify docs page for realtime features (`core-features/realtime.mdx`)
- **AGENTS.md**: Updated directory map with hooks, types, and CI/CD references

### Changed
- Expanded `vibe/SUPABASE.md` with full realtime hooks documentation and SQL schemas

## [1.0.0-rc5] - 2026-01-04

### Added
- **Cross-Device Preferences Sync**: Theme + notification settings now sync to the Supabase `profiles` table.
- **Dark Mode Sync**: `dark_mode_enabled` persists across devices and sessions.
- **Push Notifications Sync**: `push_notifications_enabled` is synced to the database.
- **Automatic Preference Restore**: User preferences are fetched and applied on login.

### Fixed
- **Edit Profile**: Save button no longer hangs due to `updateUser` deadlock.
- **Password Reset**: Added timeout handling to prevent hanging on `updateUser` calls.
- **Auth State**: Removed `USER_UPDATED` from events triggering `getUser()` to avoid deadlocks.

### Changed
- **Optimistic Updates**: Profile edits now use instant UI updates.
- **Fire-and-Forget**: Server updates run in the background while UI responds immediately.
- **Better UX**: Profile changes appear instantly without waiting for server confirmation.
- **Preferences Service**: New `preferencesSync.ts` service handles all preference database operations.

## [1.0.0-rc4] - 2026-01-04

### Added
- **Google Sign-In (Native)**: Switched native Google auth to ID token exchange using `@react-native-google-signin/google-signin`.
- **iOS URL Scheme Automation**: Auto-registers the Google iOS URL scheme from `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in `app.config.ts`.
- **Reliable Sessions**: Supabase auth persists via SecureStore on iOS/Android.
- **GDPR Account Deletion**: Secure edge function + SQL helper for user deletion.
- **RevenueCat Integration**: Optional subscriber data deletion on account delete.
- **PostHog Integration**: Optional user + events deletion on account delete.
- **Node 20 Tooling**: Added Volta pinning for Node 20 + Yarn 4.
- **Widget Patch**: `@bittingz/expo-widgets` log fix via patch-package.

### Changed
- **Safer Defaults**: Google client secret is configured in Supabase (not the app).
- **Docs Simplification**: Social login steps now point to official Supabase guidance.
- **Graceful Degradation**: Third-party deletions skip if services aren't configured.
- **Auth Resilience**: Better invalid refresh token handling and sign-out behavior.
- **Upgrade Safety**: Added a guide + AI prompt for merging boilerplate updates.

### Migration Notes
- Pull the latest boilerplate changes and run `yarn install`.
- Install `@react-native-google-signin/google-signin` (if upgrading from older versions).
- Add `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` to `apps/app/.env` (keep `EXPO_PUBLIC_GOOGLE_CLIENT_ID`).
- Rebuild the dev client so the Info.plist URL scheme is updated.
- Deploy the account deletion edge function: `npx supabase functions deploy delete-user --no-verify-jwt`

## [1.0.0-rc2] - 2025-12-27

This update introduces the **AGENTS.md Standard**, a significant step forward in AI-assisted development of Shipnative. It improves context locality and reduces redundancy for AI agents.

### Added
- **AI Context**: Full adoption of the **AGENTS.md Standard**.
- **Nested Discovery**: Explicit instructions for agents to discover localized `AGENTS.md` files in `apps/app`, `landing_page`, and `mintlify_docs`.
- **Claude Integration**: Updated `CLAUDE.md` with `@AGENTS.md` import syntax for Claude Code compatibility.

### Changed
- **Marketing**: Rebranded all "vibe folder" mentions to "AGENTS.md Standard" on the landing page and throughout the documentation.

## [1.0.0-rc1] - 2025-12-26

New update with many improvements and reliability fixes. It's recommended to use this new version of the boilerplate for future developments or pull these changes in if you've recently started!

### Added
- **Authentication**: Refactored `useAuth` to support the **PKCE flow** for OAuth logins.
- **In-App Social Login**: Integrated `expo-web-browser` for a seamless social login experience.
- **Diagnostics**: Smarter network error messages that suggest checking project status in the Supabase dashboard.
- **Styling**: Introduced a comprehensive Neutral/Slate palette across the entire design system.

### Changed
- **Navigation**: Finalized deep linking configuration in `App.tsx` for all core screens and tab routes.
- **Mock Mode**: Updated mock authentication to support code-to-session exchange simulation.

### Fixed
- **Subscriptions**: Implemented auto-reset and sync for `subscriptionStore` on auth state changes.
- **Hardened RLS**: Updated Supabase policies for `profiles` and `waitlist` tables for better security/privacy.
- **Linting**: Cleaned up code regressions and Prettier formatting across all repositories.

## [1.0.0-beta] - 2025-12-01

### Added
- Expo 54 starter app for **iOS, Android, and Web (Expo Web)**
- RevenueCat subscriptions for mobile + web billing with mock mode
- Supabase authentication + profiles with RLS-ready schema
- PostHog analytics + feature flags and Sentry error tracking
- Push notifications (Expo Notifications) with mock fallback
- Deep linking (universal/app links + custom scheme)
- Design system (Unistyles 3), dark mode, and 14+ reusable components
- Dev Dashboard/component showroom, auth and subscription playground
- CLI generators for screens, components, stores, queries, API routes
- AI-first docs (`vibe/` folder + `.cursorrules`) for coding assistants
- Web build pipeline (`yarn web:dev`, `yarn web:build`, `yarn web:preview`)
- Comprehensive docs (Supabase, Monetization, Analytics, Notifications, Deployment)

[Unreleased]: https://github.com/shipnativeapp/shipnative/compare/v1.0.0-beta...HEAD
[1.0.0-beta]: https://github.com/shipnativeapp/shipnative/releases/tag/v1.0.0-beta
