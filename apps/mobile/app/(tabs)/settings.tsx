/**
 * Settings screen — account info, app version, logout.
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/authStore'
import { Button } from '../../src/components/ui/Button'
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/theme'

interface SettingRowProps {
  emoji: string
  label: string
  value?: string
  onPress?: () => void
  danger?: boolean
}

function SettingRow({ emoji, label, value, onPress, danger }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && { color: Colors.error }]}>{label}</Text>
        {value && <Text style={styles.rowValue}>{value}</Text>}
      </View>
      {onPress && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  )
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true)
            await logout()
            router.replace('/(auth)/login')
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Account section */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <View style={styles.card}>
          <SettingRow emoji="📧" label="Email" value={user?.email ?? '—'} />
          <SettingRow
            emoji="🔒"
            label="Account Status"
            value={user?.is_active ? 'Active' : 'Pending Activation'}
          />
          <SettingRow
            emoji="✅"
            label="Verification"
            value={user?.is_verified ? 'Verified' : 'Not Verified'}
          />
          <SettingRow
            emoji="🧑‍💼"
            label="Role"
            value={user?.role === 'admin' ? 'Administrator' : 'Resident'}
          />
        </View>

        {/* App section */}
        <Text style={styles.sectionHeader}>APP & PRIVACY</Text>
        <View style={styles.card}>
          <SettingRow emoji="📱" label="App Version" value="1.0.0" />
          <SettingRow emoji="🌐" label="API Environment" value="RA Community API" />
          <SettingRow
            emoji="📜"
            label="Privacy Policy"
            onPress={() => router.push('/privacy-policy')}
          />
        </View>

        {/* Danger zone */}
        <Text style={styles.sectionHeader}>ACCOUNT MANAGEMENT</Text>
        <View style={styles.card}>
          <SettingRow
            emoji="⚠️"
            label="Delete My Account"
            danger
            onPress={() => router.push('/delete-account')}
          />
        </View>

        <Text style={styles.sectionHeader}>SESSION</Text>
        <View style={styles.card}>
          <Button
            title={loggingOut ? 'Signing out…' : '🚪  Sign Out'}
            variant="danger"
            onPress={handleLogout}
            loading={loggingOut}
          />
        </View>

        <Text style={styles.footer}>
          RA Community Management{'\n'}
          For residents of Taman Aman Serenia
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.muted,
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    padding: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowEmoji: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  rowValue: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: Colors.muted,
  },
  footer: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.muted,
    lineHeight: 18,
    marginVertical: Spacing.xl,
  },
})
