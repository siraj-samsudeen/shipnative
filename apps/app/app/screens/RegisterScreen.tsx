import { useState, useEffect } from "react"
import { View, TouchableOpacity, DimensionValue } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { features } from "@/config/features"
import { useAuth } from "@/hooks/useAuth"
import { useAuthStore } from "@/stores/authStore"
import { Divider } from "@/components/Divider"
import { Spinner } from "@/components/Spinner"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { AuthScreenLayout } from "@/components/layouts/AuthScreenLayout"
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  analyzePasswordStrength,
} from "@/utils/validation"

// =============================================================================
// COMPONENT
// =============================================================================

export const RegisterScreen = () => {
  const { theme } = useUnistyles()
  const navigation = useNavigation()
  const { signUp } = useAuthStore((state) => ({
    signUp: state.signUp,
  }))
  const { signInWithGoogle, signInWithApple, loading: oauthLoading } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Field-level errors
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")

  // Touch state
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false)

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number
    label: string
  } | null>(null)

  // Validate email on change
  useEffect(() => {
    if (emailTouched && email) {
      const validation = validateEmail(email)
      setEmailError(validation.isValid ? "" : validation.error || "")
    } else if (emailTouched && !email) {
      setEmailError("Email is required")
    }
  }, [email, emailTouched])

  // Validate password and check strength
  useEffect(() => {
    if (password) {
      const strength = analyzePasswordStrength(password)
      setPasswordStrength({ score: strength.score, label: strength.label })
    } else {
      setPasswordStrength(null)
    }

    if (passwordTouched && password) {
      const validation = validatePassword(password)
      setPasswordError(validation.isValid ? "" : validation.error || "")
    } else if (passwordTouched && !password) {
      setPasswordError("Password is required")
    }
  }, [password, passwordTouched])

  // Validate confirm password
  useEffect(() => {
    if (confirmPasswordTouched && confirmPassword) {
      const validation = validatePasswordConfirmation(password, confirmPassword)
      setConfirmPasswordError(validation.isValid ? "" : validation.error || "")
    } else if (confirmPasswordTouched && !confirmPassword) {
      setConfirmPasswordError("Please confirm your password")
    }
  }, [confirmPassword, confirmPasswordTouched, password])

  const isFormValid = () => {
    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)
    const confirmValidation = validatePasswordConfirmation(password, confirmPassword)
    return emailValidation.isValid && passwordValidation.isValid && confirmValidation.isValid
  }

  const handleRegister = async () => {
    setEmailTouched(true)
    setPasswordTouched(true)
    setConfirmPasswordTouched(true)

    if (!isFormValid()) return

    setLoading(true)
    setError("")
    const { error: signUpError } = await signUp(email, password)
    setLoading(false)

    if (signUpError) {
      const errorMessage = signUpError.message
      if (errorMessage.toLowerCase().includes("already registered")) {
        setError("This email is already registered. Please sign in instead.")
      } else if (errorMessage.toLowerCase().includes("email")) {
        setError("Please enter a valid email address.")
      } else if (errorMessage.toLowerCase().includes("password")) {
        setError("Password does not meet requirements. Please try again.")
      } else {
        setError(errorMessage)
      }
    } else {
      const isAuthenticated = useAuthStore.getState().isAuthenticated
      if (!isAuthenticated) {
        ;(navigation as any).replace("Login")
      }
    }
  }

  const handleAppleAuth = async () => {
    try {
      setError("")
      const { error } = await signInWithApple()
      if (error) setError(error.message || "Failed to sign in with Apple")
    } catch {
      setError("Failed to sign in with Apple")
    }
  }

  const handleGoogleAuth = async () => {
    try {
      setError("")
      const { error } = await signInWithGoogle()
      if (error) setError(error.message || "Failed to sign in with Google")
    } catch {
      setError("Failed to sign in with Google")
    }
  }

  const getStrengthColor = () => {
    if (!passwordStrength) return theme.colors.border
    switch (passwordStrength.label) {
      case "weak":
        return theme.colors.error
      case "fair":
        return theme.colors.warning
      case "good":
        return theme.colors.success
      case "strong":
        return theme.colors.palette.success600
      default:
        return theme.colors.border
    }
  }

  const getStrengthWidth = (): DimensionValue => {
    if (!passwordStrength) return "0%"
    return `${(passwordStrength.score / 4) * 100}%` as DimensionValue
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
      title="Create Account"
      subtitle="Sign up to get started"
      showCloseButton
      onClose={handleClose}
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
          status={emailTouched && emailError ? "error" : "default"}
          helper={emailTouched && emailError ? emailError : undefined}
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
          textContentType="oneTimeCode"
          returnKeyType="next"
          status={passwordTouched && passwordError ? "error" : "default"}
          helper={passwordTouched && passwordError ? passwordError : undefined}
        />

        {/* Password Strength Indicator */}
        {password && passwordStrength && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBar}>
              <View
                style={[
                  styles.strengthFill,
                  {
                    width: getStrengthWidth(),
                    backgroundColor: getStrengthColor(),
                  },
                ]}
              />
            </View>
            <Text size="xs" weight="semiBold" style={{ color: getStrengthColor() }}>
              {passwordStrength.label.charAt(0).toUpperCase() + passwordStrength.label.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Confirm Password Input */}
      <View style={styles.inputContainer}>
        <TextField
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onBlur={() => setConfirmPasswordTouched(true)}
          placeholder="Confirm your password"
          autoCapitalize="none"
          autoComplete="password"
          autoCorrect={false}
          secureTextEntry
          textContentType="oneTimeCode"
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          status={confirmPasswordTouched && confirmPasswordError ? "error" : "default"}
          helper={confirmPasswordTouched && confirmPasswordError ? confirmPasswordError : undefined}
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

      {/* Sign Up Button */}
      <TouchableOpacity
        style={[styles.primaryButton, (loading || !isFormValid()) && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading || !isFormValid()}
        activeOpacity={0.8}
      >
        {loading ? (
          <Spinner size="sm" color="white" />
        ) : (
          <Text weight="semiBold" style={styles.primaryButtonText}>
            Sign Up
          </Text>
        )}
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

      {/* Login Link */}
      <TouchableOpacity
        onPress={() => navigation.navigate("Login" as never)}
        style={styles.linkButton}
        activeOpacity={0.6}
      >
        <Text color="secondary">
          Already have an account? <Text weight="semiBold">Log In</Text>
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
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
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
    marginBottom: theme.spacing.md,
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
