/**
 * Register screen — full name, email, password, optional phone number.
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
import { Link, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authApi } from '../../src/lib/auth'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/theme'

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 2) e.fullName = 'Full name must be at least 2 characters'
    if (!email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email'
    if (!password) e.password = 'Password is required'
    else if (password.length < 8) e.password = 'Password must be at least 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleRegister = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await authApi.register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone_number: phone.trim() || undefined,
      })
      Alert.alert(
        'Registration Successful',
        'Your account has been created. Please wait for admin activation before logging in.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      )
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Registration failed. Please try again.'
      Alert.alert('Error', msg)
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
          {/* Back button */}
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.backButton}>
              <Text style={styles.backText}>← Back to Login</Text>
            </TouchableOpacity>
          </Link>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Register as a resident of RA Community
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Ahmad bin Abdullah"
              autoCapitalize="words"
              textContentType="name"
              error={errors.fullName}
              required
            />

            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              textContentType="emailAddress"
              error={errors.email}
              required
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              secureTextEntry
              textContentType="newPassword"
              error={errors.password}
              hint="Must be at least 8 characters"
              required
            />

            <Input
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+60 12-345 6789"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              hint="Optional — used for community notices"
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              style={styles.submitButton}
            />
          </View>

          {/* Notice */}
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              ℹ️ Your account will require admin approval before you can access the community portal.
            </Text>
          </View>
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
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  backText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.muted,
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
  submitButton: {
    marginTop: Spacing.xs,
  },
  notice: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.info + '12',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.info + '30',
  },
  noticeText: {
    fontSize: FontSize.sm,
    color: Colors.info,
    lineHeight: 20,
  },
})
