/** @type {import('@jest/types').Config.ProjectConfig} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/test/setup.ts"],
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "!app/**/*.d.ts",
    "!app/**/*.test.{ts,tsx}",
    "!app/**/__tests__/**",
    "!app/**/index.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  // Force exit after tests complete to handle open handles from
  // expo-notifications, supabase auth listeners, etc.
  forceExit: true,
  // Increase timeout for CI environments
  testTimeout: 30000,
}
