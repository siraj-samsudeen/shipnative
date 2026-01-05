import "tsx/cjs"

import { ExpoConfig, ConfigContext } from "@expo/config"

import withWidgetAppGroup from "./plugins/withWidgetAppGroup"

/**
 * @param config ExpoConfig coming from the static config app.json if it exists
 *
 * You can read more about Expo's Configuration Resolution Rules here:
 * https://docs.expo.dev/workflow/configuration/#configuration-resolution-rules
 */
module.exports = ({ config }: ConfigContext): ExpoConfig => {
  const baseConfig = config as ExpoConfig & { bundleIdentifier?: string }
  const existingPlugins = (baseConfig.plugins ?? []) as NonNullable<ExpoConfig["plugins"]>
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

  // Check if widgets are enabled via feature flag
  const enableWidgets = process.env.EXPO_PUBLIC_ENABLE_WIDGETS === "true"
  const bundleIdentifier =
    baseConfig.ios?.bundleIdentifier ||
    baseConfig.bundleIdentifier ||
    baseConfig.android?.package ||
    "com.shipnative.app"
  const appGroupIdentifier = process.env.APP_GROUP_IDENTIFIER || `group.${bundleIdentifier}`

  // Conditionally add widget plugin
  const plugins: NonNullable<ExpoConfig["plugins"]> = [...existingPlugins]
  if (enableWidgets) {
    plugins.push([
      "@bittingz/expo-widgets",
      {
        ios: {
          src: "./app/widgets/ios",
          devTeamId: process.env.APPLE_TEAM_ID || "",
          mode: "production",
          useLiveActivities: false,
          frequentUpdates: false,
        },
        android: {
          src: "./app/widgets/android",
          widgets: [
            {
              name: "ExampleWidgetProvider",
              resourceName: "@xml/example_widget_info",
            },
            {
              name: "StatsWidgetProvider",
              resourceName: "@xml/stats_widget_info",
            },
          ],
        },
      },
    ])

    plugins.push([
      withWidgetAppGroup,
      {
        appGroupIdentifier,
      },
    ] as unknown as NonNullable<ExpoConfig["plugins"]>[number])
  }

  const reversedGoogleIosClientId = googleIosClientId
    ? googleIosClientId.split(".").reverse().join(".")
    : null
  const existingUrlTypes =
    (config.ios?.infoPlist?.CFBundleURLTypes as { CFBundleURLSchemes?: string[] }[]) ?? []
  const hasGoogleScheme =
    reversedGoogleIosClientId &&
    existingUrlTypes.some((entry) =>
      (entry.CFBundleURLSchemes ?? []).includes(reversedGoogleIosClientId),
    )
  const urlTypes = reversedGoogleIosClientId
    ? hasGoogleScheme
      ? existingUrlTypes
      : [
          ...existingUrlTypes,
          {
            CFBundleURLSchemes: [reversedGoogleIosClientId],
          },
        ]
    : existingUrlTypes

  return {
    ...baseConfig,
    // Ensure icon is preserved from app.json
    icon: config.icon || "./assets/images/app-icon-all.png",
    ios: {
      ...config.ios,
      // Ensure bundleIdentifier is preserved
      bundleIdentifier,
      // Ensure iOS icon is preserved from app.json
      icon: config.ios?.icon || "./assets/images/app-icon-ios.png",
      // Status bar appearance configuration for react-native-screens
      // This must be set to YES to allow view controllers to control status bar appearance
      infoPlist: {
        ...config.ios?.infoPlist,
        UIViewControllerBasedStatusBarAppearance: true,
        CFBundleURLTypes: urlTypes,
      },
      // This privacyManifests is to get you started.
      // See Expo's guide on apple privacy manifests here:
      // https://docs.expo.dev/guides/apple-privacy/
      // You may need to add more privacy manifests depending on your app's usage of APIs.
      // More details and a list of "required reason" APIs can be found in the Apple Developer Documentation.
      // https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"], // CA92.1 = "Access info from same app, per documentation"
          },
        ],
      },
    },
    plugins,
  }
}
