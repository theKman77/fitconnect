import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
