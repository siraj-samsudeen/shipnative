# Styling Guide - Unistyles 3.0

> **Reference**: See `AI_CONTEXT.md` for technology stack overview. This file contains detailed styling patterns and examples.

## 🎨 Styling Patterns (Unistyles 3.0)

### Basic Pattern

```typescript
import { StyleSheet, useUnistyles } from 'react-native-unistyles'

const MyComponent = () => {
  const { theme } = useUnistyles()
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello</Text>
    </View>
  )
}

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
}))
```

### Variants Pattern

```typescript
const styles = StyleSheet.create((theme) => ({
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    variants: {
      variant: {
        filled: { backgroundColor: theme.colors.primary },
        outlined: { borderWidth: 1, borderColor: theme.colors.border },
      },
      size: {
        sm: { height: 36 },
        md: { height: 44 },
        lg: { height: 56 },
      },
    },
  },
}))

// Usage
styles.useVariants({ variant: 'filled', size: 'md' })
```

## 🎨 Theme Values Reference

**Single source of truth**: `app/theme/unistyles.ts` (relative to `apps/app/`)

### Colors (Semantic)

```typescript
theme.colors.primary          // Primary action
theme.colors.secondary        // Secondary backgrounds
theme.colors.background       // Main background
theme.colors.foreground       // Main text
theme.colors.card             // Card backgrounds
theme.colors.border           // Borders
theme.colors.error            // Error states
theme.colors.success          // Success states
```

### Spacing (8px Grid System)

```typescript
theme.spacing.xs              // 8px
theme.spacing.sm              // 12px
theme.spacing.md              // 16px
theme.spacing.lg              // 24px
theme.spacing.xl              // 32px
```

### Typography

```typescript
theme.typography.fonts.regular
theme.typography.fonts.bold
theme.typography.sizes.base   // 16px
theme.typography.sizes['2xl'] // 24px
```

### Border Radius

```typescript
theme.radius.sm               // 8px
theme.radius.md               // 12px
theme.radius.lg               // 16px
theme.radius.full             // 9999px
```

### Shadows

```typescript
theme.shadows.sm
theme.shadows.md
theme.shadows.lg
```

## 🌓 Dark Mode

Dark mode is automatic via Unistyles `adaptiveThemes`:
- Both light and dark themes defined in `/app/theme/unistyles.ts`
- Components automatically respond to system theme changes
- Use `theme.colors.*` - colors are semantic (foreground, background, etc.)

## ❌ Common Mistakes

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

// ❌ DON'T: Inline styles
<View style={{ padding: 16 }}>
```

## 📚 Related Files

- **Theme Definition**: `apps/app/app/theme/unistyles.ts`
- **Style Guide**: `apps/app/vibe/STYLE_GUIDE.md`
- **AI Context**: `AI_CONTEXT.md` (technology stack overview)





