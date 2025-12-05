# Tech Stack

## Core Framework

### React Native + Expo
- **Why**: Best developer experience for cross-platform mobile apps
- **Version**: Expo SDK 54, React Native 0.81
- **Platforms**: iOS, Android, Web (fully supported via Expo Web)

## State Management

### Zustand ✅
- **Use for**: Global state (auth, subscriptions, user preferences, app settings)
- **Why**: Simple, performant, minimal boilerplate, AI-friendly
- **Pattern**: Create stores in `/stores`, use hooks in components

```typescript
// ✅ DO THIS
import { useAuthStore } from '@/stores/authStore'

const user = useAuthStore((state) => state.user)
const signOut = useAuthStore((state) => state.signOut)
```

### React Query ✅
- **Use for**: Server state (API calls, data fetching, caching)
- **Why**: Automatic caching, refetching, error handling, loading states
- **Pattern**: Create query hooks in `/hooks/queries`

```typescript
// ✅ DO THIS
const { data, isLoading, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId)
})
```

### ❌ DO NOT USE
- **Redux** - Too much boilerplate, outdated pattern
- **MobX** - Less popular, harder for AI to work with
- **Context API** - Use Zustand instead for global state
- **useEffect for data fetching** - Use React Query instead

## Internationalization (i18n)

### i18next + react-i18next ✅
- **Use for**: All user-facing text, labels, messages, buttons
- **Why**: Industry standard, type-safe translation keys, RTL support, automatic device language detection
- **Pattern**: Always use `tx` props or `translate()` function, never hardcode text

```typescript
// ✅ DO THIS - Use translation keys
import { Text } from '@/components'
import { translate } from '@/i18n/translate'

<Text tx="common:ok" />
<Text tx="loginScreen:emailFieldLabel" />
<Button tx="common:save" />

// For dynamic text
const message = translate("errors:invalidEmail")
const status = translate("subscriptionStatus:subscribedVia", { platform: "App Store" })

// ❌ DON'T DO THIS - Hardcoded text
<Text>Cancel</Text>
<Button text="Save" />
```

### Supported Languages
- English (en) - Default
- Arabic (ar) - RTL support
- Spanish (es)
- French (fr)
- Hindi (hi)
- Japanese (ja)
- Korean (ko)

### Language Files
All translations in `/app/i18n/`:
- `en.ts` - Source of truth (defines Types)
- `ar.ts`, `es.ts`, `fr.ts`, `hi.ts`, `ja.ts`, `ko.ts` - Other languages

### Language Switching
```typescript
import { changeLanguage, SUPPORTED_LANGUAGES } from '@/i18n'

// Change language programmatically
await changeLanguage('es')

// Get current language
import { getCurrentLanguage } from '@/i18n'
const lang = getCurrentLanguage()
```

### Automatic Detection
- App automatically detects device language on startup
- Falls back to English if device language not supported
- User preference is persisted and restored

## Styling

### React Native Unistyles 3.0 ✅
- **Why**: Type-safe styling, variants support, theme-aware, high performance
- **Pattern**: Use `StyleSheet.create()` with theme access
- **Docs**: https://unistyl.es

```typescript
// ✅ DO THIS - Unistyles with theme
import { StyleSheet, useUnistyles } from 'react-native-unistyles'

// In component - access theme dynamically
const { theme } = useUnistyles()

// Define styles with theme access
const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.sizes['2xl'],
    fontFamily: theme.typography.fonts.bold,
    color: theme.colors.foreground,
  }
}))

// Usage
<View style={styles.container}>
  <Text style={styles.title}>Hello World</Text>
</View>
```

### Variants Support ✅

```typescript
// ✅ DO THIS - Use variants for component states
const styles = StyleSheet.create((theme) => ({
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    variants: {
      variant: {
        filled: {
          backgroundColor: theme.colors.primary,
        },
        outlined: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        ghost: {
          backgroundColor: 'transparent',
        },
      },
      size: {
        sm: { height: 36 },
        md: { height: 44 },
        lg: { height: 56 },
      },
    },
  },
}))

// In component
styles.useVariants({ variant: 'filled', size: 'md' })
```

