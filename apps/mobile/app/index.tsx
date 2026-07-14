// Mobile app Expo Router entry — lives in the app/ directory as required by expo-router.
import { Redirect } from 'expo-router'

export default function Index() {
  return <Redirect href="/login" />
}
