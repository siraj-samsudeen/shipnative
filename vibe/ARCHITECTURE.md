# Architecture Patterns

> **Reference**: See `AI_CONTEXT.md` for technology stack overview. This file contains detailed architecture patterns and code structure.

## 🏗️ Component Structure

```typescript
// 1. Imports (React → Third-party → Stores/Hooks → Components → Utils/Types)
// 2. Types/Interfaces
// 3. Component function
//    - Hooks (theme, stores, queries, state)
//    - Derived state
//    - Event handlers
//    - Effects
//    - Early returns
//    - Render
// 4. Styles (StyleSheet.create at bottom)
```

## 🔄 State Management

### Global State - Zustand

```typescript
// Global state - Zustand
const user = useAuthStore((state) => state.user)
const signOut = useAuthStore((state) => state.signOut)
```

### Server State - React Query

```typescript
// Server state - React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
})
```

### Local State - useState

```typescript
// Local state - Use useState
const [isOpen, setIsOpen] = useState(false)
```

## 📱 Screen Templates

**Always use screen layout templates for consistency:**

### Auth Screens

```typescript
// Auth screens (Login, Register, etc.)
// Both patterns work - codebase uses direct import for clarity
import { AuthScreenLayout } from "@/components/layouts/AuthScreenLayout"
// Alternative: Also works via index.ts export
// import { AuthScreenLayout } from "@/components"

export const LoginScreen = () => (
  <AuthScreenLayout
    title="Welcome Back"
    subtitle="Sign in to continue"
    showCloseButton
    onClose={() => navigation.goBack()}
  >
    {/* Form content */}
  </AuthScreenLayout>
)
```

### Onboarding Screens

```typescript
// Onboarding screens
// Both patterns work - codebase uses direct import for clarity
import { OnboardingScreenLayout } from "@/components/layouts/OnboardingScreenLayout"
// Alternative: Also works via index.ts export
// import { OnboardingScreenLayout } from "@/components"

export const OnboardingScreen = () => (
  <OnboardingScreenLayout
    currentStep={0}
    totalSteps={3}
    headerIcon="👋"
    title="Welcome!"
  >
    {/* Content */}
  </OnboardingScreenLayout>
)
```

## 🚨 Common Mistakes

```typescript
// ❌ DON'T: Use Expo Router
import { useRouter } from 'expo-router'

// ✅ DO: Use React Navigation
import { useNavigation } from '@react-navigation/native'

// ❌ DON'T: Use useEffect for data fetching
useEffect(() => { fetch('/api/data') }, [])

// ✅ DO: Use React Query
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData })

// ❌ DON'T: Use Context API for global state
const UserContext = createContext()

// ✅ DO: Use Zustand
const useAuthStore = create((set) => ({ ... }))
```

## 📚 Related Files

- **App Context**: `apps/app/vibe/CONTEXT.md` (app features & architecture)
- **Screen Templates**: `apps/app/vibe/SCREEN_TEMPLATES.md` (detailed templates)
- **Style Guide**: `apps/app/vibe/STYLE_GUIDE.md` (code patterns)
- **AI Context**: `AI_CONTEXT.md` (technology stack overview)





