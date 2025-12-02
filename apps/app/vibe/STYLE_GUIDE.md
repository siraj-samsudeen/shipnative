# Style Guide

## Code Style

### General Principles

1. **Functional Components Only** - No class components
2. **TypeScript Strict Mode** - No `any` types
3. **Explicit Over Implicit** - Clear, readable code over clever tricks
4. **Composition Over Inheritance** - Build with small, reusable pieces
5. **Immutability** - Don't mutate state directly

### File Naming

```
✅ DO THIS
UserProfile.tsx          # Components: PascalCase
useAuth.ts               # Hooks: camelCase with 'use' prefix
authStore.ts             # Stores: camelCase with 'Store' suffix
formatDate.ts            # Utils: camelCase
user.types.ts            # Types: camelCase with '.types' suffix

❌ DON'T DO THIS
user-profile.tsx         # No kebab-case
UserProfile.js           # Use .tsx for components
Auth.ts                  # Hooks must start with 'use'
```

### Import Order

Always organize imports in this order:

```typescript
// 1. React and React Native
import React, { useState, useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'

// 3. Stores and hooks
import { useAuthStore } from '@/stores/authStore'
import { useUser } from '@/hooks/queries/useUser'

// 4. Components
import { Button, Card } from '@/components'

// 5. Utils and types
import { formatDate } from '@/utils/formatDate'
import type { User } from '@/types/user.types'
```

### Component Structure

```typescript
// 1. Imports
import React from 'react'
import { View } from 'react-native'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import { useAuthStore } from '@/stores/authStore'
import { Button, Text } from '@/components'

// 2. Types/Interfaces
interface ProfileScreenProps {
  userId: string
}

// 3. Component
export const ProfileScreen = ({ userId }: ProfileScreenProps) => {
  // 3a. Hooks (theme, stores, queries, state)
  const { theme } = useUnistyles()
  const user = useAuthStore((state) => state.user)
  const { data, isLoading } = useUser(userId)
  const [isEditing, setIsEditing] = useState(false)
  
  // 3b. Derived state
  const displayName = data?.name || user?.email || 'Anonymous'
  
  // 3c. Event handlers
  const handleEdit = () => {
    setIsEditing(true)
  }
  
  const handleSave = async () => {
    // Save logic
    setIsEditing(false)
  }
  
  // 3d. Effects
  useEffect(() => {
    // Side effects
  }, [])
  
  // 3e. Early returns
  if (isLoading) {
    return <LoadingState />
  }
  
  if (!data) {
    return <ErrorState />
  }
  
  // 3f. Render
  return (
    <View style={styles.container}>
      <Text preset="heading">{displayName}</Text>
      <Button onPress={handleEdit}>Edit Profile</Button>
    </View>
  )
}

// 4. Styles (always at bottom)
const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
}))

// 5. Sub-components (if small and only used here)
const LoadingState = () => {
  const styles = StyleSheet.create((theme) => ({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }))
  
  return (
    <View style={styles.container}>
      <Text>Loading...</Text>
    </View>
  )
}
```

## Unistyles Patterns

### Basic Styling

```typescript
import { StyleSheet } from 'react-native-unistyles'

// ✅ DO THIS - StyleSheet with theme function
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
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
}))

// Usage
<View style={styles.container}>
  <Text style={styles.title}>Hello</Text>
  <View style={styles.card}>...</View>
</View>
```

### Using Theme in Components

```typescript
import { useUnistyles } from 'react-native-unistyles'

const MyComponent = () => {
  const { theme } = useUnistyles()
  
  return (
    <View>
      {/* Use theme for dynamic values */}
      <Ionicons 
        name="heart" 
        size={24} 
        color={theme.colors.error} 
      />
    </View>
  )
}
```

### Web Scrolling Pattern

**CRITICAL**: All ScrollView components must include web scrolling support for proper mouse wheel scrolling.

```typescript
import { Platform } from 'react-native'

// ✅ DO THIS - Always add overflowY for web scrolling
const styles = StyleSheet.create((theme) => ({
  scrollView: {
    flex: 1,
    // Enable mouse wheel scrolling on web
    ...(Platform.OS === 'web' && {
      overflowY: 'auto' as unknown as 'scroll',
    }),
  },
}))

// ❌ DON'T DO THIS - Missing web scrolling support
const styles = StyleSheet.create((theme) => ({
  scrollView: {
    flex: 1, // This won't scroll on web!
  },
}))
```

**Why**: React Native's ScrollView on web requires explicit `overflowY: 'auto'` to enable mouse wheel scrolling. Without this, users cannot scroll with mouse wheel or trackpad on web.

