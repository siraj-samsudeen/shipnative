# Testing Guide

## Recommended Testing Strategy

### For Development (Fast Iteration)

**Use Mock Mode** - Fastest and most reliable:

```bash
# Remove or comment out Supabase credentials
# apps/app/.env:
# EXPO_PUBLIC_SUPABASE_URL=
# EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Run app
cd apps/app
yarn web  # or yarn ios, yarn android
```

**Benefits:**
- ✅ No network dependency
- ✅ Instant feedback
- ✅ Works offline
- ✅ Perfect for UI/UX development

### For Network Testing

**Use Web Browser** - Most reliable for network requests:

```bash
cd apps/app
yarn web
```

**Why Web is Better:**
- More reliable network stack than iOS Simulator
- Better error messages
- Chrome DevTools for debugging
- Network tab shows all requests
- Easy to test email confirmation flows

### For Real-World Testing

**Use Physical Device** - Most accurate:

```bash
# Development build
cd apps/app
eas build --profile development:device --platform ios

# Or use Expo Go (simpler)
yarn app:start
# Scan QR code with Expo Go app on your phone
```

**Benefits:**
- Real network conditions
- Actual device performance
- Test push notifications
- Test camera, location, etc.

### For CI/CD Testing

**Use Android Emulator** - Most stable:

```bash
cd apps/app
yarn android
```

**Why Android:**
- More stable network stack
- Faster startup
- Less resource intensive
- Good for automated testing

## Quick Reference

| Testing Method | Reliability | Speed | Network | Best For |
|---------------|-------------|-------|---------|----------|
| **Mock Mode** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | Development, UI work |
| **Web Browser** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | Network testing, debugging |
| **Physical Device** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ | Real-world testing |
| **Android Emulator** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | CI/CD, stable testing |
| **iOS Simulator** | ⭐⭐ | ⭐⭐⭐ | ✅ | iOS-specific features |

## Troubleshooting Network Issues

### iOS Simulator Network Problems

If you encounter `status: 0` errors on iOS Simulator:

1. **Restart Simulator** (most common fix):
   ```bash
   # Quit Simulator completely
   # Then restart: yarn app:ios
   ```

2. **Reset Network Settings**:
   - Simulator → Device → Erase All Content and Settings

3. **Use Web Instead**:
   ```bash
   yarn app:web
   ```

4. **Test on Physical Device**:
   ```bash
   eas build --profile development:device --platform ios
   ```

### Switching Between Mock and Real Supabase

**Enable Mock Mode:**
```bash
# Comment out credentials in apps/app/.env
# EXPO_PUBLIC_SUPABASE_URL=
# EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

**Enable Real Supabase:**
```bash
# Uncomment credentials in apps/app/.env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

**Always restart Metro after changing .env:**
```bash
yarn app:start --clear
```

## Best Practices

1. **Start with Mock Mode** - Develop UI/UX without network delays
2. **Test Network on Web** - More reliable than simulators
3. **Validate on Physical Device** - Before deploying
4. **Use Android for CI/CD** - More stable for automated tests

## Email Confirmation Testing

**Mock Mode:**
- Email confirmation is instant (no real email sent)
- User is created but `email_confirmed_at` is null
- Use `EmailVerificationScreen` to test flow

**Real Supabase (Web):**
- Best for testing email confirmation links
- Click links in browser
- App detects confirmation via polling

**Real Supabase (Mobile):**
- Click confirmation link on any device
- Supabase shows success page
- App polls for confirmation status














