#!/usr/bin/env node

/* eslint-env node */
const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")
const inquirer = require("inquirer")
const ora = require("ora")
const chalk = require("chalk")
const boxen = require("boxen")

// ========================================
// CONSTANTS
// ========================================
const MIN_NODE_VERSION = "20.0.0"
const MIN_YARN_VERSION = "4.0.0"
const BACKUP_DIR = path.join(__dirname, ".setup-backups")

// ========================================
// HELPER FUNCTIONS
// ========================================

// Check if running in non-interactive mode
const isNonInteractive = process.env.CI === "true" || process.argv.includes("--non-interactive")
const isHelpRequested = process.argv.includes("--help") || process.argv.includes("-h")

// Show help and exit
if (isHelpRequested) {
  console.log(`
🚀 Shipnative Setup Script

Usage:
  yarn setup [options]

Options:
  --help, -h              Show this help message
  --non-interactive       Run in non-interactive mode (uses env vars)
  --skip-prereqs          Skip prerequisite checks
  --skip-backup           Skip creating backups
  --validate-services     Test service connectivity after configuration
  --dry-run               Preview changes without applying them

Examples:
  yarn setup                                    # Interactive setup wizard
  yarn setup --non-interactive                 # CI/CD mode
  yarn setup --validate-services                # Test services after setup
  yarn setup --dry-run                          # Preview changes

For more information, visit: https://docs.shipnative.app
`)
  process.exit(0)
}

// Inquirer is ready to use for interactive prompts

// ========================================
// PREREQUISITES CHECK
// ========================================
const checkPrerequisites = async (skipCheck = false) => {
  if (skipCheck || process.argv.includes("--skip-prereqs")) {
    return true
  }

  const spinner = ora("Checking prerequisites").start()

  const checks = [
    {
      name: "Node.js",
      command: "node --version",
      minVersion: MIN_NODE_VERSION,
      check: (version) => {
        const match = version.match(/v?(\d+)\.(\d+)\.(\d+)/)
        if (!match) return false
        const [major, minor] = [parseInt(match[1]), parseInt(match[2])]
        return major > 20 || (major === 20 && minor >= 0)
      },
    },
    {
      name: "Yarn",
      command: "yarn --version",
      minVersion: MIN_YARN_VERSION,
      check: (version) => {
        const match = version.match(/(\d+)\.(\d+)\.(\d+))/)
        if (!match) return false
        const major = parseInt(match[1])
        return major >= 4
      },
    },
  ]

  let allPassed = true
  const results = []

  for (const check of checks) {
    try {
      const output = execSync(check.command, { encoding: "utf8", stdio: "pipe" }).trim()
      const version = output.split("\n")[0]
      const passed = check.check(version)
      results.push({ name: check.name, version, passed, minVersion: check.minVersion })
      if (!passed) allPassed = false
    } catch (error) {
      results.push({ name: check.name, version: null, passed: false, minVersion: check.minVersion })
      allPassed = false
    }
  }

  spinner.stop()

  // Display results with colors
  console.log("\n" + chalk.bold.cyan("🔍 Prerequisites Check\n"))
  for (const result of results) {
    if (result.passed) {
      console.log(chalk.green(`   ✅ ${result.name}: ${chalk.dim(result.version)}`))
    } else {
      const installLink = result.name === "Node.js" ? "https://nodejs.org/" : "npm install -g yarn"
      console.log(chalk.red(`   ❌ ${result.name}: ${result.version || "Not found"} ${chalk.dim(`(requires ${result.minVersion}+)`)}`))
      console.log(chalk.dim(`      Install: ${installLink}`))
    }
  }

  if (!allPassed) {
    console.log(chalk.red("\n❌ Prerequisites check failed. Please install required tools and try again."))
    console.log(chalk.dim("   Or run with --skip-prereqs to continue anyway.\n"))
    if (!isNonInteractive) {
      process.exit(1)
    }
  } else {
    console.log("")
  }

  return allPassed
}

// ========================================
// BACKUP FUNCTIONALITY
// ========================================
const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

const backupFile = (filePath, skipBackup = false) => {
  if (skipBackup || process.argv.includes("--skip-backup")) {
    return null
  }

  if (!fs.existsSync(filePath)) {
    return null
  }

  try {
    ensureBackupDir()
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const fileName = path.basename(filePath)
    const backupPath = path.join(BACKUP_DIR, `${fileName}.${timestamp}.backup`)

    fs.copyFileSync(filePath, backupPath)
    return backupPath
  } catch (error) {
    console.warn(`   ⚠️  Could not create backup for ${filePath}: ${error.message}`)
    return null
  }
}

// ========================================
// PROGRESS INDICATORS
// ========================================
const createSpinner = (message) => {
  if (isNonInteractive) {
    process.stdout.write(`${message}... `)
    return (success = true) => {
      process.stdout.write(`${success ? "✅" : "❌"}\n`)
    }
  }

  const spinner = ora(message).start()
  return (success = true) => {
    if (success) {
      spinner.succeed(message)
    } else {
      spinner.fail(message)
    }
  }
}

