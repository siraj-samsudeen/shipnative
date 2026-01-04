import { useEffect, useState } from "react"
import { View, TouchableOpacity } from "react-native"
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import { StyleSheet } from "react-native-unistyles"

import { AuthScreenLayout } from "@/components/layouts/AuthScreenLayout"
import { Text } from "@/components/Text"
import type { AppStackParamList, AppStackScreenProps } from "@/navigators/navigationTypes"
import { LoadingScreen } from "@/screens/LoadingScreen"
import { supabase } from "@/services/supabase"
import { useAuthStore } from "@/stores/auth"
import { formatAuthError } from "@/utils/formatAuthError"
import { logger } from "@/utils/Logger"

export const AuthCallbackScreen = () => {
  const navigation = useNavigation<AppStackScreenProps<"AuthCallback">["navigation"]>()
  const route = useRoute<RouteProp<AppStackParamList, "AuthCallback">>()
  const { t } = useTranslation()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const code = route.params?.code
  const accessToken = route.params?.access_token
  const refreshToken = route.params?.refresh_token

  useEffect(() => {
    let isMounted = true

    const handleAuthCallback = async () => {
      try {
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          if (data.session) {
            useAuthStore.getState().setSession(data.session)
          }
          return
        }

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
          if (data.session) {
            useAuthStore.getState().setSession(data.session)
          }
          return
        }

        throw new Error(t("authCallbackScreen:invalidParams"))
      } catch (error) {
        const resolvedError = error instanceof Error ? error : new Error(String(error))
        logger.error("Auth callback failed", {}, resolvedError)
        if (isMounted) {
          setErrorMessage(formatAuthError(resolvedError))
        }
      }
    }

    void handleAuthCallback()

    return () => {
      isMounted = false
    }
  }, [code, accessToken, refreshToken])

  if (!errorMessage) {
    return (
      <LoadingScreen
        message={t("authCallbackScreen:loadingMessage")}
        status={t("authCallbackScreen:loadingStatus")}
      />
    )
  }

  return (
    <AuthScreenLayout
      headerIcon="⚠️"
      title={t("authCallbackScreen:errorTitle")}
      subtitle={errorMessage}
      scrollable={false}
    >
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Login" as never)}
          activeOpacity={0.8}
        >
          <Text
            weight="semiBold"
            style={styles.primaryButtonText}
            tx="authCallbackScreen:backToLogin"
          />
        </TouchableOpacity>
      </View>
    </AuthScreenLayout>
  )
}

const styles = StyleSheet.create((theme) => ({
  actions: {
    marginTop: theme.spacing.lg,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    ...theme.shadows.md,
  },
  primaryButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: theme.typography.sizes.lg,
  },
}))
