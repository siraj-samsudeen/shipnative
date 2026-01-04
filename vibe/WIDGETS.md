# Widgets Guide

This guide explains how to use native iOS and Android widgets in your Shipnative app with Supabase integration.

## Quick Start

### Enable Widgets

Widgets are disabled by default. To enable them, add to your `.env` file (or run `yarn setup` and choose Widgets):

```bash
EXPO_PUBLIC_ENABLE_WIDGETS=true
# Optional: set your App Group for iOS widgets (yarn setup will ask)
APP_GROUP_IDENTIFIER=group.com.yourcompany.yourapp
```

### Install and Build

```bash
# Install dependencies (already included in package.json)
cd apps/app
yarn install

# Run prebuild to generate native code
yarn prebuild:clean

# Build and run (from apps/app directory)
yarn ios    # or yarn android

# Or from monorepo root:
# yarn app:ios  or  yarn app:android
```

## Overview

Shipnative includes preconfigured native widgets for both iOS and Android:

- **iOS Widgets** - Built with SwiftUI, supporting all widget sizes
- **Android Widgets** - Built with Kotlin, supporting all widget sizes
- **Supabase Integration** - Automatic data fetching with authentication
- **Easy Styling** - Theme-aware widgets that match your app design
- **Feature Flag** - Easily enable/disable widgets via configuration

## Widget Structure

Widgets are located in `app/widgets/`:

```
app/widgets/
├── ios/
│   └── ExampleWidget.swift      # iOS SwiftUI widget
├── android/
│   ├── ExampleWidget.kt         # Android Kotlin widget
│   ├── widget_info.xml          # Widget configuration
│   └── example_widget.xml       # Widget layout
├── README.md                     # Widget documentation
└── SECURITY.md                   # Security best practices
```

## Using Widgets in Your App

### Fetching Widget Data

Use the `useWidgetData` hook to fetch data for widgets:

```typescript
import { useWidgetData } from "@/hooks/useWidgetData"

function WidgetSettingsScreen() {
  const { data, loading, error, refetch } = useWidgetData({
    table: "profiles",
    select: "id, first_name, avatar_url",
    filters: { user_id: currentUserId },
    limit: 1,
    requireAuth: true,
    refreshInterval: 15 * 60 * 1000, // 15 minutes
  })

  if (loading) return <Spinner />
  if (error) return <Text>Error: {error.message}</Text>

  return (
    <View>
      <Text>Welcome {data?.first_name}</Text>
      <Button onPress={refetch} title="Refresh" />
    </View>
  )
}
```

### Widget Service

The widget service handles secure data fetching with caching:

```typescript
import { fetchWidgetData, getWidgetConfig } from "@/services/widgets"

// Fetch data
const { data, error } = await fetchWidgetData({
  table: "posts",
  select: "id, title, created_at",
  filters: { published: true },
  limit: 5,
  orderBy: { column: "created_at", ascending: false },
  requireAuth: false, // Public data
})

// Get widget configuration
const config = getWidgetConfig()
// { supabaseUrl, supabaseKey, isMock }
```

## Supabase Integration

### Sharing Session Tokens

Widgets need access to Supabase session tokens to fetch authenticated data. The app automatically shares tokens via:

- **iOS**: App Groups (UserDefaults)
- **Android**: SharedPreferences

### Setting Up App Groups (iOS)

1. Run `yarn setup` → enable Widgets → enter your App Group when prompted (saved as `APP_GROUP_IDENTIFIER` in `.env`)
2. In Xcode, select your app target
3. Go to "Signing & Capabilities"
4. Add "App Groups" capability
5. Ensure the group matches `APP_GROUP_IDENTIFIER` (default: `group.<bundleId>`)
6. The widget code derives the App Group automatically from the bundle ID if no override is set

### Data Fetching in Widgets

Widgets fetch data directly from Supabase using the REST API. See the example widgets for implementation details.

## Styling Widgets

### iOS Widget Styling

Widgets use SwiftUI with theme colors. Update colors in `ExampleWidget.swift` to match your app theme.

### Android Widget Styling

Widgets use XML layouts with theme colors. Update colors in `example_widget.xml` to match your app theme.

## Security Best Practices

### 1. Row Level Security (RLS)

Enable RLS policies in Supabase for widget-accessible tables:

```sql
-- Example: Allow widgets to read public posts
CREATE POLICY "Widgets can read public posts"
ON posts FOR SELECT
USING (published = true);
```

### 2. Token Management

- Store session tokens securely in App Groups/SharedPreferences
- Tokens are automatically refreshed by the main app
- Widgets use read-only access to tokens

### 3. Data Validation

Always validate data before displaying in widgets:

```typescript
import { validateWidgetData } from "@/services/widgets"

const isValid = validateWidgetData(data, (d) => {
  return d && typeof d.title === "string" && d.title.length > 0
})
```

### 4. Rate Limiting

Widget updates are rate-limited to prevent excessive API calls:

- Minimum 5 minutes between updates
- 15-minute cache duration
- Maximum 10 cached items

## Creating Custom Widgets

### iOS Widget

1. Create a new Swift file in `app/widgets/ios/`
2. Implement `TimelineProvider` protocol
3. Create SwiftUI view for widget content
4. Register widget in `ExampleWidget.swift`

### Android Widget

1. Create a new Kotlin file in `app/widgets/android/`
2. Extend `AppWidgetProvider`
3. Create XML layout in `res/layout/`
4. Register widget in `widget_info.xml`

## Troubleshooting

### Widget Not Showing

1. **Check feature flag**: Ensure `EXPO_PUBLIC_ENABLE_WIDGETS=true`
2. **Run prebuild**: Widgets require native code generation
3. **Check logs**: Look for widget-related errors in Xcode/Android Studio

### Data Not Loading

1. **Check Supabase config**: Verify URL and key are set
2. **Check session token**: Ensure user is authenticated
3. **Check RLS policies**: Widgets need appropriate permissions
4. **Check network**: Widgets need internet access

### Build Errors

1. **iOS**: Check App Group identifier matches in app and widget
2. **Android**: Check package name matches in widget files
3. **Missing files**: Ensure all widget files are in correct locations

## API Reference

### `useWidgetData` Hook

```typescript
useWidgetData<T>(options: UseWidgetDataOptions<T>): UseWidgetDataReturn<T>
```

**Options:**
- `table: string` - Supabase table name
- `select?: string` - Columns to select (default: "*")
- `filters?: Record<string, any>` - Filter conditions
- `limit?: number` - Maximum rows (default: 10)
- `orderBy?: { column: string; ascending?: boolean }` - Sort order
- `requireAuth?: boolean` - Require authentication (default: false)
- `cacheKey?: string` - Custom cache key
- `refreshInterval?: number` - Auto-refresh interval in ms
- `enabled?: boolean` - Enable/disable hook (default: true)

**Returns:**
- `data: T | null` - Fetched data
- `loading: boolean` - Loading state
- `error: Error | null` - Error if any
- `refetch: () => Promise<void>` - Manual refresh
- `clearCache: () => void` - Clear cache
- `config: WidgetConfig` - Widget configuration

### Widget Service

```typescript
fetchWidgetData<T>(options: FetchOptions): Promise<{ data: T | null; error: Error | null }>
getWidgetConfig(): WidgetConfig
clearWidgetCache(key?: string): void
validateWidgetData<T>(data: T | null, validator?: (data: T) => boolean): boolean
```

## Next Steps

- See example widgets in `app/widgets/ios/` and `app/widgets/android/`
- Read security guide in `app/widgets/SECURITY.md`
- Check mintlify docs for detailed examples





