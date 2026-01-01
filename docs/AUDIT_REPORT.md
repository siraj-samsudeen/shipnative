# Audit Report

Scope: `shipnativeapp` monorepo (apps/app + apps/web + root tooling)

## Scorecard
| Category | Before | After |
| --- | --- | --- |
| 1) TypeScript `any` check | 0 | 2 |
| 2) Server state separation | 1 | 2 |
| 3) Cold start deep link correctness | 0 | 2 |
| 4) Type-safe environment variables | 1 | 2 |
| 5) Magic numbers & design tokens | 1 | 2 |
| 6) Auth loop handling / 401 recovery | 1 | 2 |
| 7) Error boundaries + crash reporting | 1 | 2 |
| 8) List virtualization performance | 2 | 2 |
| 9) Clean machine setup | 1 | 2 |
| Developer hygiene | 1 | 2 |
| Bonus: Accessibility basics | 1 | 2 |
| **Total (core 10 categories)** | **9 / 20** | **20 / 20** |

---

## 1) TypeScript `any` check
- Findings: Explicit `any` in analytics, auth, revenuecat, env, storage, logger/error utilities, and several app-level interfaces. Lint explicitly disabled `no-explicit-any`.
- Risk: Type leaks across app services, runtime assumptions, fragile refactors.
- Changes:
  - Replaced `any` with `unknown` or concrete interfaces in app services/types.
  - Added stronger service interfaces for PostHog/Sentry/RevenueCat.
  - Tightened Zustand store types for subscriptions.
  - Enabled `@typescript-eslint/no-explicit-any` with overrides for tests/mocks.

## 2) Server state separation
- Findings: Two separate React Query clients were defined; provider used a different client than shared query utilities.
- Risk: Cache invalidations and retries inconsistent; logout clearing could miss the active client.
- Changes:
  - Unified `QueryProvider` to use the shared query client from `app/hooks/queries`.

## 3) Cold start deep link correctness
- Findings: No reset-password screen, `auth/callback` was mapped without a screen, deep link parsing ignored host-based scheme URLs.
- Risk: Password reset/OAuth links fail to route on cold start; broken recovery flow.
- Changes:
  - Added `ResetPasswordScreen` + schema and wired it into navigation + linking.
  - Added `AuthCallbackScreen` for OAuth and session exchange.
  - Fixed deep link parsing to use host when pathname is empty.
  - Added deep link unit tests.
  - Added password reset redirect support in auth flow.

## 4) Type-safe environment variables
- Findings: `process.env` used directly across services; env validation only logged warnings; production could boot with missing required values.
- Risk: Undefined behavior in production; difficult to reason about required config.
- Changes:
  - Centralized env in `app/config/env.ts` with Zod schema + production fail-fast.
  - Replaced direct `process.env` usage across services with `env`.
  - Updated `apps/app/.env.example` to match actual runtime keys.

## 5) Magic numbers & design tokens
- Findings: Inline styles with hardcoded values in UI components.
- Risk: Theme drift, inconsistent styling.
- Changes:
  - Removed inline styles in `ComponentShowcaseScreen` and `EmptyState` in favor of theme tokens.

## 6) Auth loop handling / 401 recovery
- Findings: API layer logged 401 but did not recover or sign out; sign-out did not clear server cache.
- Risk: Stale auth state, infinite retries, cached data leakage after logout.
- Changes:
  - Added 401 handler to refresh session (when supported) and sign out otherwise.
  - Clear React Query cache on sign-out.

## 7) Error boundaries + crash reporting
- Findings: Sentry existed, but unhandled promise rejections were not surfaced on web.
- Risk: Silent failures during async flows on web.
- Changes:
  - Added web `unhandledrejection` listener to log errors via the app logger.
  - Strengthened Sentry types.

## 8) List virtualization performance
- Findings: No large list screens or unvirtualized 100+ item lists detected.
- Risk: Low.
- Changes: None required.

## 9) Clean machine setup
- Findings: `package-lock.json` existed alongside Yarn; no explicit Node version file.
- Risk: Dependency drift and inconsistent installs.
- Changes:
  - Removed `package-lock.json`.
  - Added `.nvmrc` (Node 20).
  - CI now uses Yarn via Corepack.

## Developer hygiene
- Findings: No CI; lint/typecheck/test scripts inconsistent across workspaces.
- Risk: Regressions land unnoticed.
- Changes:
  - Added GitHub Actions CI (`lint`, `typecheck`, `test`, web builds).
  - Added `typecheck` + `lint:check` scripts and Turbo tasks.
  - Updated README with setup, env, conventions, and troubleshooting.

## Bonus: Accessibility basics
- Findings: No contributor a11y checklist.
- Risk: Inconsistent accessibility baseline.
- Changes: Added checklist to README.
