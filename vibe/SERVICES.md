# Services Architecture

This document provides an overview of all external services integrated into the application.

## Service Overview

| Service | Purpose | Platforms | Mock Available | Documentation |
|---------|---------|-----------|----------------|---------------|
| **Supabase** | Auth & Database | Web, iOS, Android | ✅ Yes | [SUPABASE.md](../docs/SUPABASE.md) |
| **PostHog** | Analytics | Web, iOS, Android | ✅ Yes | [ANALYTICS.md](../docs/ANALYTICS.md) |
| **Sentry** | Error Tracking | Web, iOS, Android | ✅ Yes | [ANALYTICS.md](../docs/ANALYTICS.md) |
| **RevenueCat** | Mobile & Web Payments | iOS, Android, Web | ✅ Yes | [MONETIZATION.md](../docs/MONETIZATION.md) |

---

## Architecture Principles

### 1. Unified Interfaces

All services implement platform-agnostic interfaces:

```typescript
// Analytics
interface AnalyticsService {
  track(event: string, properties?: EventProperties): void
  identify(userId: string, properties?: UserProperties): void
  // ... more methods
}

// Error Tracking
interface ErrorTrackingService {
  captureException(error: Error, context?: ErrorContext): void
  setUser(user: UserContext): void
  // ... more methods
}

// Authentication
interface AuthService {
  signUp(credentials: SignUpCredentials): Promise<AuthResponse>
  signIn(credentials: SignInCredentials): Promise<AuthResponse>
  // ... more methods
}
```

**Benefits**:
- ✅ Type-safe usage
- ✅ Easy to switch providers
- ✅ Consistent API across platforms
- ✅ Testable with mocks

### 2. Automatic Platform Detection

Services automatically use the correct SDK:

```typescript
if (Platform.OS === "web") {
  // Use web SDK
  PostHogJS.init(apiKey)
} else {
  // Use React Native SDK
  new PostHogRN(apiKey)
}
```

### 3. Mock Fallback

Services automatically use mocks when API keys are missing:

```typescript
const useMock = __DEV__ && !apiKey

export const service = useMock ? mockService : realService
```

---

## Service Details

### Supabase

**Purpose**: Backend-as-a-Service for authentication and database

**Features**:
- Email/password authentication
- PostgreSQL database
- Row Level Security
- Real-time subscriptions
- File storage

**SDK**: `@supabase/supabase-js` (works on all platforms)

**Mock Capabilities**:
- Full auth simulation
- In-memory database
- Query builder support
- CRUD operations

**Usage**:
```typescript
import { supabase } from './services/supabase'
import { useAuth } from './hooks/useAuth'

// Hook (recommended)
const { user, signIn, signOut } = useAuth()

// Direct client
const { data, error } = await supabase
  .from('posts')
  .select('*')
```

---

### PostHog

**Purpose**: Product analytics and feature flags

**Features**:
- Event tracking
- User identification
- Feature flags
- Session recording (web)
- A/B testing

**SDKs**:
- Web: `posthog-js`
- Mobile: `posthog-react-native`

**Mock Capabilities**:
- Event tracking (logged to console)
- Feature flag simulation
- Event history for testing

**Usage**:
```typescript
import { useAnalytics } from './hooks/useAnalytics'

const { trackEvent, trackScreen, isFeatureEnabled } = useAnalytics()

trackEvent('button_clicked', { button: 'submit' })
trackScreen('HomeScreen')

if (isFeatureEnabled('new-feature')) {
  // Show new feature
}
```

---

### Sentry

**Purpose**: Error tracking and performance monitoring

**Features**:
- Exception tracking
- Breadcrumbs
- User context
- Performance monitoring
- Release tracking

**SDKs**:
- Web: `@sentry/react`
- Mobile: `@sentry/react-native`

**Mock Capabilities**:
- Error logging (to console)
- Breadcrumb tracking
- Error history for testing

**Usage**:
```typescript
import { useAnalytics } from './hooks/useAnalytics'

const { trackError } = useAnalytics()

try {
  // risky code
} catch (error) {
  trackError(error as Error, {
    tags: { component: 'PaymentForm' },
    extra: { amount: 99.99 },
  })
}
```

---

### RevenueCat

**Purpose**: Mobile in-app purchase management

**Features**:
- iOS App Store integration
- Android Play Store integration
- Subscription management
- Purchase restoration
- Webhooks

**SDK**: `react-native-purchases`

**Mock Capabilities**:
- Purchase simulation (always succeeds)
- Subscription states
- Restore purchases
- Offerings/packages

