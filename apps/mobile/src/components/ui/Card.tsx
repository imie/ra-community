import React from 'react'
import { ReactNode } from 'react'
import { View, StyleSheet, type ViewStyle } from 'react-native'
import { Colors, BorderRadius, Spacing, Shadow } from '../../theme'

interface CardProps {
  children: ReactNode
  style?: ViewStyle
  padding?: number
}

export function Card({ children, style, padding = Spacing.md }: CardProps) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
})
