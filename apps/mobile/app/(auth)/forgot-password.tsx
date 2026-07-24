/**
 * Forgot Password screen — sends reset link to user's email.
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { Link } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authApi } from '../../src/lib/auth'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/theme'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const validate = () => {
    if (!email.trim()) { setError('Email is required'); return false }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email'); return false }
    setError('')
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await authApi.forgotPassword({ email: email.trim().toLowerCase() })
      setSent(true)
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.backButton}>
              <Text style={styles.backText}>← Back to Login</Text>
            </TouchableOpacity>
          </Link>

          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🔑</Text>
          </View>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your registered email and we'll send you a reset link.
          </Text>

          {sent ? (
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successText}>
                If <Text style={styles.bold}>{email}</Text> is registered, a password reset link has been sent.
              </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity style={styles.backToLogin}>
                  <Text style={styles.backToLoginText}>Back to Login</Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            <View style={styles.card}>
              <Input
                label="Email Address"
                value={email}
                onChangeText={(t) => { setEmail(t); setError('') }}
                placeholder="you@example.com"
                keyboardType="email-address"
                textContentType="emailAddress"
                error={error}
                required
              />
              <Button
                title="Send Reset Link"
                onPress={handleSubmit}
                loading={loading}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  backButton: {
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.xs,
  },
  backText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  iconWrap: {
    marginBottom: Spacing.md,
  },
  icon: { fontSize: 40 },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.muted,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  successCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  successIcon: { fontSize: 48, marginBottom: Spacing.md },
  successTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  successText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  bold: { fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  backToLogin: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  backToLoginText: {
    color: Colors.white,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.base,
  },
})
