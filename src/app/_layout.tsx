import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_500Medium } from '@expo-google-fonts/archivo/500Medium';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono/400Regular';
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono/700Bold';

import { AuthProvider } from '@/context/auth';
import { AccessibilityProvider } from '@/context/accessibility';
import { BookingProvider } from '@/context/booking';
import { LocaleProvider } from '@/context/locale';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <LocaleProvider>
          <AuthProvider>
            <AccessibilityProvider>
            <BookingProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(trainer)" />
              <Stack.Screen name="trainer/[id]" />
              <Stack.Screen name="booking/[trainerId]" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="booking/confirmation" options={{ gestureEnabled: false }} />
              <Stack.Screen name="session/[id]/track" />
              <Stack.Screen name="session/[id]/rate" options={{ presentation: 'modal' }} />
              <Stack.Screen name="trainer-session/[id]" />
              <Stack.Screen name="trainer-edit" />
              <Stack.Screen name="trainer-availability" />
              <Stack.Screen name="trainer-client/[clientId]" />
              <Stack.Screen name="trainer-clients" />
              <Stack.Screen name="momentum" />
              <Stack.Screen name="slot-drops" />
              <Stack.Screen name="waitlist/[trainerId]" />
              <Stack.Screen name="integrations" />
              <Stack.Screen name="membership" />
            </Stack>
            </BookingProvider>
            </AccessibilityProvider>
          </AuthProvider>
        </LocaleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
