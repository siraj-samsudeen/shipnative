import { FC, useState, useEffect } from "react"
import { Modal, View, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { translate } from "@/i18n/translate"
import { supabase } from "@/services/supabase"
import { useAuthStore } from "@/stores"
import { haptics } from "@/utils/haptics"

import { Button } from "./Button"
import { Text } from "./Text"
import { TextField } from "./TextField"

// =============================================================================
// TYPES
// =============================================================================

export interface EditProfileModalProps {
  visible: boolean
  onClose: () => void
}

// =============================================================================
// COMPONENT
// =============================================================================

export const EditProfileModal: FC<EditProfileModalProps> = ({ visible, onClose }) => {
  const { theme } = useUnistyles()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Initialize form with user data
  useEffect(() => {
    if (user?.user_metadata) {
      setFirstName(user.user_metadata.first_name || "")
      setLastName(user.user_metadata.last_name || "")
    }
  }, [user])

  const handleSave = async () => {
    setError("")
    setLoading(true)
    haptics.buttonPress()

    try {
      // Update user metadata
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
        },
      })

      if (updateError) throw updateError

      // Update profiles table
      if (user?.id) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          updated_at: new Date().toISOString(),
        })

        if (profileError) {
          console.warn("Profile table update failed:", profileError)
        }
      }

      // Update local user state
      if (data.user) {
        setUser(data.user)
      }

      haptics.success()
      onClose()
    } catch (err) {
      console.error("Profile update error:", err)
      setError(err instanceof Error ? err.message : translate("editProfileModal:errorGeneric"))
      haptics.error()
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    haptics.buttonPress()
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title} tx="editProfileModal:title" />
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.foreground} />
              </Pressable>
            </View>

            {/* Form */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.form}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <TextField
                labelTx="editProfileModal:firstNameLabel"
                placeholderTx="editProfileModal:firstNamePlaceholder"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!loading}
              />

              <TextField
                labelTx="editProfileModal:lastNameLabel"
                placeholderTx="editProfileModal:lastNamePlaceholder"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!loading}
                containerStyle={styles.lastNameField}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                tx="editProfileModal:cancelButton"
                variant="outlined"
                onPress={handleClose}
                disabled={loading}
                style={styles.cancelButton}
              />
              <Button
                tx="editProfileModal:saveButton"
                variant="filled"
                onPress={handleSave}
                loading={loading}
                disabled={loading || !firstName.trim() || !lastName.trim()}
                style={styles.saveButton}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
  },
  modal: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius["3xl"],
    overflow: "hidden",
    ...theme.shadows.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  title: {
    fontSize: theme.typography.sizes["2xl"],
    fontFamily: theme.typography.fonts.bold,
    color: theme.colors.foreground,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  scrollView: {
    maxHeight: 400,
  },
  form: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  lastNameField: {
    marginTop: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.regular,
    marginTop: theme.spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
}))