**Template Pattern**: Use this pattern for ALL ScrollView styles:
```typescript
scrollView: {
  flex: 1,
  // Enable mouse wheel scrolling on web
  ...(Platform.OS === 'web' && {
    overflowY: 'auto' as unknown as 'scroll',
  }),
},
```

**Alternative**: Use the `Container` component with `preset="scroll"` which includes this fix automatically.

### Variants

```typescript
// ✅ DO THIS - Define variants for component states
const styles = StyleSheet.create((theme) => ({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
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
        sm: {
          height: theme.sizes.button.sm,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.md,
        },
        md: {
          height: theme.sizes.button.md,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.lg,
        },
        lg: {
          height: theme.sizes.button.lg,
          paddingHorizontal: theme.spacing.xl,
          borderRadius: theme.radius.lg,
        },
      },
    },
  },
}))

// In component - apply variants
const Button = ({ variant = 'filled', size = 'md' }) => {
  styles.useVariants({ variant, size })
  
  return (
    <Pressable style={styles.button}>
      ...
    </Pressable>
  )
}
```

### Theme Values Reference

```typescript
// Colors (semantic)
theme.colors.primary          // Primary action color
theme.colors.secondary        // Secondary backgrounds
theme.colors.background       // Main background
theme.colors.foreground       // Main text color
theme.colors.card             // Card backgrounds
theme.colors.border           // Border color
theme.colors.error            // Error states
theme.colors.success          // Success states
theme.colors.warning          // Warning states

// Typography
theme.typography.fonts.regular    // Regular font
theme.typography.fonts.medium     // Medium weight
theme.typography.fonts.semiBold   // Semi-bold
theme.typography.fonts.bold       // Bold weight
theme.typography.sizes.xs         // 12px
theme.typography.sizes.sm         // 14px
theme.typography.sizes.base       // 16px
theme.typography.sizes.lg         // 18px
theme.typography.sizes.xl         // 20px
theme.typography.sizes['2xl']     // 24px
theme.typography.sizes['3xl']     // 30px

// Spacing (8px grid)
theme.spacing.xxs    // 4px
theme.spacing.xs     // 8px
theme.spacing.sm     // 12px
theme.spacing.md     // 16px
theme.spacing.lg     // 24px
theme.spacing.xl     // 32px
theme.spacing['2xl'] // 40px

// Border Radius
theme.radius.sm      // 8px
theme.radius.md      // 12px
theme.radius.lg      // 16px
theme.radius.xl      // 20px
theme.radius.full    // 9999px (pill/circle)

// Shadows
theme.shadows.sm     // Small elevation
theme.shadows.md     // Medium elevation
theme.shadows.lg     // Large elevation
theme.shadows.xl     // Extra large elevation
```

### Layout Patterns

```typescript
// ✅ Flexbox patterns
const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  column: {
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}))
```

## Screen Templates

**Always use screen layout templates for consistency!** See [SCREEN_TEMPLATES.md](./SCREEN_TEMPLATES.md) for full documentation.

### Quick Reference

| Screen Type | Template | Import |
|-------------|----------|--------|
| Login, Register, ForgotPassword | `AuthScreenLayout` | `@/components` |
| Welcome, Get Started | `AuthScreenLayout` | `@/components` |
| Onboarding steps | `OnboardingScreenLayout` | `@/components` |

### Auth Screen Example

```typescript
import { AuthScreenLayout } from "@/components"

export const LoginScreen = () => {
  return (
    <AuthScreenLayout
      title="Welcome Back"
      subtitle="Sign in to continue"
      showCloseButton
      onClose={() => navigation.goBack()}
    >
      {/* Form content */}
      <View style={styles.inputContainer}>
        <TextField label="Email" {...props} />
      </View>
      <TouchableOpacity style={styles.primaryButton}>
        <Text>Sign In</Text>
      </TouchableOpacity>
    </AuthScreenLayout>
  )
}
```

### Onboarding Screen Example

```typescript
import { OnboardingScreenLayout } from "@/components"

export const OnboardingScreen = () => {
  return (
    <OnboardingScreenLayout
      currentStep={0}
      totalSteps={3}
      headerIcon="👋"
      title="Welcome!"
      subtitle="Let's get started"
    >
      <TouchableOpacity style={styles.primaryButton}>
        <Text>Continue</Text>
      </TouchableOpacity>
    </OnboardingScreenLayout>
  )
}
```

### Standard Button Styles

All screens should use these consistent button styles:

```typescript
const styles = StyleSheet.create((theme) => ({
  // Primary action button
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    ...theme.shadows.md,
  },
  primaryButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.sizes.lg,
  },
  
  // Secondary button
  secondaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  secondaryButtonText: {
    color: theme.colors.secondaryForeground,
    fontSize: theme.typography.sizes.lg,
  },
  
  // Text/link button
  linkButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
}))
```