### Dark Mode
- Automatic via `adaptiveThemes: true` in Unistyles config
- Define both `lightTheme` and `darkTheme` in `/theme/unistyles.ts`
- All components automatically respond to system theme changes

### Theme Structure
- **Single source of truth**: `/app/theme/unistyles.ts`
- **Colors**: Semantic colors (primary, secondary, background, foreground, etc.)
- **Typography**: Fonts, sizes, line heights
- **Spacing**: 8px grid system (xs, sm, md, lg, xl, etc.)
- **Radius**: Border radius scale
- **Shadows**: Elevation system

### ❌ DO NOT USE
- **NativeWind/Tailwind** - Removed, replaced by Unistyles 3.0 for better performance and type safety
- **Inline style objects** - Use StyleSheet.create instead
- **StyleSheet.create without theme** - Always use theme function

## Navigation

### React Navigation ✅
- **Why**: Most mature navigation library, great TypeScript support
- **Pattern**: Type-safe navigation with `navigationTypes.ts`
- **Navigation**: Use `navigation.navigate()`, `navigation.goBack()`, etc.

```typescript
// ✅ DO THIS
import { useNavigation } from '@react-navigation/native'

const navigation = useNavigation()
navigation.navigate('Profile')
```

## Data Fetching

### React Query ✅
- **Use for**: All API calls, data fetching, mutations
- **Pattern**: Create custom hooks in `/hooks/queries`

```typescript
// ✅ DO THIS - Query
export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.getUser(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ✅ DO THIS - Mutation
export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: ProfileData) => api.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    }
  })
}
```

### ❌ DO NOT USE
- **useEffect + fetch** - Use React Query instead
- **Axios directly in components** - Wrap in React Query hooks
- **Manual loading/error state** - React Query handles this

## Backend Services

### Supabase (Authentication + Database)
- **Auth**: Email/password, social auth (Google, Apple)
- **Database**: PostgreSQL with real-time subscriptions
- **Storage**: File uploads (avatars, etc.)
- **Pattern**: Use via `/services/supabase.ts`

```typescript
// ✅ DO THIS
import { supabase } from '@/services/supabase'

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})
```

### RevenueCat (Subscriptions)
- **Why**: Cross-platform subscription management
- **Pattern**: Use via `/stores/subscriptionStore.ts`
- **Entitlements**: Check `isPro` from subscription store

```typescript
// ✅ DO THIS
const isPro = useSubscriptionStore((state) => state.isPro)

if (!isPro) {
  navigation.navigate('Paywall')
}
```

### PostHog (Analytics)
- **Why**: Open-source, privacy-friendly, feature flags
- **Pattern**: Use via `/services/posthog.ts`

```typescript
// ✅ DO THIS
import { posthog } from '@/services/posthog'

posthog.capture('button_clicked', {
  button_name: 'subscribe',
  screen: 'paywall'
})
```

### Expo Widgets (@bittingz/expo-widgets)
- **Why**: Native iOS and Android home screen widgets with Supabase integration
- **Pattern**: Feature flag controlled, widgets in `/app/widgets/`
- **Enable**: Set `EXPO_PUBLIC_ENABLE_WIDGETS=true` in `.env`
- **Documentation**: See `/docs/WIDGETS.md` and `/app/widgets/README.md`

```typescript
// ✅ DO THIS - Fetch widget data
import { useWidgetData } from '@/hooks/useWidgetData'

const { data, loading, error } = useWidgetData({
  table: 'profiles',
  select: 'id, first_name',
  limit: 1,
  requireAuth: true,
})
```

## Forms & Validation

### React Hook Form + Zod ✅
- **Why**: Type-safe validation, great DX, performant
- **Pattern**: Use in all forms

```typescript
// ✅ DO THIS
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

const { control, handleSubmit } = useForm({
  resolver: zodResolver(schema)
})
```

## UI Components

### Custom Component Library ✅
- **Location**: `/components`
- **Pattern**: All components use Unistyles, support dark mode via theme
- **Core Components**: Button, Text, TextField, Card, Avatar, Badge, Divider, Spinner, IconButton, Container

