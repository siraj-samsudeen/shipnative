# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# SECURITY: Keep React Native bridge classes but obfuscate everything else
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.** { *; }
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Keep native modules
-keep class com.facebook.react.modules.** { *; }

# Obfuscate sensitive classes (auth, storage, etc.)
# These will be obfuscated unless explicitly needed by React Native
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Remove logging in release builds (security improvement)
-assumenosideeffects class * {
    public static *** log(...);
    public static *** Log(...);
}

# Add any project specific keep options here:
