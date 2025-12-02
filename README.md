# ShipNative Starter Kit

React Native (Expo) boilerplate with authentication, subscriptions, analytics, and UI components. Optimized for AI-assisted development. The docs site is the single source of truth for setup, configuration, and deployment—start there.

## 🚀 Essential Setup (What You MUST Do)

### Minimum Required (2 minutes - Start Building Immediately)

**You can start building right away with zero configuration:**

```bash
# 1. Clone and install
git clone <your-repo-url>
cd shipnative
yarn install

# 2. Run the app
cd apps/app
yarn ios        # or yarn android
```

**That's it!** The app runs with mock services (simulated backend). No API keys needed.

### Before Production Deployment (REQUIRED)

**These steps are mandatory before releasing to app stores:**

#### 1. Generate Android Release Keystore (CRITICAL)
```bash
cd apps/app/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore \
  -alias release-key -keyalg RSA -keysize 2048 -validity 10000
```

Then configure in CI/CD or `gradle.properties`:
```properties
RELEASE_STORE_FILE=release.keystore
RELEASE_STORE_PASSWORD=your-secure-password
RELEASE_KEY_ALIAS=release-key
RELEASE_KEY_PASSWORD=your-secure-password
```

**⚠️ Never use the debug keystore in production builds!**

#### 2. Configure Bundle Identifiers
Update `apps/app/app.json`:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp"
    },
    "android": {
      "package": "com.yourcompany.yourapp"
    }
  }
}
```

#### 3. Set Up Backend Services (Choose One)

**Option A: Use Mock Services (Development Only)**
- ✅ Works out of the box
- ✅ No setup required
- ❌ Not for production

**Option B: Configure Real Services (Production Required)**
- Run setup wizard: `yarn setup`
- Or manually create `apps/app/.env` with:
  ```bash
  EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```

**Minimum for production:** Supabase (auth + database)

#### 4. Configure Certificate Pinning (SECURITY - Recommended)
Edit `apps/app/app/services/certificatePinning.ts` and add your API domain certificate hashes.

See [Security Setup](#security-setup) below for details.

### Optional (But Recommended)

- **RevenueCat** - For in-app purchases (can use mock mode)
- **PostHog** - For analytics (can use mock mode)
- **Sentry** - For error tracking (can use mock mode)
- **Push Notifications** - Configure when needed

## 🔒 Security Setup

### Certificate Pinning (Recommended for Production)

1. Install a certificate pinning library:
   ```bash
   yarn add react-native-cert-pinner
   ```

2. Get your API domain's certificate hash:
   ```bash
   openssl s_client -servername your-domain.com -connect your-domain.com:443 < /dev/null | \
     openssl x509 -pubkey -noout | \
     openssl pkey -pubin -outform der | \
     openssl dgst -sha256 -binary | \
     openssl enc -base64
   ```

3. Add to `apps/app/app/services/certificatePinning.ts`:
   ```typescript
   const CERTIFICATE_PINS: Record<string, string[]> = {
     "your-project.supabase.co": [
       "sha256/YOUR_CERTIFICATE_HASH_HERE",
     ],
   }
   ```

### Security Features Already Configured

✅ Secure storage for auth tokens (iOS Keychain / Android Keystore)  
✅ HTTPS enforcement in production  
✅ Sensitive data redaction in logs  
✅ Deep link token validation  
✅ Android backup protection  
✅ ProGuard/R8 code obfuscation enabled  

## Highlights

- React Native (Expo SDK 54) for iOS, Android, and Web (Expo Web)
- Unistyles-based theming with light/dark modes
- Supabase auth + profiles, RevenueCat subscriptions, PostHog analytics
- Push notifications, deep linking, and mock mode for key services
- Dev Dashboard for component showroom, auth states, and theme toggles
- Production-ready SQL schema and a TypeScript-first codebase

## Documentation

- Full guides and walkthroughs: https://docs.shipnative.app
- Covers quickstart, environment setup, service keys, mock mode, deployment, and troubleshooting.

## Repo Notes

- `apps/app` contains the Expo app code (screens, components, navigation, services, theme).
- `apps/app/vibe` and `vibe` hold AI context docs for coding assistance.
- `docs/` houses the source for the public docs site if you need to edit content.

## Contributing

Follow the contribution guidance in the docs and update relevant vibe context files when changing features.

## License

See `LICENSE.md` for details.
