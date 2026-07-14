// Mobile app root — Expo Router entry point.
// Expo Router looks for an `app/` directory; this file bootstraps the navigator.
import { Redirect } from 'expo-router'

export default function Index() {
  return <Redirect href="/login" />
}