```typescript
// ✅ DO THIS - Use existing components
import { Button, Text, Card, Avatar, Badge } from '@/components'

<Card>
  <Text preset="heading">Title</Text>
  <Button variant="filled" onPress={handlePress}>Click Me</Button>
</Card>
```

### ❌ DO NOT USE
- **React Native Paper** - We have custom components
- **Native Base** - We have custom components
- **UI Kitten** - We have custom components

## Animations

### React Native Reanimated ✅
- **Why**: Performant, runs on UI thread
- **Use for**: Complex animations, gestures

### Lottie ✅
- **Why**: Beautiful vector animations
- **Use for**: Onboarding, loading states, empty states

## Icons

### Expo Vector Icons ✅
- **Available sets**: Ionicons, MaterialIcons, FontAwesome, etc.
- **Pattern**: Use Ionicons by default for consistency

```typescript
// ✅ DO THIS
import { Ionicons } from '@expo/vector-icons'

<Ionicons name="heart" size={24} color={theme.colors.error} />
```

## Testing

### Jest + React Native Testing Library ✅
- **Unit tests**: For utilities, hooks, stores
- **Component tests**: For UI components
- **Pattern**: Co-locate tests with code (`*.test.ts`)

### Maestro ✅
- **E2E tests**: For critical user flows
- **Pattern**: Flows in `/.maestro/flows`

## TypeScript

### Strict Mode ✅
- **Why**: Catch errors early, better DX, AI-friendly
- **Pattern**: No `any` types, use proper types

```typescript
// ✅ DO THIS
interface User {
  id: string
  email: string
  name: string
}

const user: User = { ... }

// ❌ DON'T DO THIS
const user: any = { ... }
```

## Development Tools

### Reactotron ✅
- **Why**: Debug state, API calls, performance
- **Use**: In development mode only

### EAS (Expo Application Services) ✅
- **Why**: Cloud builds, no need for Xcode/Android Studio
- **Use**: For production builds and deployments

## Code Organization

### Feature-Based Structure
```
/app
  /screens          # Screen components
/components         # Reusable UI components
/stores             # Zustand stores
/hooks              # Custom hooks
  /queries          # React Query hooks
/services           # External services
/utils              # Helper functions
/types              # TypeScript types
/theme              # Unistyles configuration
  unistyles.ts      # Theme definitions (single source of truth)
```

## Environment Variables

### Pattern
- Use `expo-constants` to access env vars
- Store in `.env` (not committed)
- Provide `.env.example` for reference

```typescript
// ✅ DO THIS
import Constants from 'expo-constants'

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl
```

## Performance Best Practices

1. **Use React.memo** for expensive components
2. **Use useMemo/useCallback** for expensive computations
3. **Lazy load** screens and heavy components
4. **Optimize images** with proper sizes and formats
5. **Use FlatList** for long lists, not ScrollView + map

## Security Best Practices

1. **Never commit** API keys or secrets
2. **Use Expo SecureStore** for sensitive data
3. **Validate all user input** with Zod
4. **Use HTTPS** for all API calls
5. **Implement proper auth** with Supabase RLS

## Accessibility

1. **Add accessibilityLabel** to all interactive elements
2. **Use semantic roles** (button, header, etc.)
3. **Test with screen readers**
4. **Ensure proper color contrast**
5. **Support dynamic text sizing**

## AI Development Guidelines

When adding features:

1. **Check existing patterns** - Look at similar screens/components
2. **Reuse components** - Don't create new ones if existing ones work
3. **Follow conventions** - Use the same patterns as existing code
4. **Use theme values** - Always use `theme.colors`, `theme.spacing`, etc.
5. **Support variants** - Use Unistyles variants for component states
6. **Update documentation** - Update `vibe/CONTEXT.md` when adding major features
7. **Write tests** - Add tests for new functionality
8. **Consider accessibility** - Add proper labels and support
9. **Handle errors** - Use try-catch and show user-friendly messages
10. **Add analytics** - Track important user actions with PostHog
11. **Test in mock mode** - Ensure it works without API keys
