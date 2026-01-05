import { useEffect, useState } from "react"
import { View, TouchableOpacity } from "react-native"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { StyleSheet } from "react-native-unistyles"
import { z } from "zod"

import { AuthScreenLayout } from "@/components/layouts/AuthScreenLayout"
import { Spinner } from "@/components/Spinner"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import type { AppStackParamList, AppStackScreenProps } from "@/navigators/navigationTypes"
import { resetPasswordSchema } from "@/schemas/authSchemas"
import { supabase } from "@/services/supabase"
import { useAuthStore } from "@/stores/auth"
import { formatAuthError } from "@/utils/formatAuthError"

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export const ResetPasswordScreen = () => {
  const navigation = useNavigation<AppStackScreenProps<"ResetPassword">["navigation"]>()
  const route = useRoute<RouteProp<AppStackParamList, "ResetPassword">>()
  const { t } = useTranslation()
  const [verifying, setVerifying] = useState(true)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const code = route.params?.code
  const token = route.params?.token

  useEffect(() => {
    let isMounted = true
    const verifyLink = async () => {
      setVerifying(true)
      setVerificationError(null)

      try {
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            throw error
          }
          if (data.session) {
            useAuthStore.getState().setSession(data.session)
          }
        } else if (token) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: "recovery",
          })
          if (error) {
            throw error
          }
          if (data.session) {
            useAuthStore.getState().setSession(data.session)
          }
        } else {
          throw new Error(t("resetPasswordScreen:missingToken"))
        }

        if (isMounted) {
          setVerifying(false)
        }
      } catch (error) {
        if (isMounted) {
          const resolvedError = error instanceof Error ? error : new Error(String(error))
          setVerificationError(formatAuthError(resolvedError))
          setVerifying(false)
        }
      }
    }

    void verifyLink()

    return () => {
      isMounted = false
    }
  }, [code, token, t])

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      // Add timeout to prevent hanging - Supabase updateUser can hang but still succeed
      const timeoutMs = 10000
      const updatePromise = supabase.auth.updateUser({ password: data.password })
      const timeoutPromise = new Promise<{ error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out. Please try again.")), timeoutMs),
      )

      const { error } = await Promise.race([updatePromise, timeoutPromise])
      if (error) {
        throw error
      }
      setSuccess(true)
    } catch (error) {
      const resolvedError = error instanceof Error ? error : new Error(String(error))
      setVerificationError(formatAuthError(resolvedError))
    }
  }

  const handleResetPassword = handleSubmit(onSubmit)

  const handleBackToLogin = () => {
    navigation.navigate("Login" as never)
  }

  if (verifying) {
    return (
      <AuthScreenLayout
        headerIcon="🔒"
        title={t("resetPasswordScreen:verifyingTitle")}
        subtitle={t("resetPasswordScreen:verifyingSubtitle")}
        scrollable={false}
      >
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      </AuthScreenLayout>
    )
  }

  if (success) {
    return (
      <AuthScreenLayout
        headerIcon="✅"
        title={t("resetPasswordScreen:successTitle")}
        subtitle={t("resetPasswordScreen:successSubtitle")}
        scrollable={false}
      >
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleBackToLogin}
          activeOpacity={0.8}
        >
          <Text
            weight="semiBold"
            style={styles.primaryButtonText}
            tx="resetPasswordScreen:backToLogin"
          />
        </TouchableOpacity>
      </AuthScreenLayout>
    )
  }

  return (
    <AuthScreenLayout
      headerIcon="🔐"
      title={t("resetPasswordScreen:title")}
      subtitle={t("resetPasswordScreen:subtitle")}
      showBackButton
      onBack={() => navigation.goBack()}
      scrollable={false}
    >
      {verificationError ? (
        <View style={styles.errorContainer}>
          <Text size="sm" color="error" style={styles.errorText}>
            {verificationError}
          </Text>
        </View>
      ) : null}

      <View style={styles.inputContainer}>
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              labelTx="resetPasswordScreen:passwordLabel"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholderTx="resetPasswordScreen:passwordPlaceholder"
              autoCapitalize="none"
              autoComplete="password"
              secureTextEntry
              returnKeyType="next"
              status={fieldState.error ? "error" : "default"}
              helper={fieldState.error?.message}
            />
          )}
        />
      </View>

      <View style={styles.inputContainer}>
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <TextField
              labelTx="resetPasswordScreen:confirmLabel"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholderTx="resetPasswordScreen:confirmPlaceholder"
              autoCapitalize="none"
              autoComplete="password"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleResetPassword}
              status={fieldState.error ? "error" : "default"}
              helper={fieldState.error?.message}
            />
          )}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, !isValid && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={!isValid}
        activeOpacity={0.8}
      >
        <Text weight="semiBold" style={styles.primaryButtonText} tx="resetPasswordScreen:submit" />
      </TouchableOpacity>
    </AuthScreenLayout>
  )
}

const styles = StyleSheet.create((theme) => ({
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.lg,
  },
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
}))
