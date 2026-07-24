/**
 * Announcement detail screen — full content view.
 */
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { announcementsApi } from '../../src/lib/auth'
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/theme'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../src/constants'
import type { AnnouncementResponse } from '../../src/types'

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [announcement, setAnnouncement] = useState<AnnouncementResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    announcementsApi.get(id)
      .then(setAnnouncement)
      .catch((e) => setError(e?.response?.data?.detail ?? 'Failed to load announcement'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (error || !announcement) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error ?? 'Announcement not found'}</Text>
        </View>
      </SafeAreaView>
    )
  }

  const priorityColor = PRIORITY_COLORS[announcement.priority] ?? Colors.muted
  const priorityLabel = PRIORITY_LABELS[announcement.priority] ?? announcement.priority

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Priority + Date */}
        <View style={styles.meta}>
          <View style={[styles.badge, { backgroundColor: priorityColor + '18' }]}>
            <View style={[styles.dot, { backgroundColor: priorityColor }]} />
            <Text style={[styles.badgeText, { color: priorityColor }]}>
              {priorityLabel}
            </Text>
          </View>
          <Text style={styles.date}>{formatDate(announcement.created_at)}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{announcement.title}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Content */}
        <Text style={styles.content}>{announcement.content}</Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {formatDate(announcement.updated_at)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorIcon: { fontSize: 48, marginBottom: Spacing.md },
  errorText: {
    fontSize: FontSize.base,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  date: {
    fontSize: FontSize.xs,
    color: Colors.muted,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 28,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  content: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 26,
  },
  footer: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: FontSize.xs,
    color: Colors.muted,
  },
})
