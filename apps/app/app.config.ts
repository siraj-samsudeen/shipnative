import { ExpoConfig, ConfigContext } from "@expo/config"

/**
 * Use tsx/cjs here so we can use TypeScript for our Config Plugins
 * and not have to compile them to JavaScript.
 *
 * See https://docs.expo.dev/config-plugins/plugins/#add-typescript-support-and-convert-to-dynamic-app-config
 */
import "tsx/cjs"

/**
 * @param config ExpoConfig coming from the static config app.json if it exists
 *
 * You can read more about Expo's Configuration Resolution Rules here:
 * https://docs.expo.dev/workflow/configuration/#configuration-resolution-rules
 */
module.exports = ({ config }: ConfigContext): Partial<ExpoConfig> => {
  const existingPlugins = config.plugins ?? []

  // Check if widgets are enabled via feature flag
  const enableWidgets = process.env.EXPO_PUBLIC_ENABLE_WIDGETS === "true"

  // Conditionally add widget plugin
  const plugins = [...existingPlugins]
  if (enableWidgets) {
    plugins.push([
      "@bittingz/expo-widgets",
      {
        ios: {
          src: "./app/widgets/ios",
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
          ],
        },
      },
    ])
  }

  return {
    ...config,
    // Ensure icon is preserved from app.json
    icon: config.icon || "./assets/images/app-icon-all.png",
    ios: {
      ...config.ios,
      // Ensure bundleIdentifier is preserved
      bundleIdentifier: config.ios?.bundleIdentifier || "com.reactnativestarterkit",
      // Ensure iOS icon is preserved from app.json
      icon: config.ios?.icon || "./assets/images/app-icon-ios.png",
      // Status bar appearance configuration for react-native-screens
      // This must be set to YES to allow view controllers to control status bar appearance
      infoPlist: {
        ...config.ios?.infoPlist,
        UIViewControllerBasedStatusBarAppearance: true,
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
