/**
 * Account Deletion flow screen — mandatory for App Store Guideline 5.1.1(v) & Google Play Account Deletion Policy.
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/store/authStore'
import { Button } from '../src/components/ui/Button'
import { Input } from '../src/components/ui/Input'
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../src/theme'

export default function DeleteAccountScreen() {
  const { deleteAccount } = useAuthStore()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      Alert.alert('Invalid Confirmation', 'Please type DELETE in capital letters to confirm.')
      return
    }

    Alert.alert(
      'Final Confirmation',
      'Are you absolutely sure? Your personal data will be permanently anonymized and you will lose access to the portal.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            try {
              await deleteAccount()
              Alert.alert(
                'Account Deleted',
                'Your account and personal data have been removed.',
                [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
              )
            } catch (e: unknown) {
              const msg =
                (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                'Failed to delete account. Please try again.'
              Alert.alert('Error', msg)
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningTitle}>Delete Account & Data</Text>
            <Text style={styles.warningText}>
              This action is permanent and cannot be undone.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionHeader}>What happens when you delete your account:</Text>
            <Text style={styles.bullet}>• All your personal data (IC, phone, address, employment) will be permanently deleted/anonymized.</Text>
            <Text style={styles.bullet}>• Your login credentials will be revoked immediately.</Text>
            <Text style={styles.bullet}>• You will no longer receive community notices or announcements.</Text>

            <View style={styles.divider} />

            <Input
              label='Type "DELETE" to confirm'
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="DELETE"
              autoCapitalize="characters"
            />

            <Button
              title={loading ? 'Deleting Account...' : 'Delete My Account'}
              variant="danger"
              onPress={handleDelete}
              loading={loading}
              disabled={confirmText.trim().toUpperCase() !== 'DELETE'}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { padding: Spacing.lg },
  warningBox: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  warningIcon: { fontSize: 44, marginBottom: Spacing.xs },
  warningTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.error },
  warningText: { fontSize: FontSize.sm, color: Colors.muted, marginTop: 4 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  bullet: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
})
