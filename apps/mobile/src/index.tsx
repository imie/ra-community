"""
Mobile app entry point (Expo Router).
This file is the root of the Expo Router file system.
"""
import { Redirect } from 'expo-router'

export default function Index() {
  return <Redirect href="/login" />
}
