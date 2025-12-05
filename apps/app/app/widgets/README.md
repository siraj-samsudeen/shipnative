# Widgets Documentation

This directory contains native widget implementations for iOS and Android platforms.

## Structure

```
widgets/
├── ios/
│   └── ExampleWidget.swift      # iOS SwiftUI widget
├── android/
│   ├── ExampleWidget.kt         # Android Kotlin widget
│   ├── widget_info.xml          # Widget configuration
│   └── example_widget.xml       # Widget layout
├── README.md                     # This file
└── SECURITY.md                   # Security best practices
```

## Quick Start

1. Enable widgets by setting `EXPO_PUBLIC_ENABLE_WIDGETS=true` in `.env`
2. Run `yarn prebuild:clean` to generate native code
3. Build and run the app: `yarn ios` or `yarn android`
4. Add the widget to your home screen

## Supabase Integration

Widgets fetch data from Supabase using the REST API. Session tokens are shared between the app and widgets via:

- **iOS**: App Groups (UserDefaults)
- **Android**: SharedPreferences

See the example widgets for implementation details.

## Styling

### iOS

Update theme colors in `ExampleWidget.swift`:

```swift
private let primaryColor = Color(red: 0.2, green: 0.4, blue: 0.8)
private let backgroundColor = Color(red: 0.95, green: 0.95, blue: 0.97)
private let textColor = Color(red: 0.1, green: 0.1, blue: 0.1)
```

### Android

Update colors in `example_widget.xml`:

```xml
<TextView
    android:textColor="#1a1a1a"
    android:textSize="16sp" />
```

## Creating Custom Widgets

### iOS

1. Create a new Swift file in `ios/`
2. Implement `TimelineProvider` protocol
3. Create SwiftUI view
4. Register in widget configuration

### Android

1. Create a new Kotlin file in `android/`
2. Extend `AppWidgetProvider`
3. Create XML layout
4. Register in `widget_info.xml`

## Security

See `SECURITY.md` for security best practices, including:
- Row Level Security (RLS) policies
- Token management
- Data validation
- Rate limiting

## Troubleshooting

- **Widget not showing**: Check feature flag and run prebuild
- **Data not loading**: Verify Supabase config and RLS policies
- **Build errors**: Check App Group identifier (iOS) or package name (Android)

