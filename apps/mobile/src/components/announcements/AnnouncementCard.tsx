/**
 * Announcement list item with priority badge, title, content preview, and date.
 */
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../theme'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../constants'
import type { AnnouncementResponse } from '../../types'

interface AnnouncementCardProps {
  announcement: AnnouncementResponse
  onPress: () => void
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function AnnouncementCard({ announcement, onPress }: AnnouncementCardProps) {
  const priorityColor = PRIORITY_COLORS[announcement.priority] ?? Colors.muted
  const priorityLabel = PRIORITY_LABELS[announcement.priority] ?? announcement.priority

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
      {/* Priority badge + Date row */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: priorityColor + '18' }]}>
          <View style={[styles.dot, { backgroundColor: priorityColor }]} />
          <Text style={[styles.badgeText, { color: priorityColor }]}>{priorityLabel}</Text>
        </View>
        <Text style={styles.date}>{formatDate(announcement.created_at)}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {announcement.title}
      </Text>

      {/* Content preview */}
      <Text style={styles.preview} numberOfLines={3}>
        {announcement.content}
      </Text>

      {/* Read more */}
      <Text style={styles.readMore}>Read more →</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    lineHeight: 22,
  },
  preview: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  readMore: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
})