// ========================================
// ERROR HANDLING
// ========================================
const handleError = (error, context = {}) => {
  const errorMessages = {
    ENOENT: `File not found: ${context.file || "unknown"}. Make sure you're running from the project root.`,
    EACCES: `Permission denied: ${context.file || "unknown"}. Check file permissions.`,
    JSON: `Invalid JSON in ${context.file || "unknown"}. Please check the file format.`,
  }

  const code = error.code || error.name
  const message = errorMessages[code] || error.message || "Unknown error occurred"

  console.error(chalk.red(`\n❌ Error in ${context.step || "setup"}: ${message}`))
  if (context.suggestion) {
    console.error(chalk.yellow(`💡 Suggestion: ${context.suggestion}`))
  }
  if (error.stack && process.env.DEBUG) {
    console.error(chalk.dim("\nStack trace:"), error.stack)
  }
}

// ========================================
// ENV FILE HANDLING (WITH COMMENTS)
// ========================================
const loadEnvFileWithComments = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return { vars: {}, comments: [], lines: [] }
  }

  const content = fs.readFileSync(filePath, "utf8")
  const lines = content.split(/\r?\n/)
  const vars = {}
  const comments = []

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (trimmed.startsWith("#")) {
      comments.push({ line: index, content: trimmed })
    } else if (trimmed && trimmed.includes("=")) {
      const delimiterIndex = trimmed.indexOf("=")
      const key = trimmed.slice(0, delimiterIndex).trim()
      const value = trimmed.slice(delimiterIndex + 1).trim()
      if (key) {
        vars[key] = value
      }
    }
  })

  return { vars, comments, lines, originalContent: content }
}

const writeEnvFileWithComments = (filePath, values, originalData = null) => {
  const lines = originalData?.lines || []
  const newLines = []

  // Track which keys we've written
  const writtenKeys = new Set()

  // First, preserve existing structure and comments
  if (originalData) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      if (trimmed.startsWith("#")) {
        // Preserve comments
        newLines.push(line)
      } else if (trimmed.includes("=")) {
        const key = trimmed.slice(0, trimmed.indexOf("=")).trim()
        if (values[key] !== undefined) {
          // Update existing value
          newLines.push(`${key}=${values[key]}`)
          writtenKeys.add(key)
        } else {
          // Keep existing line if not in new values
          newLines.push(line)
        }
      } else if (trimmed === "") {
        // Preserve empty lines
        newLines.push("")
      }
    }
  }

  // Add new keys that weren't in the original file
  for (const [key, value] of Object.entries(values)) {
    if (!writtenKeys.has(key)) {
      newLines.push(`${key}=${value}`)
    }
  }

  const content = newLines.join("\n")
  fs.writeFileSync(filePath, content ? `${content}\n` : "")
}

// Legacy function for backward compatibility
const loadEnvFile = (filePath) => {
  return loadEnvFileWithComments(filePath).vars
}

const writeEnvFile = (filePath, values) => {
  const originalData = loadEnvFileWithComments(filePath)
  writeEnvFileWithComments(filePath, values, originalData)
}

// ========================================
// INPUT HELPERS (Using Inquirer)
// ========================================
const askQuestion = async (question, validator, defaultValue, isSecret = false) => {
  if (isNonInteractive) {
    // In non-interactive mode, try to get from env or use default
    const envKey = question.toUpperCase().replace(/[^A-Z0-9]/g, "_")
    const envValue = process.env[envKey] || defaultValue || ""
    if (validator && !validator(envValue)) {
      throw new Error(`Invalid value for ${question} from environment`)
    }
    return envValue
  }

  const message = defaultValue ? `${question} ${chalk.dim(`(default: ${defaultValue})`)}` : question

  const answer = await inquirer.prompt([
    {
      type: isSecret ? "password" : "input",
      name: "value",
      message,
      default: defaultValue,
      validate: (input) => {
        const value = input.trim() || defaultValue || ""
        if (validator && !validator(value)) {
          return chalk.red("❌ Invalid input. Please try again.")
        }
        return true
      },
    },
  ])

  return answer.value.trim() || defaultValue || ""
}

const askYesNo = async (question, defaultValue = true) => {
  if (isNonInteractive) {
    const envKey = question.toUpperCase().replace(/[^A-Z0-9]/g, "_")
    const envValue = process.env[envKey]
    if (envValue) {
      return envValue.toLowerCase() === "y" || envValue.toLowerCase() === "yes" || envValue === "true"
    }
    return defaultValue
  }

  const answer = await inquirer.prompt([
    {
      type: "confirm",
      name: "value",
      message: question,
      default: defaultValue,
    },
  ])

  return answer.value
}

