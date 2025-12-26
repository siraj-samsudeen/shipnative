import { useState } from "react"
import { View, TouchableOpacity, DimensionValue } from "react-native"
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
  const signUp = useAuthStore((state) => state.signUp)
  const { signInWithGoogle, signInWithApple, loading: oauthLoading } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Touch state
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false)

  const passwordStrength = password ? analyzePasswordStrength(password) : null

  const emailValidation = emailTouched ? validateEmail(email) : { isValid: true, error: "" }
  const passwordValidation = passwordTouched
    ? validatePassword(password)
    : { isValid: true, error: "" }
  const confirmValidation = confirmPasswordTouched
    ? validatePasswordConfirmation(password, confirmPassword)
    : { isValid: true, error: "" }

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
      const formattedError = formatAuthError(signUpError)
      setError(formattedError)
    } else {
      // Signup successful
      const isEmailConfirmed = useAuthStore.getState().isEmailConfirmed

      if (!isEmailConfirmed) {
        // Email confirmation required - navigate to verification screen
        // AppNavigator will handle this automatically, but we can navigate explicitly
        // to ensure smooth UX
        navigation.navigate("EmailVerification" as never)
      }
      // If email is confirmed, AppNavigator will automatically navigate to Main/Onboarding
    }
  }

  const handleAppleAuth = async () => {
    try {
      setError("")
      const { error } = await signInWithApple()
      if (error) setError(formatAuthError(error as Error) || "Failed to sign in with Apple")
    } catch {
      setError("Failed to sign in with Apple")
    }
  }

  const handleGoogleAuth = async () => {
    try {
      setError("")
      const { error } = await signInWithGoogle()
      if (error) setError(formatAuthError(error as Error) || "Failed to sign in with Google")
    } catch {
      setError("Failed to sign in with Google")
    }
  }

  const getStrengthStyle = () => {
    if (!passwordStrength) return styles.strengthFillDefault
    switch (passwordStrength.label) {
      case "weak":
        return styles.strengthFillWeak
      case "fair":
        return styles.strengthFillFair
      case "good":
        return styles.strengthFillGood
      case "strong":
        return styles.strengthFillStrong
      default:
        return styles.strengthFillDefault
    }
  }

  const getStrengthTextStyle = () => {
    if (!passwordStrength) return styles.strengthTextDefault
    switch (passwordStrength.label) {
      case "weak":
        return styles.strengthTextWeak
      case "fair":
        return styles.strengthTextFair
      case "good":
        return styles.strengthTextGood
      case "strong":
        return styles.strengthTextStrong
      default:
        return styles.strengthTextDefault
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
          textContentType="oneTimeCode"
          returnKeyType="next"
          status={passwordTouched && !passwordValidation.isValid ? "error" : "default"}
          helper={
            passwordTouched && !passwordValidation.isValid ? passwordValidation.error : undefined
          }
        />

        {/* Password Strength Indicator */}
        {password && passwordStrength && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBar}>
              <View
                style={[
                  getStrengthStyle(),
                  {
                    width: getStrengthWidth(),
                  },
                ]}
              />
            </View>
            <Text size="xs" weight="semiBold" style={getStrengthTextStyle()}>
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
          status={confirmPasswordTouched && !confirmValidation.isValid ? "error" : "default"}
          helper={
            confirmPasswordTouched && !confirmValidation.isValid
              ? confirmValidation.error
              : undefined
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
  strengthFillDefault: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  strengthFillWeak: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: theme.colors.error,
  },
  strengthFillFair: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: theme.colors.warning,
  },
  strengthFillGood: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: theme.colors.success,
  },
  strengthFillStrong: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: theme.colors.palette.success600,
  },
  strengthTextDefault: {
    color: theme.colors.border,
  },
  strengthTextWeak: {
    color: theme.colors.error,
  },
  strengthTextFair: {
    color: theme.colors.warning,
  },
  strengthTextGood: {
    color: theme.colors.success,
  },
  strengthTextStrong: {
    color: theme.colors.palette.success600,
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
