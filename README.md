# Shipnative Starter Kit

Docs are the source of truth: https://docs.shipnative.app  
This README is a practical quickstart + conventions index.

## Quickstart
1) `corepack enable`
2) `yarn install`
3) `yarn setup` (recommended to wire API keys before coding)
4) `yarn app:start`

Node version: 20+ (see `.nvmrc`).

## Repo Layout
- `apps/app` — React Native (Expo) application (iOS/Android/Web)
- `apps/web` — Marketing site (Vite/React)
- `packages` — Shared packages (if present)
- `vibe/` — Detailed specs and engineering guides

## Commands
App:
- `yarn app:start` — start Expo dev client
- `yarn app:ios` — run iOS
- `yarn app:android` — run Android
- `yarn app:web` — run Expo web

Marketing site:
- `yarn marketing:dev`
- `yarn marketing:build`

Tooling:
- `yarn lint:check`
- `yarn typecheck`
- `yarn test`

## Environment
Runtime env lives in `apps/app/.env` (Expo uses `EXPO_PUBLIC_` vars).
- Copy `apps/app/.env.example` → `apps/app/.env`
- Required in production: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Optional services: PostHog, RevenueCat, Sentry, OAuth providers
- Optional redirects: `EXPO_PUBLIC_EMAIL_REDIRECT_URL`, `EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL`

The app validates env at startup and will fail fast in production if required keys are missing.

## Deep Links
Examples:
- `shipnative://reset-password?code=...`
- `shipnative://verify-email?code=...`
- `shipnative://auth/callback?code=...`

## Troubleshooting
- Missing keys? The app falls back to mock services in development.
- Stuck in odd state? Clear Expo cache: `expo start -c`
- iOS build issues? Reinstall pods inside `apps/app/ios` as needed.

## Conventions (App)
- Styling: React Native Unistyles 3.0 (no inline styles)
- Navigation: React Navigation (no Expo Router)
- State: Zustand (global), React Query (server)
- Forms: React Hook Form + Zod
- TypeScript: strict, no explicit `any`

## Accessibility Checklist (Baseline)
- Interactive elements have labels or visible text
- Touch targets are at least 44x44
- Text contrast meets WCAG AA
- Focus order is logical for keyboard navigation (web)

## CI
CI runs lint, typecheck, tests, and web builds on push/PR.
