import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

import { AuthProvider } from '@/context/auth';
import { AccessibilityProvider } from '@/context/accessibility';
import { BookingProvider } from '@/context/booking';
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
              <Stack.Screen name="membership" />
            </Stack>
          </BookingProvider>
          </AccessibilityProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
