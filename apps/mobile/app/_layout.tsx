/**
 * Root layout — initializes auth state and routes to (auth) or (tabs) accordingly.
 */
import React, { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/store/authStore'
import { Colors } from '../src/theme'
import { View, ActivityIndicator } from 'react-native'

export default function RootLayout() {
  const { isInitialized, isLoading, user, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!isInitialized) return
    if (user) {
      router.replace('/(tabs)')
    } else {
      router.replace('/(auth)/login')
    }
  }, [isInitialized, user])

  if (!isInitialized || isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="announcement/[id]"
            options={{
              headerShown: true,
              title: 'Announcement',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: Colors.white },
              headerTintColor: Colors.primary,
            }}
          />
          <Stack.Screen
            name="privacy-policy"
            options={{
              headerShown: true,
              title: 'Privacy Policy',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: Colors.white },
              headerTintColor: Colors.primary,
            }}
          />
          <Stack.Screen
            name="delete-account"
            options={{
              headerShown: true,
              title: 'Delete Account',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: Colors.white },
              headerTintColor: Colors.primary,
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
