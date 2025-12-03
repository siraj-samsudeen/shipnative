#!/usr/bin/env node

/* eslint-env node */
const fs = require("fs")
const path = require("path")
const readline = require("readline")
const { execSync } = require("child_process")

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
  terminal: true,
})

// Helper to ask a question
const askQuestion = (question, validator, defaultValue) => {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} (default: ${defaultValue}): ` : `${question}: `
    rl.question(prompt, (answer) => {
      const value = answer.trim() || defaultValue || ""
      if (validator && !validator(value)) {
        console.log("❌ Invalid input. Please try again.")
        resolve(askQuestion(question, validator, defaultValue))
      } else {
        resolve(value)
      }
    })
  })
}

// Helper to ask yes/no question
const askYesNo = (question, defaultValue = true) => {
  return new Promise((resolve) => {
    const defaultText = defaultValue ? "[Y/n]" : "[y/N]"
    rl.question(`${question} ${defaultText}: `, (answer) => {
      const normalized = answer.trim().toLowerCase()
      if (normalized === "") {
        resolve(defaultValue)
      } else {
        resolve(normalized === "y" || normalized === "yes")
      }
    })
  })
}

// Helper to present a numbered choice list
const askChoice = async (question, options, defaultValue) => {
  const defaultIndex =
    defaultValue != null ? options.findIndex((option) => option.value === defaultValue) : 0
  const promptDefault = defaultIndex >= 0 ? String(defaultIndex + 1) : undefined

  console.log(`\n${question}`)
  options.forEach((option, index) => {
    console.log(`  ${index + 1}. ${option.label}`)
  })

  const answer = await askQuestion(
    "Select an option by number",
    (input) => {
      const num = Number(input)
      return Number.isInteger(num) && num >= 1 && num <= options.length
    },
    promptDefault
  )

  const selectedIndex = parseInt(answer, 10) - 1
  return options[selectedIndex].value
}

// Validators
const validateBundleId = (bundleId) => /^[a-zA-Z0-9-.]+$/.test(bundleId)
const validateScheme = (scheme) => /^[a-z0-9]+$/.test(scheme)
const validateUrl = (url) => url.startsWith("https://")
const validateNotEmpty = (value) => value.length > 0
const validateSupabaseKey = (key) =>
  /^sb_publishable_[A-Za-z0-9_-]+$/.test(key) || key.startsWith("ey") || key.length > 20

// Utility helpers
const repeatLine = (char = "━") => char.repeat(70)
const printSection = (title, descriptionLines = []) => {
  console.log("\n" + repeatLine())
  console.log(title)
  console.log(repeatLine())
  descriptionLines.forEach((line) => console.log(line))
  if (descriptionLines.length) {
    console.log()
  }
}

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, "utf8")
  return content.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) return acc
    const delimiterIndex = trimmed.indexOf("=")
    if (delimiterIndex === -1) return acc
    const key = trimmed.slice(0, delimiterIndex).trim()
    const value = trimmed.slice(delimiterIndex + 1).trim()
    acc[key] = value
    return acc
  }, {})
}

const getMetadataDefaults = () => {
  const appJsonPath = path.join(__dirname, "apps/app/app.json")
  if (!fs.existsSync(appJsonPath)) return {}

  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"))
    const configRoot = appJson.expo || appJson
    return {
      displayName: configRoot.name,
      projectName: configRoot.slug,
      bundleId: configRoot?.ios?.bundleIdentifier,
      scheme: configRoot.scheme || configRoot.slug,
    }
  } catch (error) {
    console.warn("⚠️ Could not read existing app.json for defaults:", error.message)
    return {}
  }
}

const serviceLabels = {
  supabase: "Supabase",
  google: "Google OAuth",
  apple: "Apple Sign-In",
  posthog: "PostHog",
  revenuecat: "RevenueCat",
  sentry: "Sentry",
  fcm: "Firebase Cloud Messaging",
}

const getServiceStatus = (services) => ({
  supabase: Boolean(
    services.EXPO_PUBLIC_SUPABASE_URL ||
      services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ),
  google: Boolean(services.EXPO_PUBLIC_GOOGLE_CLIENT_ID || services.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET),
  apple: Boolean(
    services.EXPO_PUBLIC_APPLE_SERVICES_ID ||
      services.EXPO_PUBLIC_APPLE_TEAM_ID ||
      services.EXPO_PUBLIC_APPLE_PRIVATE_KEY ||
      services.EXPO_PUBLIC_APPLE_KEY_ID
  ),
  posthog: Boolean(services.EXPO_PUBLIC_POSTHOG_API_KEY),
  revenuecat: Boolean(
    services.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
      services.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ||
      services.EXPO_PUBLIC_REVENUECAT_WEB_KEY
  ),
  sentry: Boolean(services.EXPO_PUBLIC_SENTRY_DSN),
  fcm: Boolean(services.EXPO_PUBLIC_FCM_SERVER_KEY),
})

const formatServiceList = (status, target = true) =>
  Object.entries(status)
    .filter(([, isConfigured]) => isConfigured === target)
    .map(([key]) => serviceLabels[key])
    .filter(Boolean)

// ========================================
// CONFIGURATION STEPS
// ========================================
const configureMetadata = async (config, defaults = {}) => {
  printSection("📱 PROJECT METADATA", [
    "These values define how your app appears to users and app stores.",
    "• App Display Name: short, friendly text under the icon and in store listings.",
    "• Project Name (slug): developer-facing ID used in folders/URLs; lowercase with dashes.",
    "• Bundle Identifier: reverse-domain ID required by Apple/Google (e.g., com.acme.shipnative).",
    "• App Scheme: lowercase token for deep links and OAuth callbacks (e.g., shipnativeapp).",
    "Values in parentheses come from existing config when available.",
  ])

  console.log("\nℹ️  App Display Name shows on users' home screens. Keep it short and readable.")
  const defaultDisplayName = defaults.displayName || "My ShipNative App"
  config.displayName = await askQuestion(
    "What is your app's display name? (shown to users)",
    validateNotEmpty,
    defaultDisplayName
  )

  console.log(
    "\nℹ️  Project Name is a URL-safe slug used in build folders and links. Lowercase, numbers, and dashes only."
  )
  const derivedProjectName = config.displayName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
  const defaultProjectName = defaults.projectName || derivedProjectName
  config.projectName = await askQuestion(
    "What is your project name? (lowercase, no spaces)",
    (name) => /^[a-z0-9-]+$/.test(name),
    defaultProjectName
  )

  console.log(
    "\nℹ️  Bundle Identifier uniquely identifies your app in the stores. Use a domain you control (e.g., com.yourcompany.app)."
  )
  const defaultBundleId = defaults.bundleId || `com.shipnative.${config.projectName.replace(/-/g, "")}`
  config.bundleId = await askQuestion(
    "What is your bundle identifier? (e.g., com.company.app)",
    validateBundleId,
    defaultBundleId
  )

  console.log(
    "\nℹ️  App Scheme powers deep links and sign-in redirects. Keep it short, lowercase, and unique (e.g., shipnativeapp)."
  )
  const defaultScheme = defaults.scheme || config.projectName.replace(/-/g, "")
  config.scheme = await askQuestion(
    "What is your app scheme? (for deep linking, e.g., myapp)",
    validateScheme,
    defaultScheme
  )

  return true
}

const configureSupabase = async (services, defaults = {}, options = {}) => {
  printSection("🔹 SUPABASE (Backend & Auth)", [
    "Supabase provides database, authentication, and real-time features.",
    "Use your project URL and a publishable key (sb_publishable_...) that is safe to ship in mobile/desktop apps.",
    "Secret/Service Role keys must stay on servers only.",
    "Create a project at: https://supabase.com/dashboard/projects",
  ])

  const shouldConfigure =
    options.skipConfirm || (await askYesNo("Do you want to set up Supabase now?", true))
  if (!shouldConfigure) return false

  const defaultPublishableKey = defaults.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  services.EXPO_PUBLIC_SUPABASE_URL = await askQuestion(
    "Enter your Supabase Project URL",
    validateUrl,
    defaults.EXPO_PUBLIC_SUPABASE_URL
  )
  services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = await askQuestion(
    "Enter your Supabase publishable key (starts with sb_publishable_... and safe to embed)",
    validateSupabaseKey,
    defaultPublishableKey
  )
  return true
}

const configureGoogleOAuth = async (services, defaults = {}, options = {}) => {
  printSection("🔹 GOOGLE OAUTH (Social Login)", [
    "Enable Google sign-in for your users.",
    "Setup at: https://console.cloud.google.com/apis/credentials",
  ])

  const shouldConfigure =
    options.skipConfirm || (await askYesNo("Do you want to set up Google OAuth?", false))
  if (!shouldConfigure) return false

  services.EXPO_PUBLIC_GOOGLE_CLIENT_ID = await askQuestion(
    "Enter your Google OAuth Client ID",
    (id) => id.length > 10,
    defaults.EXPO_PUBLIC_GOOGLE_CLIENT_ID
  )
  services.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET = await askQuestion(
    "Enter your Google OAuth Client Secret",
    (secret) => secret.length > 10,
    defaults.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET
  )
  return true
}

const configureAppleSignIn = async (services, defaults = {}, options = {}) => {
  printSection("🔹 APPLE SIGN-IN (Social Login)", [
    "Enable Apple sign-in for iOS users.",
    "Setup at: https://developer.apple.com/account/resources/identifiers/list",
  ])

  const shouldConfigure =
    options.skipConfirm || (await askYesNo("Do you want to set up Apple Sign-In?", false))
  if (!shouldConfigure) return false

  services.EXPO_PUBLIC_APPLE_SERVICES_ID = await askQuestion(
    "Enter your Apple Services ID",
    (id) => id.includes("."),
    defaults.EXPO_PUBLIC_APPLE_SERVICES_ID
  )
  services.EXPO_PUBLIC_APPLE_TEAM_ID = await askQuestion(
    "Enter your Apple Team ID (10 characters)",
    (id) => /^[A-Z0-9]{10}$/.test(id),
    defaults.EXPO_PUBLIC_APPLE_TEAM_ID
  )
  services.EXPO_PUBLIC_APPLE_PRIVATE_KEY = await askQuestion(
    "Enter your Apple Private Key",
    (key) => key.startsWith("-----BEGIN PRIVATE KEY-----"),
    defaults.EXPO_PUBLIC_APPLE_PRIVATE_KEY
  )
  services.EXPO_PUBLIC_APPLE_KEY_ID = await askQuestion(
    "Enter your Apple Key ID (10 characters)",
    (id) => /^[A-Z0-9]{10}$/.test(id),
    defaults.EXPO_PUBLIC_APPLE_KEY_ID
  )
  return true
}

const configurePostHog = async (services, defaults = {}, options = {}) => {
  printSection("🔹 POSTHOG (Analytics)", [
    "Track user behavior with analytics, session recording, and feature flags.",
    "Create a project at: https://us.posthog.com/project/settings",
  ])

  const shouldConfigure =
    options.skipConfirm || (await askYesNo("Do you want to set up PostHog?", false))
  if (!shouldConfigure) return false

  services.EXPO_PUBLIC_POSTHOG_API_KEY = await askQuestion(
    "Enter your PostHog API Key",
    validateNotEmpty,
    defaults.EXPO_PUBLIC_POSTHOG_API_KEY
  )
  services.EXPO_PUBLIC_POSTHOG_HOST = await askQuestion(
    "Enter your PostHog Host",
    validateUrl,
    defaults.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"
  )
  return true
}

const configureRevenueCat = async (services, defaults = {}, options = {}) => {
  printSection("🔹 REVENUECAT (In-App Purchases)", [
    "Implement subscriptions and in-app purchases across iOS, Android, and Web.",
    "Create a project at: https://app.revenuecat.com/",
  ])

  const shouldConfigure =
    options.skipConfirm || (await askYesNo("Do you want to set up RevenueCat?", false))
  if (!shouldConfigure) return false

  services.EXPO_PUBLIC_REVENUECAT_IOS_KEY = await askQuestion(
    "Enter your RevenueCat iOS Public API Key (optional)",
    null,
    defaults.EXPO_PUBLIC_REVENUECAT_IOS_KEY
  )
  services.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = await askQuestion(
    "Enter your RevenueCat Android Public API Key (optional)",
    null,
    defaults.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
  )
  services.EXPO_PUBLIC_REVENUECAT_WEB_KEY = await askQuestion(
    "Enter your RevenueCat Web Public API Key (optional, for Web Billing)",
    null,
    defaults.EXPO_PUBLIC_REVENUECAT_WEB_KEY
  )
  return true
}

const configureSentry = async (services, defaults = {}, options = {}) => {
  printSection("🔹 SENTRY (Error Tracking)", [
    "Track app crashes and performance issues.",
    "Create a project at: https://sentry.io/projects/new/",
  ])

  const shouldConfigure =
    options.skipConfirm || (await askYesNo("Do you want to set up Sentry?", false))
  if (!shouldConfigure) return false

  services.EXPO_PUBLIC_SENTRY_DSN = await askQuestion(
    "Enter your Sentry DSN",
    validateUrl,
    defaults.EXPO_PUBLIC_SENTRY_DSN
  )
  return true
}

const configureFCM = async (services, defaults = {}, options = {}) => {
  printSection("🔹 FIREBASE CLOUD MESSAGING (Push Notifications)", [
    "Enable push notifications for Android (iOS uses APNs automatically).",
    "Setup at: https://console.firebase.google.com/",
  ])

  const shouldConfigure =
    options.skipConfirm || (await askYesNo("Do you want to set up Firebase Cloud Messaging?", false))
  if (!shouldConfigure) return false

  services.EXPO_PUBLIC_FCM_SERVER_KEY = await askQuestion(
    "Enter your Firebase Cloud Messaging Server Key",
    (key) => key.length > 20,
    defaults.EXPO_PUBLIC_FCM_SERVER_KEY
  )
  console.log("\n💡 Don't forget to download google-services.json for Android!")
  console.log("   Place it in: apps/app/android/app/google-services.json")
  return true
}

const servicesCatalog = [
  { key: "supabase", label: "Supabase (Backend & Auth)", handler: configureSupabase },
  { key: "google", label: "Google OAuth (Social Login)", handler: configureGoogleOAuth },
  { key: "apple", label: "Apple Sign-In (Social Login)", handler: configureAppleSignIn },
  { key: "posthog", label: "PostHog (Analytics)", handler: configurePostHog },
  { key: "revenuecat", label: "RevenueCat (Monetization)", handler: configureRevenueCat },
  { key: "sentry", label: "Sentry (Error Tracking)", handler: configureSentry },
  { key: "fcm", label: "Firebase Cloud Messaging (Push)", handler: configureFCM },
]

const configureServicesSequentially = async (services, defaults, options = {}) => {
  let configuredCount = 0
  for (const service of servicesCatalog) {
    const configured = await service.handler(services, defaults, options)
    if (configured) configuredCount += 1
  }
  return configuredCount
}

const runServiceMenu = async (services, defaults) => {
  let configuredCount = 0
  while (true) {
    const choice = await askChoice("Which service would you like to configure next?", [
      ...servicesCatalog.map((service) => ({
        value: service.key,
        label: service.label,
      })),
      { value: "done", label: "Done configuring services" },
    ])

    if (choice === "done") {
      break
    }

    const selected = servicesCatalog.find((service) => service.key === choice)
    if (selected) {
      const configured = await selected.handler(services, defaults, { skipConfirm: true })
      if (configured) configuredCount += 1
    }
  }
  return configuredCount
}

// ========================================
// MAIN SETUP
// ========================================
async function setup() {
  console.log("\n" + repeatLine("="))
  console.log("🚀 ShipNative Setup")
  console.log(repeatLine("="))
  console.log("\nChoose how you want to configure your project.")
  console.log("You can run the full wizard, or jump straight into individual services.\n")

  const envPath = path.join(__dirname, "apps/app/.env")
  const existingEnv = loadEnvFile(envPath)
  const metadataDefaults = getMetadataDefaults()
  const config = {}
  const services = { ...existingEnv }

  // Migrate legacy anon key input to publishable key and drop the old variable name
  if (services.EXPO_PUBLIC_SUPABASE_ANON_KEY && !services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = services.EXPO_PUBLIC_SUPABASE_ANON_KEY
  }
  delete services.EXPO_PUBLIC_SUPABASE_ANON_KEY
  const serviceDefaults = { ...services }

  const mode = await askChoice("Setup mode:", [
    {
      value: "wizard",
      label: "Guided setup wizard (metadata + recommended service walkthrough)",
    },
    {
      value: "service-menu",
      label: "Service configurator (pick and edit services individually)",
    },
    {
      value: "metadata-only",
      label: "Update app metadata only (skip services)",
    },
    { value: "exit", label: "Exit without making changes" },
  ])

  if (mode === "exit") {
    console.log("\n👋 No changes made. Run `yarn setup` again when you're ready.\n")
    rl.close()
    process.exit(0)
  }

  let metadataConfigured = false
  let servicesConfigured = 0

  if (mode === "wizard") {
    metadataConfigured = await configureMetadata(config, metadataDefaults)
    servicesConfigured = await configureServicesSequentially(services, serviceDefaults)
  } else if (mode === "service-menu") {
    console.log("\nOpening the service configurator. Use it to edit one service at a time.\n")
    servicesConfigured = await runServiceMenu(services, serviceDefaults)
  } else if (mode === "metadata-only") {
    metadataConfigured = await configureMetadata(config, metadataDefaults)
  }

  // ========================================
  // APPLY CHANGES
  // ========================================
  printSection("💾 APPLYING CONFIGURATION")

  const appJsonPath = path.join(__dirname, "apps/app/app.json")
  const appPackageJsonPath = path.join(__dirname, "apps/app/package.json")

  if (metadataConfigured) {
    console.log("\n📝 Updating app.json...")
    if (fs.existsSync(appJsonPath)) {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"))
      const configRoot = appJson.expo || appJson

      configRoot.name = config.displayName
      configRoot.slug = config.projectName
      configRoot.scheme = config.scheme

      if (!configRoot.ios) configRoot.ios = {}
      configRoot.ios.bundleIdentifier = config.bundleId

      if (!configRoot.android) configRoot.android = {}
      configRoot.android.package = config.bundleId

      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2))
      console.log("   ✅ app.json updated")
    } else {
      console.log("   ⚠️ app.json not found at apps/app/app.json - skipping metadata update")
    }

    if (fs.existsSync(appPackageJsonPath)) {
      console.log("\n📝 Updating apps/app/package.json...")
      const packageJson = JSON.parse(fs.readFileSync(appPackageJsonPath, "utf8"))
      packageJson.name = config.projectName
      fs.writeFileSync(appPackageJsonPath, JSON.stringify(packageJson, null, 2))
      console.log("   ✅ apps/app/package.json updated")
    } else {
      console.log("   ⚠️ package.json not found at apps/app/package.json - skipping package update")
    }
  } else {
    console.log("\nℹ️ Skipping app metadata updates (not selected in this run)")
  }

  if (servicesConfigured > 0 && Object.keys(services).length > 0) {
    console.log("\n📝 Updating .env with service settings...")
    const envContent = Object.entries(services)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")
    fs.writeFileSync(envPath, envContent)
    console.log(`   ✅ .env file updated at apps/app/.env (${Object.keys(services).length} entries)`)
  } else if (Object.keys(existingEnv).length > 0) {
    console.log("\nℹ️ No service changes captured - leaving existing apps/app/.env untouched")
  } else {
    console.log("\n💡 No services configured - app will run in MOCK mode")
  }

  // Offer to install dependencies only when configuration was performed
  const shouldOfferInstall = metadataConfigured || servicesConfigured > 0
  if (shouldOfferInstall) {
    printSection("📦 DEPENDENCIES")
    const shouldInstall = await askYesNo("\nDo you want to install dependencies now? (yarn install)", true)
    if (shouldInstall) {
      console.log("\n📦 Installing dependencies (this may take a few minutes)...\n")
      try {
        execSync("yarn install", { stdio: "inherit" })
        console.log("\n   ✅ Dependencies installed successfully")
      } catch (error) {
        console.error("   ❌ Failed to install dependencies")
        console.error("   Please run 'yarn install' manually")
      }
    }
  } else {
    console.log("\nℹ️ Skipping dependency install prompt (no changes made)")
  }

  // ========================================
  // COMPLETION
  // ========================================
  const serviceStatus = getServiceStatus(services)
  const configuredServices = formatServiceList(serviceStatus, true)
  const mockServices = formatServiceList(serviceStatus, false)
  const totalServices = Object.keys(serviceStatus).length

  const effectiveConfig = {
    displayName: config.displayName || metadataDefaults.displayName || "My ShipNative App",
    bundleId: config.bundleId || metadataDefaults.bundleId || "com.shipnative.app",
    scheme: config.scheme || metadataDefaults.scheme || "shipnativeapp",
    projectName: config.projectName || metadataDefaults.projectName || "shipnative-app",
  }

  console.log("\n" + repeatLine("="))
  console.log("🎉 SETUP COMPLETE!")
  console.log(repeatLine("="))

  console.log("\n📚 Important Documentation Files:")
  console.log("\n📖 Getting Started:")
  console.log("   • README.md - Main documentation and quick start")
  console.log("   • apps/app/vibe/CONTEXT.md - App architecture")
  console.log("   • apps/app/vibe/TECH_STACK.md - Technologies used")
  console.log("   • apps/app/vibe/STYLE_GUIDE.md - Code patterns")

  console.log("\n🔧 Setup & Integration:")
  console.log("   • docs/SUPABASE.md - Auth and database")
  console.log("   • docs/MONETIZATION.md - Payments (RevenueCat for iOS, Android & Web)")
  console.log("   • docs/ANALYTICS.md - PostHog and Sentry")
  console.log("   • docs/NOTIFICATIONS.md - Push notifications")
  console.log("   • docs/DESIGN_SYSTEM.md - UI components")

  console.log("\n🚀 Deployment:")
  console.log("   • docs/DEPLOYMENT.md - iOS, Android, Web deployment")
  console.log("   • docs/TROUBLESHOOTING.md - Common issues")

  console.log("\n🔗 Your Configuration:")
  console.log(`   • Display Name: ${effectiveConfig.displayName}${metadataConfigured ? "" : " (unchanged)"}`)
  console.log(`   • Bundle ID: ${effectiveConfig.bundleId}${metadataConfigured ? "" : " (unchanged)"}`)
  console.log(`   • URL Scheme: ${effectiveConfig.scheme}://${metadataConfigured ? "" : " (unchanged)"}`)
  console.log(
    `   • Services configured: ${configuredServices.length} / ${totalServices}${
      configuredServices.length ? ` (${configuredServices.join(", ")})` : " (all in mock mode)"
    }`
  )
  if (mockServices.length) {
    console.log(`   • Mock mode: ${mockServices.join(", ")}`)
  }

  console.log("\n💡 Next Steps:")
  console.log("   1. cd apps/app")
  console.log("   2. yarn ios  (or yarn android)")
  console.log("   3. Check the Dev Dashboard in the app")
  console.log("   4. Read docs/SUPABASE.md to set up your database")
  console.log("   5. Read docs/MONETIZATION.md to configure subscriptions (RevenueCat)")

  console.log("\n🤖 AI-Assisted Development:")
  console.log("   Use this prompt in Cursor/Claude:")
  console.log('   "I am ready to vibe. Read the .cursorrules and the vibe/ folder.')
  console.log('   I want to build a [Description of App]. Start by outlining')
  console.log('   the database schema changes I need."')

  console.log("\n🔗 Test Deep Linking:")
  console.log(`   xcrun simctl openurl booted "${effectiveConfig.scheme}://profile"`)

  console.log("\n" + repeatLine("="))
  console.log("Happy coding! 🚀")
  console.log(repeatLine("=") + "\n")

  rl.close()
  process.exit(0)
}

// Run setup
setup().catch((error) => {
  console.error("\n❌ Setup failed:", error.message)
  rl.close()
  process.exit(1)
})
