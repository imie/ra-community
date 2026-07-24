/**
 * Home screen — paginated announcements feed with pull-to-refresh and load more.
 */
import React from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAnnouncements } from '../../src/hooks/useAnnouncements'
import { AnnouncementCard } from '../../src/components/announcements/AnnouncementCard'
import { Colors, FontSize, FontWeight, Spacing } from '../../src/theme'
import type { AnnouncementResponse } from '../../src/types'

export default function HomeScreen() {
  const { announcements, loading, refreshing, error, hasMore, refresh, loadMore } =
    useAnnouncements()

  const renderItem = ({ item }: { item: AnnouncementResponse }) => (
    <AnnouncementCard
      announcement={item}
      onPress={() => router.push(`/announcement/${item.id}`)}
    />
  )

  const renderFooter = () => {
    if (!loading || announcements.length === 0) return null
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    )
  }

  const renderEmpty = () => {
    if (loading) return null
    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Could not load announcements</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
        </View>
      )
    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyTitle}>No announcements yet</Text>
        <Text style={styles.emptySubtitle}>Check back later for community updates.</Text>
      </View>
    )
  }

  if (loading && announcements.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading announcements…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>
              {announcements.length > 0
                ? `${announcements.length} announcement${announcements.length !== 1 ? 's' : ''}`
                : ''}
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  listHeader: {
    marginBottom: Spacing.sm,
  },
  listHeaderText: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginTop: Spacing.sm,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
})
