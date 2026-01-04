/* eslint-env node */
const fs = require("fs")
const path = require("path")
const readline = require("readline")

// Ensure stdin is properly configured
if (process.stdin.isTTY) {
  process.stdin.setEncoding("utf8")
  if (process.stdin.isPaused()) {
    process.stdin.resume()
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true, // Enable terminal mode for better input handling
})

const questions = [
  { key: "EXPO_PUBLIC_SUPABASE_URL", question: "Enter your Supabase URL: " },
  {
    key: "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    question: "Enter your Supabase publishable key (sb_publishable_...): ",
  },
  {
    key: "EXPO_PUBLIC_GOOGLE_CLIENT_ID",
    question: "Enter your Google OAuth Web Client ID (optional, for social login): ",
  },
  {
    key: "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID",
    question: "Enter your Google OAuth iOS Client ID (optional, for social login): ",
  },
  {
    key: "EXPO_PUBLIC_APPLE_SERVICES_ID",
    question: "Enter your Apple Services ID (optional, for social login): ",
  },
  {
    key: "EXPO_PUBLIC_APPLE_TEAM_ID",
    question: "Enter your Apple Team ID (optional, for social login): ",
  },
  {
    key: "EXPO_PUBLIC_APPLE_PRIVATE_KEY",
    question: "Enter your Apple Private Key (optional, for social login): ",
  },
  {
    key: "EXPO_PUBLIC_APPLE_KEY_ID",
    question: "Enter your Apple Key ID (optional, for social login): ",
  },
  { key: "EXPO_PUBLIC_POSTHOG_API_KEY", question: "Enter your Posthog API Key (optional): " },
  {
    key: "EXPO_PUBLIC_POSTHOG_HOST",
    question: "Enter your Posthog Host (default: https://app.posthog.com): ",
    default: "https://app.posthog.com",
  },
  { key: "EXPO_PUBLIC_REVENUECAT_IOS_KEY", question: "Enter your RevenueCat iOS Key (optional): " },
  {
    key: "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
    question: "Enter your RevenueCat Android Key (optional): ",
  },
  {
    key: "EXPO_PUBLIC_REVENUECAT_WEB_KEY",
    question: "Enter your RevenueCat Web Key (optional, for web billing): ",
  },
  {
    key: "EXPO_PUBLIC_SENTRY_DSN",
    question: "Enter your Sentry DSN (optional, for error tracking): ",
  },
  {
    key: "EXPO_PUBLIC_FCM_SERVER_KEY",
    question: "Enter your Firebase Cloud Messaging Server Key (optional, for push notifications): ",
  },
]

const envFile = path.join(__dirname, "../.env")
let envContent = ""

const askQuestion = (index) => {
  if (index === questions.length) {
    fs.writeFileSync(envFile, envContent)
    console.log(`\n✅ .env file created at ${envFile}`)

    // Show documentation references
    console.log("\n" + "=".repeat(70))
    console.log("📚 IMPORTANT DOCUMENTATION FILES")
    console.log("=".repeat(70))
    console.log("\n📖 Getting Started:")
    console.log("   • README.md - Main documentation and quick start")
    console.log("   • apps/app/vibe/CONTEXT.md - App architecture and AI guidelines")
    console.log("   • apps/app/vibe/TECH_STACK.md - Technologies used")
    console.log("   • apps/app/vibe/STYLE_GUIDE.md - Code style and best practices")

    console.log("\n🔧 Setup & Integration:")
    console.log("   • docs/SUPABASE.md - Authentication and database setup")
    console.log("   • docs/MONETIZATION.md - Payment setup (RevenueCat for iOS, Android & Web)")
    console.log("   • docs/ANALYTICS.md - PostHog analytics and Sentry error tracking")
    console.log("   • docs/NOTIFICATIONS.md - Push notifications (local & remote)")
    console.log("   • docs/DESIGN_SYSTEM.md - UI components and design tokens")

    console.log("\n🚀 Deployment & Help:")
    console.log("   • docs/DEPLOYMENT.md - Deploy to iOS, Android, and Web")
    console.log("   • docs/TROUBLESHOOTING.md - Common issues and solutions")

    console.log("\n🔔 Push Notifications Setup:")
    console.log("   • iOS: Configure APNs in Apple Developer Console")
    console.log("   • Android: Create Firebase project and download google-services.json")
    console.log("   • See docs/NOTIFICATIONS.md for complete setup guide")

    console.log("\n🔗 Deep Linking:")
    console.log("   • URL Scheme: shipnative://")
    console.log("   • Configure in app.json for universal links")
    console.log('   • Test: xcrun simctl openurl booted "shipnative://profile"')
    console.log("   • See docs/NOTIFICATIONS.md for deep linking with notifications")

    console.log("\n💡 Next Steps:")
    console.log("   1. Run: yarn app:ios (or yarn app:android)")
    console.log("   2. The app will use MOCK mode for any missing credentials")
    console.log("   3. Check the Dev Dashboard in the app for component examples")
    console.log("   4. Read docs/SUPABASE.md to set up your database schema")
    console.log("   5. Read docs/MONETIZATION.md to configure subscription products")

    console.log("\n🤖 AI-Assisted Development:")
    console.log("   Use this prompt in Cursor/Claude:")
    console.log('   "I am ready to vibe. Read the .cursorrules and the vibe/ folder."')
    console.log('   "I want to build a [Description of App]. Start by outlining')
    console.log('   "the database schema changes I need."')

    console.log("\n" + "=".repeat(70))
    console.log("🎉 Setup complete! Happy coding!")
    console.log("=".repeat(70) + "\n")

    rl.close()
    return
  }

  const q = questions[index]
  rl.question(q.question, (answer) => {
    const value = answer.trim() || q.default || ""
    envContent += `${q.key}=${value}\n`
    askQuestion(index + 1)
  })
}

console.log("\n" + "=".repeat(70))
console.log("🚀 Welcome to Shipnative Starter Kit Setup!")
console.log("=".repeat(70))
console.log("\nWe'll help you configure your app with:")
console.log("  • Supabase (Authentication & Database)")
console.log("  • Google OAuth (Social Login)")
console.log("  • Apple Sign-In (Social Login)")
console.log("  • RevenueCat (iOS, Android & Web Payments)")
console.log("  • PostHog (Analytics)")
console.log("  • Sentry (Error Tracking)")
console.log("  • Push Notifications (Firebase)")
console.log("\n💡 Tip: You can skip any optional field - the app will use MOCK mode")
console.log("   for development without API keys!\n")

askQuestion(0)