## State Management Patterns

### Zustand Stores

```typescript
// ✅ DO THIS - Simple, focused stores
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      
      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (error) throw error
        
        set({ user: data.user, isAuthenticated: true })
      },
      
      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, isAuthenticated: false })
      }
    }),
    { name: 'auth-storage' }
  )
)

// ✅ Usage in components - select only what you need
const user = useAuthStore((state) => state.user)
const signOut = useAuthStore((state) => state.signOut)
```

### React Query Hooks

```typescript
// ✅ DO THIS - Custom hooks for queries
export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

// ✅ DO THIS - Custom hooks for mutations
export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: ProfileData) => {
      const { data: updated, error } = await supabase
        .from('users')
        .update(data)
        .eq('id', data.id)
        .single()
      
      if (error) throw error
      return updated
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user', data.id] })
    }
  })
}
```

## Error Handling

```typescript
// ✅ DO THIS - Try-catch with user feedback
const handleSubmit = async () => {
  try {
    setLoading(true)
    await updateProfile(data)
    toast.success('Profile updated!')
    navigation.goBack()
  } catch (error) {
    console.error('Profile update failed:', error)
    toast.error('Failed to update profile. Please try again.')
  } finally {
    setLoading(false)
  }
}

// ✅ DO THIS - Graceful degradation
const { data, error, isLoading } = useUser(userId)

if (isLoading) {
  return <Spinner />
}

if (error) {
  return <ErrorState message="Failed to load user" onRetry={refetch} />
}

if (!data) {
  return <EmptyState message="User not found" />
}

return <UserProfile user={data} />
```

## Performance Patterns

```typescript
// ✅ DO THIS - Memoize expensive computations
const sortedUsers = useMemo(() => {
  return users.sort((a, b) => a.name.localeCompare(b.name))
}, [users])

// ✅ DO THIS - Memoize callbacks
const handlePress = useCallback(() => {
  navigation.navigate('Profile', { userId })
}, [userId])

// ✅ DO THIS - Memoize components
const UserCard = React.memo(({ user }: { user: User }) => {
  return (
    <Card>
      <Text>{user.name}</Text>
    </Card>
  )
})

// ✅ DO THIS - Use FlatList for long lists
<FlatList
  data={users}
  renderItem={({ item }) => <UserCard user={item} />}
  keyExtractor={(item) => item.id}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

## Accessibility

```typescript
// ✅ DO THIS - Add accessibility labels
<Pressable
  accessibilityLabel="Sign out"
  accessibilityRole="button"
  accessibilityHint="Signs you out of your account"
  onPress={signOut}
>
  <Text>Sign Out</Text>
</Pressable>

// ✅ DO THIS - Use semantic roles
<Text accessibilityRole="header">
  Welcome
</Text>
```

## Anti-Patterns to Avoid

```typescript
// ❌ DON'T DO THIS - Inline styles
<View style={{ flex: 1, padding: 16 }}>

// ❌ DON'T DO THIS - StyleSheet without theme
const styles = StyleSheet.create({
  container: { padding: 16 }  // Use theme.spacing.md instead
})

// ❌ DON'T DO THIS - Any types
const user: any = { ... }

// ❌ DON'T DO THIS - Mutating state
user.name = 'New Name'
setState(user)

// ❌ DON'T DO THIS - useEffect for data fetching
useEffect(() => {
  fetch('/api/user').then(...)
}, [])

// ❌ DON'T DO THIS - Magic numbers
<View style={{ padding: 16, marginTop: 24 }}>

// ✅ DO THIS instead - Use theme values
const styles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
  }
}))
```

## Git Commit Messages

```
✅ DO THIS
feat: add forgot password screen
fix: resolve login button not responding
refactor: migrate Button component to Unistyles
docs: update README with setup instructions
test: add tests for auth store
chore: update dependencies

❌ DON'T DO THIS
updated stuff
fix
WIP
asdf
```

## Code Review Checklist

Before submitting code, ensure:

- [ ] TypeScript has no errors
- [ ] All components support dark mode (via theme)
- [ ] **Screen templates are used** (AuthScreenLayout, OnboardingScreenLayout)
- [ ] Accessibility labels are added
- [ ] Error states are handled
- [ ] Loading states are shown
- [ ] Tests are written (if applicable)
- [ ] No console.logs left in code
- [ ] No commented-out code
- [ ] Imports are organized
- [ ] Code follows naming conventions
- [ ] Unistyles with theme is used (no inline styles)
- [ ] Theme values are used (no magic numbers)
- [ ] No hardcoded colors (use theme.colors.*)
- [ ] Consistent button styles used across screens