**Usage**:
```typescript
import { useSubscriptionStore } from './stores/subscriptionStore'

const { isPro, packages, purchasePackage } = useSubscriptionStore()

// Purchase
await purchasePackage(selectedPackage)

// Check status
if (isPro) {
  // Show premium features
}
```

---



---

## Service Integration Patterns

### 1. Hooks (Recommended)

```typescript
// Authentication
const { user, signIn, signOut } = useAuth()

// Analytics
const { trackEvent, trackScreen } = useAnalytics()

// Subscriptions
const { isPro, purchasePackage } = useSubscriptionStore()
```

### 2. Utility Functions

```typescript
// Analytics utilities
import { trackEvent, trackAuth, identifyUser } from './utils/analytics'

trackEvent('button_clicked')
trackAuth.loginCompleted(userId)
identifyUser(userId, { email: 'user@example.com' })
```

### 3. Direct Service Access

```typescript
// For advanced usage
import { supabase } from './services/supabase'
import { posthog } from './services/posthog'
import { sentry } from './services/sentry'

supabase.from('posts').select('*')
posthog.track('event')
sentry.captureException(error)
```

---

## Environment Variables

All services are configured via environment variables:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key

# PostHog
EXPO_PUBLIC_POSTHOG_API_KEY=your-api-key
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry
EXPO_PUBLIC_SENTRY_DSN=your-dsn

# RevenueCat
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your-ios-key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your-android-key
EXPO_PUBLIC_REVENUECAT_WEB_KEY=your-web-key
```

**Missing Variables**: Services automatically use mocks in development

---

## Service Initialization

Services are initialized in `App.tsx`:

```typescript
import { initPosthog } from './services/posthog'
import { initSentry } from './services/sentry'
import { useSubscriptionStore } from './stores/subscriptionStore'

function App() {
  useEffect(() => {
    // Initialize analytics
    initPosthog()
    
    // Initialize error tracking
    initSentry()
    
    // Initialize subscriptions
    subscriptionStore.initialize()
  }, [])
  
  // ... rest of app
}
```

---

## Testing with Mocks

### Unit Tests

```typescript
import { mockSupabaseHelpers } from './services/mocks/supabase'
import { MockPostHog } from './services/mocks/posthog'

// Seed data
mockSupabaseHelpers.seedTable('posts', [
  { id: 1, title: 'Test Post' },
])

// Track events
const mockPostHog = new MockPostHog({ apiKey: 'test' })
mockPostHog.track('test_event')

// Get tracked events
const events = mockPostHog.getEvents()
expect(events).toHaveLength(1)
```

### Integration Tests

```typescript
// Mock services work exactly like real ones
const { data, error } = await supabase
  .from('posts')
  .select('*')

// Data comes from mock database
expect(data).toHaveLength(1)
```

---

## Production Checklist

Before deploying to production:

- [ ] Set up Supabase project and add credentials
- [ ] Set up PostHog project and add API key
- [ ] Set up Sentry project and add DSN
- [ ] Set up RevenueCat and configure apps (iOS, Android, Web)
- [ ] Configure webhooks for all services
- [ ] Test with real services in staging
- [ ] Verify analytics tracking
- [ ] Test subscription flows
- [ ] Review error tracking

---

## Troubleshooting

### Services using mocks in production

**Problem**: Console shows mock warnings in production build

**Solution**:
- Verify all environment variables are set
- Check variables are prefixed with `EXPO_PUBLIC_`
- Rebuild app: `yarn app:start --clear`

### Type errors with service interfaces

**Problem**: TypeScript errors when using services

**Solution**:
- Check you're using the correct types from `types/` folder
- Ensure service implements the interface correctly
- Update TypeScript if needed

### Services not initializing

**Problem**: Services not working even with API keys

**Solution**:
- Check initialization in `App.tsx`
- Verify API keys are valid
- Check network connectivity
- Review service-specific logs

---

## Best Practices

1. **Always use hooks** for common operations
2. **Use utility functions** for analytics/errors
3. **Check for errors** in all service calls
4. **Add proper types** to all service responses
5. **Test with mocks** before using real services
6. **Monitor console** for mock service logs
7. **Seed data** for consistent testing
8. **Handle loading states** in UI
9. **Provide error feedback** to users
10. **Use environment variables** for all config

---

## Further Reading

- [Mock Services Guide](./MOCK_SERVICES.md) - Detailed mock service documentation
- [SUPABASE.md](../docs/SUPABASE.md) - Supabase setup and usage
- [ANALYTICS.md](../docs/ANALYTICS.md) - PostHog and Sentry guide
- [MONETIZATION.md](../docs/MONETIZATION.md) - RevenueCat guide
