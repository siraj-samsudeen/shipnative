# Widget Security Guide

This document outlines security best practices for widgets in ShipNative.

## Overview

Widgets run in a separate process from the main app and have limited access to app data. This guide covers how to securely share data between the app and widgets.

## Token Management

### iOS (App Groups)

Session tokens are shared via App Groups using UserDefaults:

```swift
let userDefaults = UserDefaults(suiteName: "group.com.yourcompany.yourapp")
userDefaults?.set(sessionToken, forKey: "supabase_session_token")
```

**Security considerations:**
- App Groups are sandboxed and only accessible by your app and its extensions
- Tokens are stored in the app's keychain when possible
- Use read-only access in widgets

### Android (SharedPreferences)

Session tokens are shared via SharedPreferences:

```kotlin
val prefs = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE)
prefs.edit().putString("supabase_session_token", sessionToken).apply()
```

**Security considerations:**
- SharedPreferences are private to your app
- Consider encrypting sensitive tokens
- Use read-only access in widgets

## Row Level Security (RLS)

Enable RLS policies in Supabase for widget-accessible tables:

```sql
-- Example: Allow widgets to read public posts
CREATE POLICY "Widgets can read public posts"
ON posts FOR SELECT
USING (published = true);

-- Example: Allow widgets to read user's own profile
CREATE POLICY "Widgets can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);
```

**Best practices:**
- Use RLS to restrict data access
- Only expose necessary data to widgets
- Validate user permissions server-side

## Data Validation

Always validate data before displaying in widgets:

```typescript
import { validateWidgetData } from "@/services/widgets"

const isValid = validateWidgetData(data, (d) => {
  return d && typeof d.title === "string" && d.title.length > 0
})
```

**Validation rules:**
- Check data types
- Validate string lengths
- Sanitize user input
- Handle null/undefined values

## Rate Limiting

Widget updates are rate-limited to prevent excessive API calls:

- **Minimum update interval**: 5 minutes
- **Cache duration**: 15 minutes
- **Maximum cache size**: 10 items

**Implementation:**
- Widget service enforces rate limits
- Cache prevents redundant requests
- Errors are handled gracefully

## Network Security

### HTTPS Only

All Supabase API calls use HTTPS:

```swift
// iOS - Use HTTPS URLs only
let url = URL(string: "https://your-project.supabase.co/rest/v1/posts")!
```

```kotlin
// Android - Use HTTPS URLs only
val url = "https://your-project.supabase.co/rest/v1/posts"
```

### Certificate Pinning (Optional)

For additional security, consider certificate pinning:

- iOS: Use `URLSession` with certificate pinning
- Android: Use `OkHttp` with certificate pinning

## Error Handling

Handle errors gracefully in widgets:

```swift
// iOS
if let error = entry.error {
    Text(error)
        .foregroundColor(.red)
        .font(.caption)
}
```

```kotlin
// Android
if (error != null) {
    views.setTextViewText(R.id.widget_error, error)
    views.setViewVisibility(R.id.widget_error, View.VISIBLE)
}
```

**Error handling:**
- Don't expose sensitive error messages
- Log errors for debugging
- Show user-friendly messages

## Privacy

### Data Minimization

Only fetch and display necessary data:

```typescript
// ✅ Good - Only fetch needed fields
const { data } = await fetchWidgetData({
  table: "profiles",
  select: "id, first_name", // Only needed fields
  limit: 1,
})

// ❌ Bad - Fetching all fields
const { data } = await fetchWidgetData({
  table: "profiles",
  select: "*", // All fields
  limit: 1,
})
```

### User Consent

Respect user privacy preferences:

- Only fetch data if user has enabled widgets
- Allow users to disable widgets
- Clear data when user logs out

## Best Practices Summary

1. **Use RLS policies** to restrict data access
2. **Validate all data** before displaying
3. **Rate limit** widget updates
4. **Use HTTPS** for all API calls
5. **Minimize data** fetched by widgets
6. **Handle errors** gracefully
7. **Clear sensitive data** on logout
8. **Test security** regularly

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. Do not open a public issue
2. Contact the maintainers directly
3. Provide detailed information about the vulnerability
4. Allow time for a fix before disclosure

