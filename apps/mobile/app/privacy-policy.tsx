/**
 * Privacy Policy screen — required by Apple App Store Guideline 5.1.1 & Google Play User Data policy.
 */
import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, FontSize, FontWeight, Spacing } from '../src/theme'

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.effectiveDate}>Effective Date: July 24, 2026</Text>

        <View style={styles.section}>
          <Text style={styles.heading}>1. Overview</Text>
          <Text style={styles.paragraph}>
            RA Community ("we", "our", or "us") is dedicated to protecting the privacy of residents of Taman Aman Serenia. This Privacy Policy explains how your information is collected, used, and safeguarded when you use our mobile application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>2. Information We Collect</Text>
          <Text style={styles.paragraph}>
            To provide community management and Registrar of Societies (RoS) compliance services, we collect:
          </Text>
          <Text style={styles.bullet}>• Full Name, Email Address, and Phone Number</Text>
          <Text style={styles.bullet}>• Identification Card (IC) or Passport Number</Text>
          <Text style={styles.bullet}>• Date of Birth, Place of Birth, Sex, and Race</Text>
          <Text style={styles.bullet}>• Residential Address (Taman, House Number, Street)</Text>
          <Text style={styles.bullet}>• Employment details (Employer Name, Job Title, Address, Phone)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>3. How We Use Your Data</Text>
          <Text style={styles.paragraph}>
            Your data is used strictly for:
          </Text>
          <Text style={styles.bullet}>• Verifying resident residency and committee memberships</Text>
          <Text style={styles.bullet}>• Official submission to the Registrar of Societies (RoS) Malaysia</Text>
          <Text style={styles.bullet}>• Important community announcements and notices</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>4. Data Sharing & Security</Text>
          <Text style={styles.paragraph}>
            We do NOT sell, rent, or trade your personal information to third parties. Access to your personal details is restricted to authorized Resident Association administrators.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>5. Account Deletion & Data Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to delete your account and request complete anonymization of your personal data at any time via Settings &gt; Delete My Account within the app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>6. Contact Us</Text>
          <Text style={styles.paragraph}>
            For any privacy concerns or queries, please contact the Resident Association committee at support@racommunity.org.my.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4 },
  effectiveDate: { fontSize: FontSize.xs, color: Colors.muted, marginBottom: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  heading: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  paragraph: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xs },
  bullet: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginLeft: Spacing.sm },
})