const askChoice = async (question, options, defaultValue) => {
  if (isNonInteractive) {
    return defaultValue || options[0]?.value
  }

  const defaultIndex =
    defaultValue != null ? options.findIndex((option) => option.value === defaultValue) : 0

  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "value",
      message: question,
      choices: options.map((opt) => ({
        name: opt.label,
        value: opt.value,
      })),
      default: defaultIndex >= 0 ? options[defaultIndex].value : undefined,
    },
  ])

  return answer.value
}

// ========================================
// VALIDATORS (IMPROVED)
// ========================================
const validateBundleId = (bundleId) => /^[a-zA-Z0-9-.]+$/.test(bundleId)
const validateScheme = (scheme) => /^[a-z0-9]+$/.test(scheme)
const validateUrl = (url) => {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:"
  } catch {
    return false
  }
}
const validateNotEmpty = (value) => value.length > 0
const validateSupabaseKey = (key) => {
  if (!key) return false
  // New format: sb_publishable_...
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true
  // Legacy JWT format: eyJ...
  if (/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return true
  // Fallback: at least 20 characters
  return key.length >= 20
}
const validatePostHogKey = (key) => {
  if (!key) return false
  // PostHog keys are typically 32+ character alphanumeric strings
  return /^[A-Za-z0-9_-]{20,}$/.test(key)
}
const validateSentryDSN = (dsn) => {
  if (!dsn) return false
  // Sentry DSN format: https://[key]@[host]/[project-id]
  return /^https:\/\/[A-Za-z0-9]+@[A-Za-z0-9.-]+\/[0-9]+$/.test(dsn)
}

// ========================================
// SECURITY WARNINGS
// ========================================
const checkGitIgnore = (filePath) => {
  const gitignorePath = path.join(__dirname, ".gitignore")
  if (!fs.existsSync(gitignorePath)) {
    return false
  }

  const gitignore = fs.readFileSync(gitignorePath, "utf8")
  const relativePath = path.relative(__dirname, filePath)
  return gitignore.includes(relativePath) || gitignore.includes(path.basename(filePath))
}

const warnAboutEnvSecurity = (envPath) => {
  if (isNonInteractive) return

  console.log(chalk.yellow("\n🔒 Security Reminder:"))
  console.log(chalk.dim("   • EXPO_PUBLIC_* variables are BUNDLED into your app and visible to users"))
  console.log(chalk.dim("   • Never commit .env files to version control"))
  console.log(chalk.dim("   • Use Row Level Security (RLS) in Supabase to protect data"))

  if (!checkGitIgnore(envPath)) {
    console.warn(chalk.yellow(`\n   ⚠️  Warning: ${path.basename(envPath)} may not be in .gitignore`))
    console.warn(chalk.yellow("   Make sure to add it to prevent committing secrets!"))
  }
}

// ========================================
// SERVICE VALIDATION
// ========================================
const validateSupabaseConnection = async (url, key) => {
  try {
    const stopSpinner = createSpinner("Testing Supabase connection")
    // Use https module instead of fetch (Node.js built-in)
    const https = require("https")
    const urlObj = new URL(url)
    
    return new Promise((resolve) => {
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: "/rest/v1/",
        method: "GET",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        timeout: 5000,
      }

      const req = https.request(options, (res) => {
        stopSpinner(res.statusCode >= 200 && res.statusCode < 300)
        resolve(res.statusCode >= 200 && res.statusCode < 300)
      })

      req.on("error", () => {
        stopSpinner(false)
        resolve(false)
      })

      req.on("timeout", () => {
        req.destroy()
        stopSpinner(false)
        resolve(false)
      })

      req.end()
    })
  } catch (error) {
    return false
  }
}

// ========================================
// UTILITY HELPERS
// ========================================
const repeatLine = (char = "━") => char.repeat(70)
const printSection = (title, descriptionLines = []) => {
  console.log("")
  const boxContent = [
    chalk.bold.cyan(title),
    ...(descriptionLines.length > 0 ? ["", ...descriptionLines.map((line) => chalk.dim(line))] : []),
  ].join("\n")
  console.log(boxen(boxContent, { padding: 1, borderColor: "cyan", borderStyle: "round" }))
  console.log("")
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
    console.warn(chalk.yellow("⚠️ Could not read existing app.json for defaults:"), error.message)
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
  widgets: "Native Widgets",
}

