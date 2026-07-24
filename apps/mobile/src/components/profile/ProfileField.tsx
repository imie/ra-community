/**
 * Profile field row — shows label and value (read-only or editable via Input).
 */
import React from 'react'
import { View, Text, StyleSheet, type ViewStyle } from 'react-native'
import { Input } from '../ui/Input'
import { Colors, FontSize, FontWeight, Spacing } from '../../theme'

interface ProfileFieldProps {
  label: string
  value?: string | number | null
  editable?: boolean
  onChangeText?: (text: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
  secureTextEntry?: boolean
  style?: ViewStyle
  error?: string
}

export function ProfileField({
  label,
  value,
  editable = false,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry,
  style,
  error,
}: ProfileFieldProps) {
  if (editable) {
    return (
      <Input
        label={label}
        value={value != null ? String(value) : ''}
        onChangeText={onChangeText}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        containerStyle={style}
        error={error}
      />
    )
  }

  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, !value && styles.empty]}>
        {value != null && value !== '' ? String(value) : '—'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  value: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  empty: {
    color: Colors.muted,
  },
})
