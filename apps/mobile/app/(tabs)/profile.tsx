/**
 * Profile screen — view and edit resident profile in 3 tabbed sections.
 * Sections: Personal | Address | Employment
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useProfile } from '../../src/hooks/useProfile'
import { ProfileField } from '../../src/components/profile/ProfileField'
import { Button } from '../../src/components/ui/Button'
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/theme'
import type { UserProfileUpdate, UserSex, UserRace, MaritalStatus, ResidentType } from '../../src/types'

type Tab = 'personal' | 'address' | 'employment'

export default function ProfileScreen() {
  const { user, updating, update } = useProfile()
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('personal')

  // Local form state (pre-filled from user)
  const [form, setForm] = useState<UserProfileUpdate>({
    full_name: user?.full_name ?? '',
    phone_number: user?.phone_number ?? '',
    ic_number: user?.ic_number ?? '',
    passport_number: user?.passport_number ?? '',
    date_of_birth: user?.date_of_birth ?? '',
    place_of_birth: user?.place_of_birth ?? '',
    sex: user?.sex as UserSex | undefined,
    race: user?.race as UserRace | undefined,
    marital_status: user?.marital_status as MaritalStatus | undefined,
    num_dependents: user?.num_dependents ?? undefined,
    taman_name: user?.taman_name ?? '',
    house_number: user?.house_number ?? '',
    jalan_aman_serenia: user?.jalan_aman_serenia ?? '',
    job_title: user?.job_title ?? '',
    employer_name: user?.employer_name ?? '',
    employer_address: user?.employer_address ?? '',
    employer_phone: user?.employer_phone ?? '',
    resident_type: user?.resident_type as ResidentType | undefined,
  })

  const set = (key: keyof UserProfileUpdate) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val || undefined }))

  const handleSave = async () => {
    try {
      await update(form)
      setEditing(false)
      Alert.alert('Success', 'Profile updated successfully.')
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.')
    }
  }

  const handleCancel = () => {
    // Reset to saved values
    setForm({
      full_name: user?.full_name ?? '',
      phone_number: user?.phone_number ?? '',
      ic_number: user?.ic_number ?? '',
      passport_number: user?.passport_number ?? '',
      date_of_birth: user?.date_of_birth ?? '',
      place_of_birth: user?.place_of_birth ?? '',
      sex: user?.sex as UserSex | undefined,
      race: user?.race as UserRace | undefined,
      marital_status: user?.marital_status as MaritalStatus | undefined,
      num_dependents: user?.num_dependents ?? undefined,
      taman_name: user?.taman_name ?? '',
      house_number: user?.house_number ?? '',
      jalan_aman_serenia: user?.jalan_aman_serenia ?? '',
      job_title: user?.job_title ?? '',
      employer_name: user?.employer_name ?? '',
      employer_address: user?.employer_address ?? '',
      employer_phone: user?.employer_phone ?? '',
      resident_type: user?.resident_type as ResidentType | undefined,
    })
    setEditing(false)
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'personal', label: 'Personal', emoji: '👤' },
    { key: 'address', label: 'Address', emoji: '🏠' },
    { key: 'employment', label: 'Employment', emoji: '💼' },
  ]

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User banner */}
        <View style={styles.banner}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.name}>{user.full_name}</Text>
          <Text style={styles.email}>{user.email}</Text>

          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: Colors.primary + '18' }]}>
              <Text style={[styles.badgeText, { color: Colors.primary }]}>
                {user.role === 'admin' ? '🛡️ Admin' : '🏘️ Resident'}
              </Text>
            </View>
            <View style={[
              styles.badge,
              { backgroundColor: user.is_active ? Colors.success + '18' : Colors.warning + '18' }
            ]}>
              <Text style={[
                styles.badgeText,
                { color: user.is_active ? Colors.success : Colors.warning }
              ]}>
                {user.is_active ? '✅ Active' : '⏳ Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Edit / Save / Cancel buttons */}
        <View style={styles.actionRow}>
          {editing ? (
            <>
              <Button
                title="Save Changes"
                onPress={handleSave}
                loading={updating}
                fullWidth={false}
                style={styles.actionBtn}
              />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={handleCancel}
                fullWidth={false}
                style={styles.actionBtn}
              />
            </>
          ) : (
            <Button
              title="✏️  Edit Profile"
              variant="secondary"
              onPress={() => setEditing(true)}
              fullWidth={false}
              style={styles.editBtn}
            />
          )}
        </View>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>
                {t.emoji} {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.section}>
          {activeTab === 'personal' && (
            <>
              <ProfileField label="Full Name" value={form.full_name} editable={editing} onChangeText={set('full_name')} />
              <ProfileField label="Phone Number" value={form.phone_number} editable={editing} onChangeText={set('phone_number')} keyboardType="phone-pad" />
              <ProfileField label="IC Number" value={form.ic_number} editable={editing} onChangeText={set('ic_number')} />
              <ProfileField label="Passport Number" value={form.passport_number} editable={editing} onChangeText={set('passport_number')} />
              <ProfileField label="Date of Birth" value={form.date_of_birth} editable={editing} onChangeText={set('date_of_birth')} placeholder="YYYY-MM-DD" />
              <ProfileField label="Place of Birth" value={form.place_of_birth} editable={editing} onChangeText={set('place_of_birth')} />
              <ProfileField label="Sex" value={form.sex} editable={editing} onChangeText={set('sex') as (v: string) => void} />
              <ProfileField label="Race" value={form.race} editable={editing} onChangeText={set('race') as (v: string) => void} />
              <ProfileField label="Marital Status" value={form.marital_status} editable={editing} onChangeText={set('marital_status') as (v: string) => void} />
              <ProfileField label="No. of Dependents" value={form.num_dependents != null ? String(form.num_dependents) : ''} editable={editing} onChangeText={(v) => setForm((p) => ({ ...p, num_dependents: parseInt(v) || 0 }))} keyboardType="numeric" />
              <ProfileField label="Resident Type" value={form.resident_type} editable={editing} onChangeText={set('resident_type') as (v: string) => void} />
              {user.committee_title && (
                <ProfileField label="Committee Title" value={user.committee_title} />
              )}
            </>
          )}

          {activeTab === 'address' && (
            <>
              <ProfileField label="Taman Name" value={form.taman_name} editable={editing} onChangeText={set('taman_name')} />
              <ProfileField label="House Number" value={form.house_number} editable={editing} onChangeText={set('house_number')} />
              <ProfileField label="Street (Jalan)" value={form.jalan_aman_serenia} editable={editing} onChangeText={set('jalan_aman_serenia')} />
            </>
          )}

          {activeTab === 'employment' && (
            <>
              <ProfileField label="Job Title" value={form.job_title} editable={editing} onChangeText={set('job_title')} />
              <ProfileField label="Employer Name" value={form.employer_name} editable={editing} onChangeText={set('employer_name')} />
              <ProfileField label="Employer Address" value={form.employer_address} editable={editing} onChangeText={set('employer_address')} />
              <ProfileField label="Employer Phone" value={form.employer_phone} editable={editing} onChangeText={set('employer_phone')} keyboardType="phone-pad" />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  banner: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginBottom: Spacing.md,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionBtn: {
    flex: 1,
  },
  editBtn: {
    minWidth: 140,
  },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.muted,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  section: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
})
