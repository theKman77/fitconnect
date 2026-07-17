import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme';
import { Button, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';

export default function Welcome() {
  const router = useRouter();
  const { isDemo } = useAuth();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.logoRow}>
          <Txt style={styles.logoFit} numberOfLines={1} adjustsFontSizeToFit>FIT</Txt>
          <Txt style={styles.logoConnect} numberOfLines={1} adjustsFontSizeToFit>CONNECT</Txt>
        </View>
        <Txt variant="body" center style={styles.tagline}>
          Book vetted personal trainers on demand. In person or virtual, on your schedule.
        </Txt>
      </View>

      <View style={styles.actions}>
        <Button
          title="Get started"
          icon="arrow-forward"
          onPress={() =>
            // Live mode: create the account first so onboarding answers save.
            router.push(isDemo ? '/(auth)/onboarding' : { pathname: '/(auth)/sign-in', params: { mode: 'up' } })
          }
        />
        <Button
          title="I already have an account"
          variant="ghost"
          onPress={() => router.push('/(auth)/sign-in')}
        />
        {isDemo && (
          <Txt variant="caption" center style={{ marginTop: 8 }}>
            Demo mode — backend not connected yet. Everything is explorable with sample data.
          </Txt>
        )}
      </View>
      <LinearGradient
        colors={['transparent', colors.primaryTint]}
        style={styles.glow}
        pointerEvents="none"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, justifyContent: 'space-between', padding: 22 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    maxWidth: '100%',
    paddingHorizontal: 8,
  },
  logoFit: { fontFamily: fonts.extrabold, fontSize: 46, color: colors.primary, letterSpacing: -1 },
  logoConnect: { fontFamily: fonts.bold, fontSize: 26, color: colors.textPrimary, letterSpacing: 3 },
  tagline: { marginTop: 20, paddingHorizontal: 20, maxWidth: 340 },
  actions: { gap: 10, paddingBottom: 10 },
  glow: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, zIndex: -1 },
});
