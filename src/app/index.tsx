import { Redirect, type Href } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/auth';
import { colors } from '@/theme';
import { Button, EmptyState } from '@/components/ui';

/** Boot router: send the user to auth, onboarding, or the app based on state. */
export default function Index() {
  const { profile, session, loading, isDemo, authError, refreshProfile, signOut } = useAuth();

  // Wait while auth is initializing, or while a signed-in user's profile is
  // still loading (e.g. right after sign-up) — otherwise we'd flash Welcome.
  if (loading || (!isDemo && session && !profile && !authError)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (authError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 22 }}>
        <EmptyState icon="alert-circle" title="Account could not load" subtitle={authError} actionLabel="Try again" onAction={refreshProfile} />
        <Button title="Sign out" variant="ghost" onPress={signOut} />
      </View>
    );
  }

  if (!profile) return <Redirect href="/(auth)/welcome" />;
  if (profile.role === 'trainer') return <Redirect href={'/(trainer)' as Href} />;
  if (!profile.onboarded) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
