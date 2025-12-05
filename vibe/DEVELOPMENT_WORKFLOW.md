# Development Workflow

> **Reference**: See `AI_CONTEXT.md` for technology stack overview. This file contains development workflow, mock mode, and common mistakes.

## 🔄 Development Workflow

### Before Writing Code

1. **Read context files**:
   - `apps/app/vibe/CONTEXT.md` - App structure and features
   - `apps/app/vibe/TECH_STACK.md` - Technology decisions
   - `apps/app/vibe/STYLE_GUIDE.md` - Code patterns
   - `vibe/SERVICES.md` - Service architecture
   - `vibe/MOCK_SERVICES.md` - Mock mode guide

2. **Check existing code**:
   - Browse `app/components` or `@/components` for reusable UI
   - Look at `app/screens` or `@/screens` for screen patterns
   - Check `app/stores` or `@/stores` for state patterns

3. **Follow patterns**:
   - Use Unistyles with theme (never hardcode)
   - Use screen templates for auth/onboarding
   - Use Zustand for global state
   - Use React Query for data fetching

## 🧪 Mock Mode

All services have mock implementations that activate automatically when API keys are missing:
- ✅ Supabase (auth, database, storage, realtime)
- ✅ RevenueCat (purchases, subscriptions)
- ✅ PostHog (analytics, feature flags)
- ✅ Sentry (error tracking)

**No API keys needed for development!**

See `vibe/MOCK_SERVICES.md` for complete details.

## 🚨 Common Mistakes to Avoid

```typescript
// ❌ DON'T: Use NativeWind
<View className="flex-1 bg-white">

// ✅ DO: Use Unistyles with theme
const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background }
}))

// ❌ DON'T: Hardcode values
padding: 16, color: '#000000'

// ✅ DO: Use theme values
padding: theme.spacing.md, color: theme.colors.foreground

// ❌ DON'T: Use Expo Router
import { useRouter } from 'expo-router'

// ✅ DO: Use React Navigation
import { useNavigation } from '@react-navigation/native'

// ❌ DON'T: Use useEffect for data fetching
useEffect(() => { fetch('/api/data') }, [])

// ✅ DO: Use React Query
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData })

// ❌ DON'T: Use any types
const data: any = fetchData()

// ✅ DO: Use proper TypeScript types
const data: User = fetchData()
```

## 📚 Related Files

- **Mock Services**: `vibe/MOCK_SERVICES.md` (detailed mock mode guide)
- **Services**: `vibe/SERVICES.md` (service architecture)
- **AI Context**: `AI_CONTEXT.md` (technology stack overview)





