import React from "react"
import { Platform, View } from "react-native"

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

// React Native Web warns if a View receives raw text. Some third-party components
// can leak whitespace/text nodes into View children on web. Filter out primitive
// children for View to avoid noisy warnings while preserving actual components.
if (Platform.OS === "web") {
  const originalCreateElement = React.createElement
  const cleanChildren = (nodes: any[]): any[] =>
    nodes.reduce<any[]>((acc, node) => {
      if (Array.isArray(node)) {
        acc.push(...cleanChildren(node))
      } else if (node === null || node === undefined || typeof node === "boolean") {
        // ignore
      } else if (typeof node === "string" || typeof node === "number") {
        // drop primitives (must be wrapped in <Text/> on RN web)
      } else {
        acc.push(node)
      }
      return acc
    }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(React as any).createElement = ((type: any, props: any, ...children: any[]) => {
    if (type === View) {
      const filtered = cleanChildren(children)
      if (props?.pointerEvents) {
        const { pointerEvents, style, ...rest } = props
        const nextStyle = [{ pointerEvents }, style].filter(Boolean)
        return originalCreateElement(type, { ...rest, style: nextStyle }, ...filtered)
      }
      return originalCreateElement(type, props, ...filtered)
    }
    return originalCreateElement(type, props, ...children)
  }) as typeof React.createElement
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
