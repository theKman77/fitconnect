import { Redirect, type Href } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/auth';
import { colors } from '@/theme';

/** Boot router: send the user to auth, onboarding, or the app based on state. */
export default function Index() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile) return <Redirect href="/(auth)/welcome" />;
  if (profile.role === 'trainer') return <Redirect href={'/(trainer)' as Href} />;
  if (!profile.onboarded) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
