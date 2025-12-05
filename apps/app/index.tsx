// Initialize Unistyles FIRST - before any other imports
import "./app/theme/unistyles"

// Web polyfill for Reanimated - must be imported before Reanimated is used
import "./app/utils/shims/reanimated.web"

// Web global styles for scrolling fix
import "./app/utils/shims/webGlobalStyles"
import "@/utils/gestureHandler"
import "@expo/metro-runtime" // this is for fast refresh on web w/o expo-router
import { registerRootComponent } from "expo"

import { App } from "@/app"

// Note: React 19 doesn't allow overriding React.createElement (getter-only property)
// Components should handle filtering primitive children themselves (e.g., AuthScreenLayout)

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