const getServiceStatus = (services) => ({
  supabase: Boolean(
    services.EXPO_PUBLIC_SUPABASE_URL || services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
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
  widgets: Boolean(services.EXPO_PUBLIC_ENABLE_WIDGETS === "true"),
})

const formatServiceList = (status, target = true) =>
  Object.entries(status)
    .filter(([, isConfigured]) => isConfigured === target)
    .map(([key]) => serviceLabels[key])
    .filter(Boolean)

// ========================================
// CONFIGURATION SUMMARY
// ========================================
const generateSetupSummary = (config, services, metadataConfigured, servicesConfigured) => {
  const summary = {
    timestamp: new Date().toISOString(),
    version: require("./package.json").version,
    metadata: {
      displayName: config.displayName,
      projectName: config.projectName,
      bundleId: config.bundleId,
      scheme: config.scheme,
      configured: metadataConfigured,
    },
    services: {
      configured: Object.keys(services).filter((k) => services[k]),
      total: Object.keys(getServiceStatus(services)).length,
      count: servicesConfigured,
    },
    filesModified: [],
  }

  const summaryPath = path.join(__dirname, ".setup-summary.json")
  try {
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
    return summaryPath
  } catch (error) {
    console.warn(`⚠️  Could not write setup summary: ${error.message}`)
    return null
  }
}

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
  const defaultDisplayName = defaults.displayName || "My Shipnative App"
  config.displayName = await askQuestion("What is your app's display name? (shown to users)", validateNotEmpty, defaultDisplayName)

  console.log("\nℹ️  Project Name is a URL-safe slug used in build folders and links. Lowercase, numbers, and dashes only.")
  const derivedProjectName = config.displayName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  const defaultProjectName = defaults.projectName || derivedProjectName
  config.projectName = await askQuestion("What is your project name? (lowercase, no spaces)", (name) => /^[a-z0-9-]+$/.test(name), defaultProjectName)

  console.log("\nℹ️  Bundle Identifier uniquely identifies your app in the stores. Use a domain you control (e.g., com.yourcompany.app).")
  const defaultBundleId = defaults.bundleId || `com.shipnative.${config.projectName.replace(/-/g, "")}`
  config.bundleId = await askQuestion("What is your bundle identifier? (e.g., com.company.app)", validateBundleId, defaultBundleId)

  console.log("\nℹ️  App Scheme powers deep links and sign-in redirects. Keep it short, lowercase, and unique (e.g., shipnativeapp).")
  const defaultScheme = defaults.scheme || config.projectName.replace(/-/g, "")
  config.scheme = await askQuestion("What is your app scheme? (for deep linking, e.g., myapp)", validateScheme, defaultScheme)

  return true
}

const configureSupabase = async (services, defaults = {}, options = {}) => {
  printSection("🔹 SUPABASE (Backend & Auth)", [
    "Supabase provides database, authentication, and real-time features.",
    "Use your project URL and a publishable key (sb_publishable_...) that is safe to ship in mobile/desktop apps.",
    "Secret/Service Role keys must stay on servers only.",
    "Create a project at: https://supabase.com/dashboard/projects",
  ])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up Supabase now?", true))
  if (!shouldConfigure) return false

  services.EXPO_PUBLIC_SUPABASE_URL = await askQuestion("Enter your Supabase Project URL", validateUrl, defaults.EXPO_PUBLIC_SUPABASE_URL)
  services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = await askQuestion(
    "Enter your Supabase publishable key (starts with sb_publishable_... and safe to embed)",
    validateSupabaseKey,
    defaults.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    true // Secret input
  )

  // Optional validation
  if (process.argv.includes("--validate-services") && services.EXPO_PUBLIC_SUPABASE_URL && services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const isValid = await validateSupabaseConnection(services.EXPO_PUBLIC_SUPABASE_URL, services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    if (!isValid) {
      console.warn("   ⚠️  Could not validate Supabase connection. Please check your URL and key.")
    }
  }

  return true
}

const configureGoogleOAuth = async (services, defaults = {}, options = {}) => {
  printSection("🔹 GOOGLE OAUTH (Social Login)", ["Enable Google sign-in for your users.", "Setup at: https://console.cloud.google.com/apis/credentials"])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up Google OAuth?", false))
  if (!shouldConfigure) return false

  services.EXPO_PUBLIC_GOOGLE_CLIENT_ID = await askQuestion("Enter your Google OAuth Client ID", (id) => id.length > 10, defaults.EXPO_PUBLIC_GOOGLE_CLIENT_ID)
  services.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET = await askQuestion("Enter your Google OAuth Client Secret", (secret) => secret.length > 10, defaults.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET, true)

  return true
}

const configureAppleSignIn = async (services, defaults = {}, options = {}) => {
  printSection("🔹 APPLE SIGN-IN (Social Login)", ["Enable Apple sign-in for iOS users.", "Setup at: https://developer.apple.com/account/resources/identifiers/list"])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up Apple Sign-In?", false))
  if (!shouldConfigure) return false

  services.EXPO_PUBLIC_APPLE_SERVICES_ID = await askQuestion("Enter your Apple Services ID", (id) => id.includes("."), defaults.EXPO_PUBLIC_APPLE_SERVICES_ID)
  services.EXPO_PUBLIC_APPLE_TEAM_ID = await askQuestion("Enter your Apple Team ID (10 characters)", (id) => /^[A-Z0-9]{10}$/.test(id), defaults.EXPO_PUBLIC_APPLE_TEAM_ID)
  services.EXPO_PUBLIC_APPLE_PRIVATE_KEY = await askQuestion("Enter your Apple Private Key", (key) => key.startsWith("-----BEGIN PRIVATE KEY-----"), defaults.EXPO_PUBLIC_APPLE_PRIVATE_KEY, true)
  services.EXPO_PUBLIC_APPLE_KEY_ID = await askQuestion("Enter your Apple Key ID (10 characters)", (id) => /^[A-Z0-9]{10}$/.test(id), defaults.EXPO_PUBLIC_APPLE_KEY_ID)

  return true
}

const configurePostHog = async (services, defaults = {}, options = {}) => {
  printSection("🔹 POSTHOG (Analytics)", ["Track user behavior with analytics, session recording, and feature flags.", "Create a project at: https://us.posthog.com/project/settings"])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up PostHog?", false))
  if (!shouldConfigure) return false

  services.EXPO_PUBLIC_POSTHOG_API_KEY = await askQuestion("Enter your PostHog API Key", validatePostHogKey, defaults.EXPO_PUBLIC_POSTHOG_API_KEY, true)
  services.EXPO_PUBLIC_POSTHOG_HOST = await askQuestion("Enter your PostHog Host", validateUrl, defaults.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com")

  return true
}

const configureRevenueCat = async (services, defaults = {}, options = {}) => {
  printSection("🔹 REVENUECAT (In-App Purchases)", ["Implement subscriptions and in-app purchases across iOS, Android, and Web.", "Create a project at: https://app.revenuecat.com/"])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up RevenueCat?", false))
  if (!shouldConfigure) return false

  services.EXPO_PUBLIC_REVENUECAT_IOS_KEY = await askQuestion("Enter your RevenueCat iOS Public API Key (optional)", null, defaults.EXPO_PUBLIC_REVENUECAT_IOS_KEY, true)
  services.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = await askQuestion("Enter your RevenueCat Android Public API Key (optional)", null, defaults.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY, true)
  services.EXPO_PUBLIC_REVENUECAT_WEB_KEY = await askQuestion("Enter your RevenueCat Web Public API Key (optional, for Web Billing)", null, defaults.EXPO_PUBLIC_REVENUECAT_WEB_KEY, true)

  return true
}

const configureSentry = async (services, defaults = {}, options = {}) => {
  printSection("🔹 SENTRY (Error Tracking)", ["Track app crashes and performance issues.", "Create a project at: https://sentry.io/projects/new/"])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up Sentry?", false))
  if (!shouldConfigure) return false

  services.EXPO_PUBLIC_SENTRY_DSN = await askQuestion("Enter your Sentry DSN", validateSentryDSN, defaults.EXPO_PUBLIC_SENTRY_DSN)

  return true
}

const configureFCM = async (services, defaults = {}, options = {}) => {
  printSection("🔹 FIREBASE CLOUD MESSAGING (Push Notifications)", ["Enable push notifications for Android (iOS uses APNs automatically).", "Setup at: https://console.firebase.google.com/"])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up Firebase Cloud Messaging?", false))
  if (!shouldConfigure) return false

  services.EXPO_PUBLIC_FCM_SERVER_KEY = await askQuestion("Enter your Firebase Cloud Messaging Server Key", (key) => key.length > 20, defaults.EXPO_PUBLIC_FCM_SERVER_KEY, true)
  console.log("\n💡 Don't forget to download google-services.json for Android!")
  console.log("   Place it in: apps/app/android/app/google-services.json")

  return true
}

const configureWidgets = async (services, defaults = {}, options = {}) => {
  printSection("🔹 NATIVE WIDGETS (iOS & Android)", [
    "Enable native home screen widgets for iOS and Android.",
    "Widgets can display data from Supabase and update automatically.",
    "Requires native code generation (prebuild) after enabling.",
  ])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to enable native widgets?", false))
  if (!shouldConfigure) {
    if (services.EXPO_PUBLIC_ENABLE_WIDGETS === undefined) {
      // Don't set it if it's not in the env, let it default to false
    }
    return false
  }

  services.EXPO_PUBLIC_ENABLE_WIDGETS = "true"
  console.log("\n✅ Widgets enabled!")
  console.log("   💡 After setup, run 'yarn prebuild:clean' to generate native code")
  console.log("   📖 See docs/WIDGETS.md for widget development guide")

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
  { key: "widgets", label: "Native Widgets (iOS & Android)", handler: configureWidgets },
]

const configureServicesSequentially = async (services, defaults, options = {}) => {
  let configuredCount = 0
  let skipRemaining = false

  for (let i = 0; i < servicesCatalog.length; i++) {
    if (skipRemaining) break

    const service = servicesCatalog[i]
    const configured = await service.handler(services, defaults, options)
    if (configured) configuredCount += 1

    // Ask about skipping remaining services after each service (except the last one)
    if (!isNonInteractive && i < servicesCatalog.length - 1 && !skipRemaining) {
      const remaining = servicesCatalog.length - i - 1
      const skipAll = await askYesNo(`\nSkip remaining ${remaining} service(s)?`, false)
      if (skipAll) {
        skipRemaining = true
        break
      }
    }
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

const configureMarketingPage = async (marketingEnv = {}) => {
  printSection("🌐 MARKETING PAGE (apps/web)", [
    "Configure the marketing site mode and Supabase Edge Function endpoint for the waitlist form.",
    "Updates apps/web/.env so `yarn web` and deployments pick up the right values.",
    "",
    "Note: Resend API key is now stored securely in Supabase Edge Function secrets, not in the frontend.",
  ])

  const shouldConfigure = await askYesNo("Do you want to configure the marketing page now?", true)
  if (!shouldConfigure) return { updated: false, env: marketingEnv, requested: false }

  const currentMode = marketingEnv.VITE_MODE || "waitlist"
  const selectedMode = await askChoice(
    "Choose marketing page mode",
    [
      { value: "waitlist", label: "Waitlist (collect emails before launch)" },
      { value: "launch", label: "Launch (promote your live app)" },
    ],
    currentMode
  )

  const currentEndpoint = marketingEnv.VITE_WAITLIST_API_ENDPOINT || ""
  const endpointInput = await askQuestion("Supabase Edge Function endpoint for waitlist (e.g., https://your-project.supabase.co/functions/v1/waitlist)", null, currentEndpoint)
  const resolvedEndpoint = endpointInput || currentEndpoint

  const updatedEnv = { ...marketingEnv, VITE_MODE: selectedMode }
  if (resolvedEndpoint) {
    updatedEnv.VITE_WAITLIST_API_ENDPOINT = resolvedEndpoint
  } else {
    delete updatedEnv.VITE_WAITLIST_API_ENDPOINT
  }

  // Remove RESEND_API_KEY if it exists (no longer used in frontend)
  delete updatedEnv.RESEND_API_KEY

  const updated = selectedMode !== currentMode || resolvedEndpoint !== currentEndpoint

  return { updated, env: updatedEnv, requested: true }
}

// ========================================
// MAIN SETUP
// ========================================
async function setup() {
  try {
    // Check prerequisites
    await checkPrerequisites()

    // Welcome banner
    const welcomeBanner = boxen(
      chalk.bold.cyan("🚀 Shipnative Setup") +
        "\n\n" +
        chalk.dim("Choose how you want to configure your project.") +
        "\n" +
        chalk.dim("You can run the full wizard, or jump straight into individual services."),
      {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "round",
        title: "Welcome",
        titleAlignment: "center",
      }
    )
    console.log("\n" + welcomeBanner + "\n")

    const appEnvPath = path.join(__dirname, "apps/app/.env")
    const existingAppEnvData = loadEnvFileWithComments(appEnvPath)
    const existingAppEnv = existingAppEnvData.vars
    const marketingEnvPath = path.join(__dirname, "apps/web/.env")
    const marketingEnvExists = fs.existsSync(marketingEnvPath)
    const marketingEnvData = loadEnvFileWithComments(marketingEnvPath)
    const marketingEnv = marketingEnvData.vars
    const metadataDefaults = getMetadataDefaults()
    const config = {}
    const services = { ...existingAppEnv }

    // Migrate legacy anon key input to publishable key and drop the old variable name
    if (services.EXPO_PUBLIC_SUPABASE_ANON_KEY && !services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = services.EXPO_PUBLIC_SUPABASE_ANON_KEY
    }
    delete services.EXPO_PUBLIC_SUPABASE_ANON_KEY
    const serviceDefaults = { ...services }

    const isDryRun = process.argv.includes("--dry-run")
    if (isDryRun) {
      console.log("🔍 DRY RUN MODE: No changes will be applied\n")
    }

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
      console.log(chalk.dim("\n👋 No changes made. Run `yarn setup` again when you're ready.\n"))
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

    const { env: updatedMarketingEnv, updated: marketingUpdated, requested: marketingRequested } = await configureMarketingPage(marketingEnv)

    // ========================================
    // APPLY CHANGES
    // ========================================
    if (!isDryRun) {
      printSection("💾 APPLYING CONFIGURATION")

      const appJsonPath = path.join(__dirname, "apps/app/app.json")
      const appPackageJsonPath = path.join(__dirname, "apps/app/package.json")

      if (metadataConfigured) {
        console.log("\n📝 Updating app.json...")
        if (fs.existsSync(appJsonPath)) {
          const backupPath = backupFile(appJsonPath)
          if (backupPath) {
            console.log(`   💾 Backup created: ${path.relative(__dirname, backupPath)}`)
          }

          try {
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
          } catch (error) {
            handleError(error, {
              step: "updating app.json",
              file: appJsonPath,
              suggestion: "Check that app.json is valid JSON",
            })
          }
        } else {
          console.log("   ⚠️ app.json not found at apps/app/app.json - skipping metadata update")
        }

        if (fs.existsSync(appPackageJsonPath)) {
          console.log("\n📝 Updating apps/app/package.json...")
          const backupPath = backupFile(appPackageJsonPath)
          if (backupPath) {
            console.log(`   💾 Backup created: ${path.relative(__dirname, backupPath)}`)
          }

          try {
            const packageJson = JSON.parse(fs.readFileSync(appPackageJsonPath, "utf8"))
            packageJson.name = config.projectName
            fs.writeFileSync(appPackageJsonPath, JSON.stringify(packageJson, null, 2))
            console.log("   ✅ apps/app/package.json updated")
          } catch (error) {
            handleError(error, {
              step: "updating package.json",
              file: appPackageJsonPath,
              suggestion: "Check that package.json is valid JSON",
            })
          }
        } else {
          console.log("   ⚠️ package.json not found at apps/app/package.json - skipping package update")
        }
      } else {
        console.log("\nℹ️ Skipping app metadata updates (not selected in this run)")
      }

      if (servicesConfigured > 0 || Object.keys(services).length > 0) {
        console.log("\n📝 Updating .env with service settings...")
        const backupPath = backupFile(appEnvPath)
        if (backupPath) {
          console.log(`   💾 Backup created: ${path.relative(__dirname, backupPath)}`)
        }

        writeEnvFile(appEnvPath, services)
        console.log(`   ✅ .env file updated at apps/app/.env (${Object.keys(services).length} entries)`)

        // Security warning
        warnAboutEnvSecurity(appEnvPath)
      } else if (Object.keys(existingAppEnv).length > 0) {
        console.log("\nℹ️ No service changes captured - leaving existing apps/app/.env untouched")
      } else {
        console.log("\n💡 No services configured - app will run in MOCK mode")
      }

      if (marketingRequested) {
        if (marketingUpdated || !marketingEnvExists) {
          const backupPath = backupFile(marketingEnvPath)
          if (backupPath) {
            console.log(`   💾 Backup created: ${path.relative(__dirname, backupPath)}`)
          }

          writeEnvFile(marketingEnvPath, updatedMarketingEnv)
          console.log(`\n📝 Marketing page env updated at apps/web/.env (${Object.keys(updatedMarketingEnv).length} entries)`)
        } else {
          console.log("\nℹ️ Marketing page env unchanged (already up to date)")
        }
      } else {
        console.log("\nℹ️ Skipping marketing page env configuration (not selected this run)")
      }

      // Generate setup summary
      const summaryPath = generateSetupSummary(config, services, metadataConfigured, servicesConfigured)
      if (summaryPath) {
        console.log(`\n📋 Setup summary saved to: ${path.relative(__dirname, summaryPath)}`)
      }
    } else {
      console.log("\n🔍 DRY RUN - Preview of changes:")
      console.log("\n📝 Would update app.json with:")
      console.log(`   • Display Name: ${config.displayName || "(unchanged)"}`)
      console.log(`   • Project Name: ${config.projectName || "(unchanged)"}`)
      console.log(`   • Bundle ID: ${config.bundleId || "(unchanged)"}`)
      console.log(`   • Scheme: ${config.scheme || "(unchanged)"}`)
      console.log("\n📝 Would update .env with:")
      console.log(`   • ${Object.keys(services).length} environment variables`)
      Object.entries(services).forEach(([key, value]) => {
        const isSecretKey = key.toLowerCase().includes("key") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("password")
        const masked = isSecretKey ? "***" : value
        console.log(`   • ${key}=${masked}`)
      })
      console.log("\n💡 Run without --dry-run to apply these changes")
    }

    // Offer to install dependencies only when configuration was performed
    const shouldOfferInstall = (metadataConfigured || servicesConfigured > 0) && !isDryRun
    if (shouldOfferInstall) {
      printSection("📦 DEPENDENCIES")
      const shouldInstall = await askYesNo("\nDo you want to install dependencies now? (yarn install)", true)
      if (shouldInstall) {
        const stopSpinner = createSpinner("Installing dependencies (this may take a few minutes)")
        try {
          execSync("yarn install", { stdio: "inherit" })
          stopSpinner(true)
        } catch (error) {
          stopSpinner(false)
          console.error("   ❌ Failed to install dependencies")
          console.error("   Please run 'yarn install' manually")
        }
      }
    } else if (!isDryRun) {
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
      displayName: config.displayName || metadataDefaults.displayName || "My Shipnative App",
      bundleId: config.bundleId || metadataDefaults.bundleId || "com.shipnative.app",
      scheme: config.scheme || metadataDefaults.scheme || "shipnativeapp",
      projectName: config.projectName || metadataDefaults.projectName || "shipnative-app",
    }

    // Completion banner
    const completionBanner = boxen(
      chalk.bold.green("🎉 SETUP COMPLETE!") +
        "\n\n" +
        chalk.dim("Your Shipnative project is ready to go."),
      {
        padding: 1,
        borderColor: "green",
        borderStyle: "round",
        title: "Success",
        titleAlignment: "center",
      }
    )
    console.log("\n" + completionBanner + "\n")

    console.log(chalk.bold("📚 Important Documentation Files:\n"))
    console.log(chalk.cyan("📖 Getting Started:"))
    console.log(chalk.dim("   • README.md - Main documentation and quick start"))
    console.log(chalk.dim("   • apps/app/vibe/CONTEXT.md - App architecture"))
    console.log(chalk.dim("   • apps/app/vibe/TECH_STACK.md - Technologies used"))
    console.log(chalk.dim("   • apps/app/vibe/STYLE_GUIDE.md - Code patterns"))

    console.log(chalk.cyan("\n🔧 Setup & Integration:"))
    console.log(chalk.dim("   • docs/SUPABASE.md - Auth and database"))
    console.log(chalk.dim("   • docs/MONETIZATION.md - Payments (RevenueCat for iOS, Android & Web)"))
    console.log(chalk.dim("   • docs/ANALYTICS.md - PostHog and Sentry"))
    console.log(chalk.dim("   • docs/NOTIFICATIONS.md - Push notifications"))
    console.log(chalk.dim("   • docs/DESIGN_SYSTEM.md - UI components"))

    console.log(chalk.cyan("\n🚀 Deployment:"))
    console.log(chalk.dim("   • docs/DEPLOYMENT.md - iOS, Android, Web deployment"))
    console.log(chalk.dim("   • docs/TROUBLESHOOTING.md - Common issues"))

    console.log(chalk.bold("\n🔗 Your Configuration:"))
    console.log(
      `   • Display Name: ${chalk.green(effectiveConfig.displayName)}${metadataConfigured ? "" : chalk.dim(" (unchanged)")}`
    )
    console.log(
      `   • Bundle ID: ${chalk.green(effectiveConfig.bundleId)}${metadataConfigured ? "" : chalk.dim(" (unchanged)")}`
    )
    console.log(
      `   • URL Scheme: ${chalk.green(effectiveConfig.scheme + "://")}${metadataConfigured ? "" : chalk.dim(" (unchanged)")}`
    )
    console.log(
      `   • Services configured: ${chalk.green(`${configuredServices.length} / ${totalServices}`)}${configuredServices.length ? chalk.dim(` (${configuredServices.join(", ")})`) : chalk.dim(" (all in mock mode)")}`
    )
    if (mockServices.length) {
      console.log(chalk.yellow(`   • Mock mode: ${mockServices.join(", ")}`))
    }
    if (marketingRequested) {
      console.log(chalk.cyan("\n🌐 Marketing page:"))
      console.log(`   • Mode: ${chalk.green(updatedMarketingEnv.VITE_MODE || "waitlist")}`)
      console.log(
        `   • Waitlist endpoint: ${updatedMarketingEnv.VITE_WAITLIST_API_ENDPOINT ? chalk.green("configured") : chalk.dim("not set")}`
      )
    }

    console.log(chalk.bold("\n💡 Next Steps:"))
    console.log(chalk.dim("   1. cd apps/app"))
    console.log(chalk.dim("   2. yarn ios  (or yarn android)"))
    console.log(chalk.dim("   3. Check the Dev Dashboard in the app"))
    console.log(chalk.dim("   4. Read docs/SUPABASE.md to set up your database"))
    console.log(chalk.dim("   5. Read docs/MONETIZATION.md to configure subscriptions (RevenueCat)"))

    console.log(chalk.bold("\n🤖 AI-Assisted Development:"))
    console.log(chalk.dim('   Use this prompt in Cursor/Claude:'))
    console.log(chalk.dim('   "I am ready to vibe. Read the .cursorrules and the vibe/ folder.'))
    console.log(chalk.dim('   I want to build a [Description of App]. Start by outlining'))
    console.log(chalk.dim('   the database schema changes I need."'))

    console.log(chalk.bold("\n🔗 Test Deep Linking:"))
    console.log(chalk.dim(`   xcrun simctl openurl booted "${effectiveConfig.scheme}://profile"`))

    console.log(chalk.green.bold("\n" + repeatLine("=")))
    console.log(chalk.green.bold("Happy coding! 🚀"))
    console.log(chalk.green.bold(repeatLine("=") + "\n"))

    process.exit(0)
  } catch (error) {
    handleError(error, { step: "setup" })
    process.exit(1)
  }
}

// Run setup
setup().catch((error) => {
  handleError(error, { step: "setup" })
  process.exit(1)
})
