#!/usr/bin/env node

import fs from "fs"
import path from "path"
import https from "https"
import { execSync } from "child_process"
import inquirer from "inquirer"
import ora from "ora"
import chalk from "chalk"
import boxen from "boxen"

type EnvVars = Record<string, string>
type EnvFileComment = { line: number; content: string }
type EnvFileData = { vars: EnvVars; comments: EnvFileComment[]; lines: string[]; originalContent?: string }
type PrerequisiteCheck = {
  name: string
  command: string
  minVersion: string
  check: (version: string) => boolean
}
type SetupOptions = { skipConfirm?: boolean }
type MetadataConfig = {
  displayName: string
  projectName: string
  bundleId: string
  scheme: string
}

// ========================================
// CONSTANTS
// ========================================
const MIN_NODE_VERSION = "20.0.0"
const MIN_YARN_VERSION = "4.0.0"
const BACKUP_DIR = path.join(__dirname, ".setup-backups")

// ========================================
// VERSION HELPERS
// ========================================
const parseSemver = (value: string): [number, number, number] | null => {
  const match = value.match(/v?(\d+)\.(\d+)\.(\d+)/)
  if (!match) return null
  return [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10), Number.parseInt(match[3], 10)]
}

const isVersionAtLeast = (value: string, minimum: string): boolean => {
  const current = parseSemver(value)
  const target = parseSemver(minimum)
  if (!current || !target) return false
  for (let i = 0; i < 3; i += 1) {
    if (current[i] > target[i]) return true
    if (current[i] < target[i]) return false
  }
  return true
}

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
const checkPrerequisites = async (skipCheck = false): Promise<boolean> => {
  if (skipCheck || process.argv.includes("--skip-prereqs")) {
    return true
  }

  const spinner = ora("Checking prerequisites").start()

  const checks: PrerequisiteCheck[] = [
    {
      name: "Node.js",
      command: "node --version",
      minVersion: MIN_NODE_VERSION,
      check: (version) => isVersionAtLeast(version, MIN_NODE_VERSION),
    },
    {
      name: "Yarn",
      command: "yarn --version",
      minVersion: MIN_YARN_VERSION,
      check: (version) => isVersionAtLeast(version, MIN_YARN_VERSION),
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
const ensureBackupDir = (): void => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

const backupFile = (filePath: string, skipBackup = false): string | null => {
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
const createSpinner = (message: string): ((success?: boolean) => void) => {
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
const handleError = (
  error: { code?: string; name?: string; message?: string; stack?: string },
  context: { file?: string; step?: string; suggestion?: string } = {}
) => {
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
const loadEnvFileWithComments = (filePath: string): EnvFileData => {
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

const writeEnvFileWithComments = (filePath: string, values: EnvVars, originalData: EnvFileData | null = null) => {
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
const loadEnvFile = (filePath: string): EnvVars => {
  return loadEnvFileWithComments(filePath).vars
}

const writeEnvFile = (filePath: string, values: EnvVars) => {
  const originalData = loadEnvFileWithComments(filePath)
  writeEnvFileWithComments(filePath, values, originalData)
}

// ========================================
// INPUT HELPERS (Using Inquirer)
// ========================================
const askQuestion = async (
  question: string,
  validator?: (value: string) => boolean,
  defaultValue?: string,
  isSecret = false
): Promise<string> => {
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
          // Provide helpful error messages based on the question
          if (message.toLowerCase().includes("bundle identifier")) {
            return chalk.red("❌ Bundle identifier must be in format: com.company.appname (lowercase, dots, no spaces)")
          }
          if (message.toLowerCase().includes("scheme")) {
            return chalk.red("❌ App scheme must be lowercase letters/numbers only (no spaces or special characters)")
          }
          if (message.toLowerCase().includes("project name")) {
            return chalk.red("❌ Project name must be lowercase, numbers, and dashes only (e.g., my-awesome-app)")
          }
          if (message.toLowerCase().includes("url")) {
            return chalk.red("❌ Please enter a valid URL starting with https://")
          }
          return chalk.red("❌ Invalid input. Please check the format and try again.")
        }
        return true
      },
    },
  ])

  return answer.value.trim() || defaultValue || ""
}

const askYesNo = async (question: string, defaultValue = true): Promise<boolean> => {
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

const askChoice = async (
  question: string,
  options: Array<{ value: string; label: string }>,
  defaultValue?: string
): Promise<string> => {
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
const validateBundleId = (bundleId: string) => /^[a-zA-Z0-9-.]+$/.test(bundleId)
const validateScheme = (scheme: string) => /^[a-z0-9]+$/.test(scheme)
const validateUrl = (url: string) => {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:"
  } catch {
    return false
  }
}
const validateNotEmpty = (value: string) => value.length > 0
const validateSupabaseKey = (key: string) => {
  if (!key) return false
  // New format: sb_publishable_...
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true
  // Legacy JWT format: eyJ...
  if (/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return true
  // Fallback: at least 20 characters
  return key.length >= 20
}
const validatePostHogKey = (key: string) => {
  if (!key) return false
  // PostHog keys are typically 32+ character alphanumeric strings
  return /^[A-Za-z0-9_-]{20,}$/.test(key)
}
const validateSentryDSN = (dsn: string) => {
  if (!dsn) return false
  // Sentry DSN format: https://[key]@[host]/[project-id]
  return /^https:\/\/[A-Za-z0-9]+@[A-Za-z0-9.-]+\/[0-9]+$/.test(dsn)
}

// ========================================
// SECURITY WARNINGS
// ========================================
const checkGitIgnore = (filePath: string) => {
  const gitignorePath = path.join(__dirname, ".gitignore")
  if (!fs.existsSync(gitignorePath)) {
    return false
  }

  const gitignore = fs.readFileSync(gitignorePath, "utf8")
  const relativePath = path.relative(__dirname, filePath)
  return gitignore.includes(relativePath) || gitignore.includes(path.basename(filePath))
}

const warnAboutEnvSecurity = (envPath: string) => {
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
const validateSupabaseConnection = async (url: string, key: string): Promise<boolean> => {
  try {
    const stopSpinner = createSpinner("Testing Supabase connection")
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
const repeatLine = (char = "━"): string => char.repeat(70)
const printSection = (title: string, descriptionLines: string[] = []) => {
  console.log("")
  const boxContent = [
    chalk.bold.cyan(title),
    ...(descriptionLines.length > 0 ? ["", ...descriptionLines.map((line) => chalk.dim(line))] : []),
  ].join("\n")
  console.log(boxen(boxContent, { padding: 1, borderColor: "cyan", borderStyle: "round" }))
  console.log("")
}

const getMetadataDefaults = (): Partial<MetadataConfig> => {
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
  appEnv: "App Environment & Links",
  supabase: "Supabase",
  google: "Google OAuth",
  apple: "Apple Sign-In",
  posthog: "PostHog",
  revenuecat: "RevenueCat",
  sentry: "Sentry",
  fcm: "Firebase Cloud Messaging",
  widgets: "Native Widgets",
} as const

type ServiceKey = keyof typeof serviceLabels
type ServiceStatus = Record<ServiceKey, boolean>
type ServiceCatalogEntry = {
  key: ServiceKey
  label: string
  handler: (services: EnvVars, defaults: Partial<EnvVars>, options?: SetupOptions) => Promise<boolean>
}

const getServiceStatus = (services: EnvVars): ServiceStatus => ({
  appEnv: Boolean(
    services.EXPO_PUBLIC_APP_ENV ||
      services.EXPO_PUBLIC_EMAIL_REDIRECT_URL ||
      services.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL ||
      services.EXPO_PUBLIC_USE_MOCK_NOTIFICATIONS
  ),
  supabase: Boolean(
    services.EXPO_PUBLIC_SUPABASE_URL || services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ),
  google: Boolean(services.EXPO_PUBLIC_GOOGLE_CLIENT_ID || services.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
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

const formatServiceList = (status: ServiceStatus, target = true): string[] =>
  Object.entries(status)
    .filter(([, isConfigured]) => isConfigured === target)
    .map(([key]) => serviceLabels[key])
    .filter(Boolean)

// ========================================
// CONFIGURATION SUMMARY
// ========================================
const generateSetupSummary = (
  config: Partial<MetadataConfig>,
  services: EnvVars,
  metadataConfigured: boolean,
  servicesConfigured: number
): string | null => {
  const packageJsonPath = path.join(__dirname, "package.json")
  const version = fs.existsSync(packageJsonPath)
    ? (JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).version as string)
    : "unknown"

  const summary = {
    timestamp: new Date().toISOString(),
    version,
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
const configureMetadata = async (
  config: Partial<MetadataConfig>,
  defaults: Partial<MetadataConfig> = {}
): Promise<boolean> => {
  printSection("📱 PROJECT METADATA", [
    "Let's set up your app's basic information. Don't worry - you can change these later!",
    "",
    "💡 Tip: You can press Enter to use the suggested default values.",
  ])

  console.log(chalk.cyan("\n📱 App Display Name"))
  console.log(chalk.dim("   This is the name that appears under your app icon on users' phones."))
  console.log(chalk.dim("   Example: 'My Awesome App' or 'Fitness Tracker'"))
  const defaultDisplayName = defaults.displayName || "My Shipnative App"
  config.displayName = await askQuestion("What should your app be called? (shown to users)", validateNotEmpty, defaultDisplayName)

  console.log(chalk.cyan("\n📁 Project Name"))
  console.log(chalk.dim("   This is an internal name used for folders and files."))
  console.log(chalk.dim("   We'll create this automatically from your app name - just press Enter!"))
  const derivedProjectName = config.displayName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  const defaultProjectName = defaults.projectName || derivedProjectName
  config.projectName = await askQuestion("Project name (lowercase, no spaces) - press Enter to use suggested", (name) => {
    if (!name || name.trim() === "") return true // Allow empty to use default
    return /^[a-z0-9-]+$/.test(name)
  }, defaultProjectName)

  console.log(chalk.cyan("\n🆔 Bundle Identifier"))
  console.log(chalk.dim("   This is like a unique ID for your app in the App Store and Play Store."))
  console.log(chalk.dim("   Format: com.yourcompany.appname (like com.apple.music)"))
  console.log(chalk.dim("   💡 Don't have a company? Use com.yourname.appname"))
  const defaultBundleId = defaults.bundleId || `com.shipnative.${config.projectName.replace(/-/g, "")}`
  config.bundleId = await askQuestion("Bundle identifier (e.g., com.mycompany.myapp)", validateBundleId, defaultBundleId)

  console.log(chalk.cyan("\n🔗 App Scheme"))
  console.log(chalk.dim("   This lets your app open links like 'myapp://profile'"))
  console.log(chalk.dim("   We'll create this automatically - just press Enter!"))
  const defaultScheme = defaults.scheme || config.projectName.replace(/-/g, "")
  config.scheme = await askQuestion("App scheme (for opening links) - press Enter to use suggested", validateScheme, defaultScheme)

  return true
}

const configureSupabase = async (
  services: EnvVars,
  defaults: Partial<EnvVars> = {},
  options: SetupOptions = {}
): Promise<boolean> => {
  printSection("🔹 SUPABASE (Backend & Auth)", [
    "Supabase powers your app's database, user accounts, and real-time features.",
    "",
    "💡 Don't have a Supabase account yet?",
    "   1. Go to https://supabase.com and sign up (it's free!)",
    "   2. Create a new project",
    "   3. Copy your project URL and API key from Settings > API",
    "",
    "⏭️  You can skip this now and set it up later - your app will work in 'mock mode'.",
  ])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up Supabase now?", true))
  if (!shouldConfigure) {
    console.log(chalk.dim("\n   ✅ Skipped. Your app will use mock data. You can add Supabase later!"))
    return false
  }

  console.log(chalk.cyan("\n📍 Step 1: Project URL"))
  console.log(chalk.dim("   Find this in Supabase: Settings > API > Project URL"))
  console.log(chalk.dim("   Looks like: https://xxxxxxxxxxxxx.supabase.co"))
  services.EXPO_PUBLIC_SUPABASE_URL = await askQuestion("Enter your Supabase Project URL", validateUrl, defaults.EXPO_PUBLIC_SUPABASE_URL)

  console.log(chalk.cyan("\n🔑 Step 2: Publishable Key"))
  console.log(chalk.dim("   Find this in Supabase: Settings > API > API Keys"))
  console.log(chalk.dim("   • For new keys: API Keys tab → Publishable key section"))
  console.log(chalk.dim("   • For legacy keys: Legacy API Keys tab → anon key"))
  console.log(chalk.dim("   💡 New format: sb_publishable_xxx (recommended)"))
  console.log(chalk.dim("   💡 Legacy format: eyJ... (still works)"))
  console.log(chalk.dim("   ⚠️  Never use the 'service_role' key here - that's secret!"))
  services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = await askQuestion(
    "Enter your Supabase publishable key (safe to use in mobile apps)",
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

const configureAppEnvironment = async (
  services: EnvVars,
  defaults: Partial<EnvVars> = {},
  options: SetupOptions = {}
): Promise<boolean> => {
  printSection("🔹 APP ENVIRONMENT & LINKS", [
    "These settings control runtime behavior and where auth links send users.",
    "",
    "✅ Safe to include in EXPO_PUBLIC_ envs (they are not secrets).",
    "⏭️  You can skip this and keep the boilerplate defaults.",
  ])

  const shouldConfigure =
    options.skipConfirm || (await askYesNo("Do you want to configure app environment and link settings?", true))
  if (!shouldConfigure) {
    console.log(chalk.dim("\n   ✅ Skipped. Using current or default values."))
    return false
  }

  const appEnvDefault = defaults.EXPO_PUBLIC_APP_ENV || "development"
  const appEnvChoice = await askChoice("Choose your app environment", [
    { value: "development", label: "Development (local builds, fastest iteration)" },
    { value: "staging", label: "Staging (test environment before release)" },
    { value: "production", label: "Production (live app for users)" },
  ], appEnvDefault)
  services.EXPO_PUBLIC_APP_ENV = appEnvChoice

  console.log(chalk.cyan("\n📧 Email Confirmation Redirect URL"))
  console.log(chalk.dim("   Used in Supabase email confirmation links."))
  console.log(chalk.dim("   Mobile default: shipnative://verify-email"))
  services.EXPO_PUBLIC_EMAIL_REDIRECT_URL = await askQuestion(
    "Enter email confirmation redirect URL (press Enter to keep default)",
    null,
    defaults.EXPO_PUBLIC_EMAIL_REDIRECT_URL || "shipnative://verify-email"
  )

  console.log(chalk.cyan("\n🔐 Password Reset Redirect URL"))
  console.log(chalk.dim("   Used in Supabase password reset links."))
  console.log(chalk.dim("   Mobile default: shipnative://reset-password"))
  services.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL = await askQuestion(
    "Enter password reset redirect URL (press Enter to keep default)",
    null,
    defaults.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL || "shipnative://reset-password"
  )

  console.log(chalk.cyan("\n🔔 Mock Notifications"))
  console.log(chalk.dim("   Forces mock notifications (no OS permission prompts)."))
  console.log(chalk.dim("   Recommended for development or CI environments."))
  const useMockDefault =
    (defaults.EXPO_PUBLIC_USE_MOCK_NOTIFICATIONS || "false").toLowerCase() === "true"
  const useMock = await askYesNo("Force mock notifications?", useMockDefault)
  services.EXPO_PUBLIC_USE_MOCK_NOTIFICATIONS = useMock ? "true" : "false"

  return true
}

const configureGoogleOAuth = async (
  services: EnvVars,
  defaults: Partial<EnvVars> = {},
  options: SetupOptions = {}
): Promise<boolean> => {
  printSection("🔹 GOOGLE OAUTH (Social Login)", [
    "Let users sign in with their Google account (one-click login).",
    "",
    "💡 Setup guide:",
    "   1. Go to https://console.cloud.google.com/apis/credentials",
    "   2. Create OAuth client IDs for Web + iOS + Android",
    "   3. Add all client IDs in Supabase Auth → Providers → Google (web first)",
    "   4. Enable Skip Nonce Check if using the RN Google Sign-In SDK",
    "",
    "⏭️  You can skip this - users can still sign up with email.",
  ])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up Google sign-in?", false))
  if (!shouldConfigure) {
    console.log(chalk.dim("\n   ✅ Skipped. Users will use email sign-up instead."))
    return false
  }

  console.log(chalk.cyan("\n🔑 Google OAuth Web Client ID"))
  console.log(chalk.dim("   Find this in Google Cloud Console: APIs & Services > Credentials"))
  services.EXPO_PUBLIC_GOOGLE_CLIENT_ID = await askQuestion(
    "Enter your Google OAuth Web Client ID",
    (id) => id.length > 10,
    defaults.EXPO_PUBLIC_GOOGLE_CLIENT_ID
  )

  console.log(chalk.cyan("\n📱 Google OAuth iOS Client ID"))
  console.log(chalk.dim("   Needed to register the iOS URL scheme for Google Sign-In"))
  services.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = await askQuestion(
    "Enter your Google OAuth iOS Client ID",
    (id) => id.length > 10,
    defaults.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
  )

  return true
}

const configureAppleSignIn = async (
  services: EnvVars,
  defaults: Partial<EnvVars> = {},
  options: SetupOptions = {}
): Promise<boolean> => {
  printSection("🔹 APPLE SIGN-IN (Social Login)", [
    "Let iOS users sign in with their Apple ID (one-click login on iPhones/iPads).",
    "",
    "💡 Setup guide:",
    "   1. Go to https://developer.apple.com/account/resources/identifiers/list",
    "   2. Create a Services ID",
    "   3. Create a Key for Sign in with Apple",
    "   4. Copy the required values",
    "",
    "⏭️  You can skip this - users can still sign up with email.",
    "⏭️  Only needed if you're releasing on iOS.",
  ])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up Apple sign-in?", false))
  if (!shouldConfigure) {
    console.log(chalk.dim("\n   ✅ Skipped. Users will use email sign-up instead."))
    return false
  }

  console.log(chalk.cyan("\n📋 Apple Services ID"))
  console.log(chalk.dim("   Find this in Apple Developer: Certificates, Identifiers & Profiles > Identifiers"))
  console.log(chalk.dim("   Format: com.yourcompany.appname"))
  services.EXPO_PUBLIC_APPLE_SERVICES_ID = await askQuestion("Enter your Apple Services ID", (id) => id.includes("."), defaults.EXPO_PUBLIC_APPLE_SERVICES_ID)
  
  console.log(chalk.cyan("\n👥 Apple Team ID"))
  console.log(chalk.dim("   Find this in Apple Developer: Membership (top right corner)"))
  console.log(chalk.dim("   Format: 10 uppercase letters/numbers (e.g., ABC123DEF4)"))
  services.EXPO_PUBLIC_APPLE_TEAM_ID = await askQuestion("Enter your Apple Team ID (10 characters)", (id) => {
    if (!id) return false
    return /^[A-Z0-9]{10}$/.test(id.toUpperCase())
  }, defaults.EXPO_PUBLIC_APPLE_TEAM_ID)
  
  console.log(chalk.cyan("\n🔑 Apple Private Key"))
  console.log(chalk.dim("   Download this from Apple Developer: Keys > Create a new key"))
  console.log(chalk.dim("   Download the .p8 file and copy its contents"))
  console.log(chalk.dim("   Should start with: -----BEGIN PRIVATE KEY-----"))
  services.EXPO_PUBLIC_APPLE_PRIVATE_KEY = await askQuestion("Enter your Apple Private Key (paste the full key)", (key) => key.startsWith("-----BEGIN PRIVATE KEY-----"), defaults.EXPO_PUBLIC_APPLE_PRIVATE_KEY, true)
  
  console.log(chalk.cyan("\n🆔 Apple Key ID"))
  console.log(chalk.dim("   Found in the same place as your Private Key"))
  console.log(chalk.dim("   Format: 10 uppercase letters/numbers"))
  services.EXPO_PUBLIC_APPLE_KEY_ID = await askQuestion("Enter your Apple Key ID (10 characters)", (id) => {
    if (!id) return false
    return /^[A-Z0-9]{10}$/.test(id.toUpperCase())
  }, defaults.EXPO_PUBLIC_APPLE_KEY_ID)

  return true
}

const configurePostHog = async (
  services: EnvVars,
  defaults: Partial<EnvVars> = {},
  options: SetupOptions = {}
): Promise<boolean> => {
  printSection("🔹 POSTHOG (Analytics)", [
    "Track how users use your app - see which features are popular, where users get stuck, etc.",
    "",
    "💡 Free tier available! Sign up at https://us.posthog.com",
    "",
    "⏭️  You can skip this and add analytics later.",
  ])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up analytics tracking with PostHog?", false))
  if (!shouldConfigure) {
    console.log(chalk.dim("\n   ✅ Skipped. You can add analytics later if needed."))
    return false
  }

  console.log(chalk.cyan("\n🔑 PostHog API Key"))
  console.log(chalk.dim("   Find this in PostHog: Project Settings > Project API Key"))
  services.EXPO_PUBLIC_POSTHOG_API_KEY = await askQuestion("Enter your PostHog API Key", validatePostHogKey, defaults.EXPO_PUBLIC_POSTHOG_API_KEY, true)
  
  console.log(chalk.cyan("\n🌐 PostHog Host"))
  console.log(chalk.dim("   Usually: https://us.i.posthog.com (or https://eu.i.posthog.com for EU)"))
  services.EXPO_PUBLIC_POSTHOG_HOST = await askQuestion("Enter your PostHog Host (or press Enter for default)", validateUrl, defaults.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com")

  return true
}

const configureRevenueCat = async (
  services: EnvVars,
  defaults: Partial<EnvVars> = {},
  options: SetupOptions = {}
): Promise<boolean> => {
  printSection("🔹 REVENUECAT (In-App Purchases)", [
    "Sell subscriptions and one-time purchases in your app.",
    "",
    "💡 Free tier available! Sign up at https://app.revenuecat.com",
    "",
    "⏭️  You can skip this if you're not selling anything yet.",
  ])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up in-app purchases?", false))
  if (!shouldConfigure) {
    console.log(chalk.dim("\n   ✅ Skipped. You can add payments later when ready to monetize."))
    return false
  }

  console.log(chalk.cyan("\n📱 Platform Keys"))
  console.log(chalk.dim("   Find these in RevenueCat: Project Settings > API Keys"))
  console.log(chalk.dim("   💡 Tip: You only need to add keys for platforms you're releasing on"))
  console.log(chalk.dim("   💡 Tip: Press Enter to skip any platform you're not using"))
  
  services.EXPO_PUBLIC_REVENUECAT_IOS_KEY = await askQuestion("iOS Public API Key (optional - press Enter to skip)", null, defaults.EXPO_PUBLIC_REVENUECAT_IOS_KEY, true)
  services.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = await askQuestion("Android Public API Key (optional - press Enter to skip)", null, defaults.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY, true)
  services.EXPO_PUBLIC_REVENUECAT_WEB_KEY = await askQuestion("Web Public API Key (optional - for web version, press Enter to skip)", null, defaults.EXPO_PUBLIC_REVENUECAT_WEB_KEY, true)

  return true
}

const configureSentry = async (
  services: EnvVars,
  defaults: Partial<EnvVars> = {},
  options: SetupOptions = {}
): Promise<boolean> => {
  printSection("🔹 SENTRY (Error Tracking)", [
    "Get notified when your app crashes or has errors. Super helpful for debugging!",
    "",
    "💡 Free tier available! Sign up at https://sentry.io",
    "",
    "⏭️  You can skip this and add error tracking later.",
  ])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up error tracking with Sentry?", false))
  if (!shouldConfigure) {
    console.log(chalk.dim("\n   ✅ Skipped. You can add error tracking later."))
    return false
  }

  console.log(chalk.cyan("\n🔗 Sentry DSN"))
  console.log(chalk.dim("   Find this in Sentry: Settings > Projects > [Your Project] > Client Keys (DSN)"))
  console.log(chalk.dim("   Looks like: https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"))
  services.EXPO_PUBLIC_SENTRY_DSN = await askQuestion("Enter your Sentry DSN", validateSentryDSN, defaults.EXPO_PUBLIC_SENTRY_DSN)

  return true
}

const configureFCM = async (
  services: EnvVars,
  defaults: Partial<EnvVars> = {},
  options: SetupOptions = {}
): Promise<boolean> => {
  printSection("🔹 FIREBASE CLOUD MESSAGING (Push Notifications)", [
    "Send push notifications to Android users (iOS uses Apple's system automatically).",
    "",
    "💡 Setup guide:",
    "   1. Go to https://console.firebase.google.com/",
    "   2. Create a project or use existing one",
    "   3. Go to Project Settings > Cloud Messaging",
    "   4. Copy the Server Key",
    "",
    "⏭️  You can skip this - notifications will still work on iOS.",
    "⏭️  Only needed if you're releasing on Android.",
  ])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to set up push notifications for Android?", false))
  if (!shouldConfigure) {
    console.log(chalk.dim("\n   ✅ Skipped. Push notifications will work on iOS automatically."))
    return false
  }

  console.log(chalk.cyan("\n🔑 Firebase Cloud Messaging Server Key"))
  console.log(chalk.dim("   Find this in Firebase: Project Settings > Cloud Messaging > Server Key"))
  services.EXPO_PUBLIC_FCM_SERVER_KEY = await askQuestion("Enter your Firebase Cloud Messaging Server Key", (key) => key.length > 20, defaults.EXPO_PUBLIC_FCM_SERVER_KEY, true)
  
  console.log(chalk.yellow("\n📥 Important Next Step:"))
  console.log(chalk.dim("   After setup, download google-services.json from Firebase"))
  console.log(chalk.dim("   Place it in: apps/app/android/app/google-services.json"))
  console.log(chalk.dim("   (We'll remind you about this at the end!)"))

  return true
}

const configureWidgets = async (
  services: EnvVars,
  defaults: Partial<EnvVars> = {},
  options: SetupOptions = {}
): Promise<boolean> => {
  printSection("🔹 NATIVE WIDGETS (iOS & Android)", [
    "Enable native home screen widgets for iOS and Android.",
    "Widgets can display data from Supabase and update automatically.",
    "Requires native code generation (prebuild) after enabling.",
    "",
    "⚠️  iOS widgets require an Apple Developer account ($99/year) for code signing.",
    "   Android widgets work without any paid account.",
  ])

  const shouldConfigure = options.skipConfirm || (await askYesNo("Do you want to enable native widgets?", false))
  if (!shouldConfigure) {
    if (services.EXPO_PUBLIC_ENABLE_WIDGETS === undefined) {
      // Don't set it if it's not in the env, let it default to false
    }
    return false
  }

  services.EXPO_PUBLIC_ENABLE_WIDGETS = "true"

  console.log(chalk.cyan("\n👥 Apple Team ID (iOS)"))
  console.log(chalk.dim("   Required for iOS widget code signing."))
  console.log(chalk.dim("   Find this in Apple Developer: Membership (top right corner)"))
  console.log(chalk.dim("   Format: 10 uppercase letters/numbers (e.g., ABC123DEF4)"))
  console.log(chalk.dim("   💡 Leave empty to skip iOS widgets (Android will still work)"))
  const appleTeamId = await askQuestion(
    "Enter your Apple Team ID (or press Enter to skip iOS)",
    (id) => !id || /^[A-Z0-9]{10}$/.test(id.toUpperCase()),
    defaults.APPLE_TEAM_ID || process.env.APPLE_TEAM_ID || ""
  )
  if (appleTeamId) {
    services.APPLE_TEAM_ID = appleTeamId.toUpperCase()
  }

  console.log(chalk.cyan("\n🧩 App Group (iOS)"))
  console.log(chalk.dim("   Used for sharing data between the app and the widget extension."))
  console.log(chalk.dim("   Format: group.com.yourcompany.yourapp"))
  services.APP_GROUP_IDENTIFIER = await askQuestion(
    "Enter your iOS App Group identifier",
    (id) => id.startsWith("group.") && id.split(".").length >= 3,
    defaults.APP_GROUP_IDENTIFIER || process.env.APP_GROUP_IDENTIFIER || "group.com.reactnativestarterkit"
  )

  console.log("\n✅ Widgets enabled!")
  if (appleTeamId) {
    console.log("   📱 iOS widgets: Ready (requires Apple Developer account)")
  } else {
    console.log("   📱 iOS widgets: Skipped (no Apple Team ID)")
  }
  console.log("   🤖 Android widgets: Ready")
  console.log("   💡 After setup, run 'yarn prebuild:clean' to generate native code")
  console.log("   📖 See docs/WIDGETS.md for widget development guide")

  return true
}

const servicesCatalog: ServiceCatalogEntry[] = [
  { key: "appEnv", label: "App Environment & Links", handler: configureAppEnvironment },
  { key: "supabase", label: "Supabase (Backend & Auth)", handler: configureSupabase },
  { key: "google", label: "Google OAuth (Social Login)", handler: configureGoogleOAuth },
  { key: "apple", label: "Apple Sign-In (Social Login)", handler: configureAppleSignIn },
  { key: "posthog", label: "PostHog (Analytics)", handler: configurePostHog },
  { key: "revenuecat", label: "RevenueCat (Monetization)", handler: configureRevenueCat },
  { key: "sentry", label: "Sentry (Error Tracking)", handler: configureSentry },
  { key: "fcm", label: "Firebase Cloud Messaging (Push)", handler: configureFCM },
  { key: "widgets", label: "Native Widgets (iOS & Android)", handler: configureWidgets },
]

const configureServicesSequentially = async (
  services: EnvVars,
  defaults: Partial<EnvVars>,
  options: SetupOptions = {}
): Promise<number> => {
  let configuredCount = 0
  let skipRemaining = false

  // Ask upfront if they want to configure all services or skip optional ones
  if (!isNonInteractive && !options.skipConfirm) {
    console.log(chalk.cyan("\n💡 Quick Setup Tip:"))
    console.log(chalk.dim("   We'll go through each service one by one."))
    console.log(chalk.dim("   You can skip any service and add it later - your app will work fine!"))
    console.log(chalk.dim("   Only Supabase is recommended for a complete setup."))
    console.log("")
  }

  for (let i = 0; i < servicesCatalog.length; i++) {
    if (skipRemaining) break

    const service = servicesCatalog[i]
    const configured = await service.handler(services, defaults, options)
    if (configured) configuredCount += 1

    // Ask about skipping remaining services after each service (except the last one)
    if (!isNonInteractive && i < servicesCatalog.length - 1 && !skipRemaining) {
      const remaining = servicesCatalog.length - i - 1
      const skipAll = await askYesNo(chalk.dim(`\nSkip remaining ${remaining} service(s) and finish setup?`), false)
      if (skipAll) {
        skipRemaining = true
        console.log(chalk.green("\n✅ Great! You can always add these services later by running 'yarn setup' again."))
        break
      }
    }
  }

  return configuredCount
}

const runServiceMenu = async (services: EnvVars, defaults: Partial<EnvVars>): Promise<number> => {
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

const configureMarketingPage = async (
  marketingEnv: EnvVars = {}
): Promise<{ updated: boolean; env: EnvVars; requested: boolean }> => {
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
async function setup(): Promise<void> {
  try {
    // Check prerequisites
    await checkPrerequisites()

    // Welcome banner
    const welcomeBanner = boxen(
      chalk.bold.cyan("🚀 Welcome to Shipnative Setup!") +
        "\n\n" +
        chalk.dim("We'll help you configure your app step-by-step.") +
        "\n" +
        chalk.dim("💡 Don't worry - you can skip anything and add it later!") +
        "\n" +
        chalk.dim("💡 Press Enter to use suggested default values."),
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
    const marketingEnv: EnvVars = marketingEnvData.vars
    const metadataDefaults = getMetadataDefaults()
    const config: Partial<MetadataConfig> = {}
    const services: EnvVars = { ...existingAppEnv }

    // Migrate legacy anon key input to publishable key and drop the old variable name
    if (services.EXPO_PUBLIC_SUPABASE_ANON_KEY && !services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      services.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = services.EXPO_PUBLIC_SUPABASE_ANON_KEY
    }
    delete services.EXPO_PUBLIC_SUPABASE_ANON_KEY
    const serviceDefaults: Partial<EnvVars> = { ...services }

    const isDryRun = process.argv.includes("--dry-run")
    if (isDryRun) {
      console.log("🔍 DRY RUN MODE: No changes will be applied\n")
    }

    console.log(chalk.cyan("\n🎯 Choose Your Setup Path:\n"))
    const mode = await askChoice("How would you like to set up your app?", [
      {
        value: "wizard",
        label: "✨ Guided Wizard (Recommended) - We'll walk you through everything step-by-step",
      },
      {
        value: "service-menu",
        label: "⚙️  Service Configurator - Pick and configure services one at a time",
      },
      {
        value: "metadata-only",
        label: "📱 Just Update App Info - Change app name, bundle ID, etc. (skip services)",
      },
      { value: "exit", label: "❌ Exit - I'll set this up later" },
    ])

    if (mode === "exit") {
      console.log(chalk.dim("\n👋 No changes made. Run `yarn setup` again when you're ready.\n"))
      process.exit(0)
    }

    let metadataConfigured = false
    let servicesConfigured = 0

    if (mode === "wizard") {
      console.log(chalk.green("\n✨ Great choice! Let's set up your app together.\n"))
      console.log(chalk.dim("We'll start with basic app information, then go through optional services."))
      console.log(chalk.dim("Remember: You can skip any service and add it later!\n"))
      metadataConfigured = await configureMetadata(config, metadataDefaults)
      servicesConfigured = await configureServicesSequentially(services, serviceDefaults)
    } else if (mode === "service-menu") {
      console.log(chalk.cyan("\n⚙️  Service Configurator"))
      console.log(chalk.dim("Pick which service you'd like to configure. You can come back anytime!\n"))
      servicesConfigured = await runServiceMenu(services, serviceDefaults)
    } else if (mode === "metadata-only") {
      console.log(chalk.cyan("\n📱 App Metadata Setup"))
      console.log(chalk.dim("Let's update your app's basic information.\n"))
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

    // Offer to regenerate native projects when metadata changed
    const shouldOfferPrebuild = metadataConfigured && !isDryRun
    if (shouldOfferPrebuild) {
      const runPrebuild = await askYesNo(
        "\nRun `yarn prebuild:clean` now to regenerate native projects with the updated name/bundle IDs?",
        false
      )
      if (runPrebuild) {
        const stopSpinner = createSpinner("Running yarn prebuild:clean")
        try {
          execSync("yarn prebuild:clean", { stdio: "inherit" })
          stopSpinner(true)
        } catch (error) {
          stopSpinner(false)
          console.error("   ❌ Failed to run `yarn prebuild:clean`")
          console.error("   Please run `yarn prebuild:clean` manually before the next build.")
        }
      }
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
