import { useState, useEffect } from "react"
import { View, TouchableOpacity } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { StyleSheet } from "react-native-unistyles"

import { useAuthStore } from "@/stores/authStore"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { AuthScreenLayout } from "@/components/layouts/AuthScreenLayout"
import { validateEmail } from "@/utils/validation"

// =============================================================================
// COMPONENT
// =============================================================================

export const ForgotPasswordScreen = () => {
  const navigation = useNavigation()
  const resetPassword = useAuthStore((state) => state.resetPassword)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Field-level errors
  const [emailError, setEmailError] = useState("")

  // Touch state for validation
  const [emailTouched, setEmailTouched] = useState(false)

  // Validate email on change
  useEffect(() => {
    if (emailTouched && email) {
      const validation = validateEmail(email)
      setEmailError(validation.isValid ? "" : validation.error || "")
    } else if (emailTouched && !email) {
      setEmailError("Email is required")
    }
  }, [email, emailTouched])

  const isFormValid = () => {
    const emailValidation = validateEmail(email)
    return emailValidation.isValid
  }

  const handleResetPassword = async () => {
    // Mark field as touched
    setEmailTouched(true)

    // Validate
    if (!isFormValid()) {
      return
    }

    setLoading(true)
    setError("")
    setSuccess(false)

    const { error: resetError } = await resetPassword(email)
    setLoading(false)

    if (resetError) {
      setError("An error occurred. Please try again.")
    } else {
      setSuccess(true)
    }
  }

  const handleBackToLogin = () => {
    navigation.navigate("Login" as never)
  }

  const handleEmailBlur = () => {
    setEmailTouched(true)
  }

  // Success State
  if (success) {
    return (
      <AuthScreenLayout
        headerIcon="✉️"
        title="Check Your Email"
        subtitle={`We've sent a password reset link to ${email}`}
      >
        <Text color="secondary" style={styles.successSubtext}>
          Click the link in the email to reset your password. If you don&apos;t see it, check your
          spam folder.
        </Text>

        {/* Back to Login Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleBackToLogin}
          activeOpacity={0.8}
        >
          <Text weight="semiBold" style={styles.primaryButtonText}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </AuthScreenLayout>
    )
  }

  // Default Form State
  return (
    <AuthScreenLayout
      headerIcon="🔑"
      title="Forgot Password?"
      subtitle="No worries! Enter your email and we'll send you reset instructions."
      showBackButton
      onBack={() => navigation.goBack()}
    >
      {/* Email Input */}
      <View style={styles.inputContainer}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          onBlur={handleEmailBlur}
          placeholder="Enter your email"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="done"
          onSubmitEditing={handleResetPassword}
          status={emailTouched && emailError ? "error" : "default"}
          helper={emailTouched && emailError ? emailError : undefined}
        />
      </View>

      {/* Global Error Message */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text size="sm" color="error" style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}

      {/* Reset Password Button */}
      <TouchableOpacity
        style={[styles.primaryButton, (loading || !isFormValid()) && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={loading || !isFormValid()}
        activeOpacity={0.8}
      >
        <Text weight="semiBold" style={styles.primaryButtonText}>
          {loading ? "Sending..." : "Send Reset Link"}
        </Text>
      </TouchableOpacity>

      {/* Back to Login Link */}
      <TouchableOpacity onPress={handleBackToLogin} style={styles.linkButton} activeOpacity={0.6}>
        <Text color="secondary">
          Remember your password? <Text weight="semiBold">Back to Login</Text>
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
  linkButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  successSubtext: {
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
}))
