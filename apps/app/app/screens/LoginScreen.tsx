import { useState } from "react"
import { View, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { Divider } from "@/components/Divider"
import { AuthScreenLayout } from "@/components/layouts/AuthScreenLayout"
import { Spinner } from "@/components/Spinner"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { features } from "@/config/features"
import { useAuth } from "@/hooks/useAuth"
import { useAuthStore } from "@/stores/auth"
import { formatAuthError } from "@/utils/formatAuthError"
import { validateEmail, validatePassword } from "@/utils/validation"

// =============================================================================
// COMPONENT
// =============================================================================

export const LoginScreen = () => {
  const { theme } = useUnistyles()
  const navigation = useNavigation()
  const signIn = useAuthStore((state) => state.signIn)
  const { signInWithGoogle, signInWithApple, loading: oauthLoading } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Touch state for validation
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const emailValidation = emailTouched ? validateEmail(email) : { isValid: true, error: "" }
  const passwordValidation = passwordTouched
    ? validatePassword(password)
    : { isValid: true, error: "" }

  const isFormValid = () => {
    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)
    return emailValidation.isValid && passwordValidation.isValid
  }

  const handleLogin = async () => {
    setEmailTouched(true)
    setPasswordTouched(true)

    if (!isFormValid()) return

    setLoading(true)
    setError("")
    const { error: signInError } = await signIn(email, password)
    setLoading(false)

    if (signInError) {
      const formattedError = formatAuthError(signInError)
      // Empty string means email not confirmed - AppNavigator will handle navigation
      if (formattedError === "") {
        setError("")
      } else {
        setError(formattedError)
      }
    }
  }

  const handleAppleAuth = async () => {
    try {
      setError("")
      const { error } = await signInWithApple()
      if (error) {
        setError(error.message || "Failed to sign in with Apple")
      }
    } catch {
      setError("Failed to sign in with Apple")
    }
  }

  const handleGoogleAuth = async () => {
    try {
      setError("")
      const { error } = await signInWithGoogle()
      if (error) {
        setError(error.message || "Failed to sign in with Google")
      }
    } catch {
      setError("Failed to sign in with Google")
    }
  }

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack()
      return
    }

    navigation.navigate("Welcome" as never)
  }

  return (
    <AuthScreenLayout
      title="Welcome Back"
      subtitle="Sign in to continue"
      showCloseButton
      onClose={handleClose}
      scrollable={false}
    >
      {/* Email Input */}
      <View style={styles.inputContainer}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          onBlur={() => setEmailTouched(true)}
          placeholder="Enter your email"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          status={emailTouched && !emailValidation.isValid ? "error" : "default"}
          helper={emailTouched && !emailValidation.isValid ? emailValidation.error : undefined}
        />
      </View>

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          onBlur={() => setPasswordTouched(true)}
          placeholder="Enter your password"
          autoCapitalize="none"
          autoComplete="password"
          autoCorrect={false}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          status={passwordTouched && !passwordValidation.isValid ? "error" : "default"}
          helper={
            passwordTouched && !passwordValidation.isValid ? passwordValidation.error : undefined
          }
        />
      </View>

      {/* Global Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text size="sm" color="error" style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      {/* Sign In Button */}
      <TouchableOpacity
        style={[styles.primaryButton, (loading || !isFormValid()) && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading || !isFormValid()}
        activeOpacity={0.8}
      >
        {loading ? (
          <Spinner size="sm" color="white" />
        ) : (
          <Text weight="semiBold" style={styles.primaryButtonText}>
            Sign In
          </Text>
        )}
      </TouchableOpacity>

      {/* Forgot Password Link */}
      <TouchableOpacity
        onPress={() => navigation.navigate("ForgotPassword" as never)}
        style={styles.forgotButton}
        activeOpacity={0.6}
      >
        <Text size="sm" color="secondary" weight="medium">
          Forgot Password?
        </Text>
      </TouchableOpacity>

      {/* Social Login Section */}
      {(features.enableGoogleAuth || features.enableAppleAuth) && (
        <>
          <Divider label="or continue with" style={styles.divider} />

          <View style={styles.socialRow}>
            {features.enableAppleAuth && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleAppleAuth}
                activeOpacity={0.8}
                disabled={oauthLoading}
              >
                <Ionicons name="logo-apple" size={24} color={theme.colors.foreground} />
                <Text weight="semiBold">Apple</Text>
              </TouchableOpacity>
            )}

            {features.enableGoogleAuth && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleAuth}
                activeOpacity={0.8}
                disabled={oauthLoading}
              >
                <Ionicons name="logo-google" size={24} color={theme.colors.foreground} />
                <Text weight="semiBold">Google</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* Sign Up Link */}
      <TouchableOpacity
        onPress={() => navigation.navigate("Register" as never)}
        style={styles.linkButton}
        activeOpacity={0.6}
      >
        <Text color="secondary">
          Don&apos;t have an account? <Text weight="semiBold">Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </AuthScreenLayout>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  errorContainer: {
    backgroundColor: theme.colors.errorBackground,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  errorText: {
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    ...theme.shadows.md,
  },
  primaryButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.sizes.lg,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  forgotButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  divider: {
    marginVertical: theme.spacing.lg,
  },
  socialRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
}))
