import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { Brand, Button, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';

export default function Welcome() {
  const router = useRouter();
  const { isDemo } = useAuth();
  const { locale, setLocale, isRTL, t } = useLocale();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const proofs = [
    { icon: 'shield-checkmark' as const, label: t('welcome.vetted') },
    { icon: 'calendar' as const, label: t('welcome.fastBooking') },
    { icon: 'location' as const, label: t('welcome.riyadh') },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.orbOne} pointerEvents="none" />
      <View style={styles.orbTwo} pointerEvents="none" />
      <Pressable
        accessibilityLabel={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        onPress={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
        style={styles.languageButton}
      >
        <Ionicons name="language" size={15} color={colors.primary} />
        <Txt style={styles.languageText}>{locale === 'ar' ? 'EN' : 'العربية'}</Txt>
      </Pressable>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, wide && styles.scrollWide]}
      >
        <View style={[styles.shell, wide && styles.shellWide, wide && isRTL && Platform.OS !== 'web' && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.copy, wide && styles.copyWide]}>
            <Brand />
            <View style={styles.eyebrow}>
              <View style={styles.liveDot} />
              <Txt style={styles.eyebrowText}>{t('welcome.kicker')}</Txt>
            </View>
            <Txt style={[styles.title, wide && styles.titleWide]}>
              {t('welcome.title')}
            </Txt>
            <Txt style={styles.subtitle}>
              {t('welcome.subtitle')}
            </Txt>
            <View style={styles.proofs}>
              {proofs.map((proof) => (
                <View key={proof.label} style={styles.proof}>
                  <Ionicons name={proof.icon} size={15} color={colors.primary} />
                  <Txt style={styles.proofText}>{proof.label}</Txt>
                </View>
              ))}
            </View>
            {!wide && (
              <View style={styles.actionsMobile}>
                <Button
                  title={t('welcome.find')}
                  icon="arrow-forward"
                  onPress={() => router.push(isDemo ? '/(auth)/onboarding' : { pathname: '/(auth)/sign-in', params: { mode: 'up' } })}
                />
                <Button title={t('welcome.signIn')} variant="ghost" onPress={() => router.push('/(auth)/sign-in')} />
              </View>
            )}
          </View>

          <View style={[styles.visual, wide && styles.visualWide]}>
            <LinearGradient
              colors={[colors.primaryLight, colors.primary, colors.primaryDeep]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.visualGrid} />
            <View style={styles.visualTop}>
              <Txt style={styles.visualTag}>{t('welcome.momentum')}</Txt>
              <View style={styles.scorePill}><Txt style={styles.scoreText}>+120 XP</Txt></View>
            </View>
            <View style={styles.ring}>
              <View style={styles.ringInner}>
                <Txt style={styles.ringValue}>3</Txt>
                <Txt style={styles.ringLabel}>{t('welcome.streak')}</Txt>
              </View>
            </View>
            <View style={styles.sessionCard}>
              <View style={styles.sessionIcon}><Ionicons name="flash" size={19} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Txt style={styles.sessionTitle}>{t('welcome.session')}</Txt>
                <Txt style={styles.sessionMeta}>{t('welcome.sessionTime')}</Txt>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.textPrimary} />
            </View>
          </View>
        </View>

        {wide && (
          <View style={styles.actions}>
            <Button
              title={t('welcome.find')}
              icon="arrow-forward"
              onPress={() => router.push(isDemo ? '/(auth)/onboarding' : { pathname: '/(auth)/sign-in', params: { mode: 'up' } })}
            />
            <Button title={t('welcome.signIn')} variant="ghost" onPress={() => router.push('/(auth)/sign-in')} />
            {isDemo && <Txt variant="caption" center>{t('welcome.demo')}</Txt>}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  languageButton: { position: 'absolute', zIndex: 5, top: 14, right: 20, minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.primaryBorder },
  languageText: { fontFamily: fonts.bold, fontSize: 11, color: colors.textPrimary },
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 26 },
  scrollWide: { paddingHorizontal: 48 },
  shell: { flex: 1, justifyContent: 'center', gap: 34, width: '100%', maxWidth: 1120, alignSelf: 'center' },
  shellWide: { flexDirection: 'row', alignItems: 'center', gap: 70 },
  copy: { gap: 20 },
  copyWide: { flex: 1.06 },
  eyebrow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surfaceElevated, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  eyebrowText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.3, color: colors.textSecondary },
  title: { fontFamily: fonts.extrabold, fontSize: 42, lineHeight: 44, letterSpacing: -2.2, color: colors.textPrimary },
  titleWide: { fontSize: 58, lineHeight: 59, letterSpacing: -3.1 },
  subtitle: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.textSecondary, maxWidth: 540 },
  proofs: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  proof: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.primaryTint },
  proofText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textSecondary },
  visual: { height: 330, borderRadius: 34, overflow: 'hidden', padding: 22, justifyContent: 'space-between', transform: [{ rotate: '-1.5deg' }] },
  visualWide: { width: 420, height: 480 },
  visualGrid: { position: 'absolute', width: 250, height: 250, borderRadius: 125, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', right: -50, top: -55 },
  visualTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  visualTag: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.2, color: 'rgba(255,255,255,0.82)' },
  scorePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(8,9,11,0.18)' },
  scoreText: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
  ring: { width: 154, height: 154, borderRadius: 77, borderWidth: 16, borderColor: 'rgba(255,255,255,0.28)', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 112, height: 112, borderRadius: 56, backgroundColor: 'rgba(8,9,11,0.16)', alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontFamily: fonts.extrabold, fontSize: 43, lineHeight: 45, color: colors.white, fontVariant: ['tabular-nums'] },
  ringLabel: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 1.1, color: 'rgba(255,255,255,0.82)' },
  sessionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(8,9,11,0.86)', borderRadius: radius.xl, padding: 14 },
  sessionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primaryTintStrong, alignItems: 'center', justifyContent: 'center' },
  sessionTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  sessionMeta: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted, marginTop: 3 },
  actions: { width: '100%', maxWidth: 540, alignSelf: 'center', gap: 8, marginTop: 30 },
  actionsMobile: { gap: 5, marginTop: 2 },
  orbOne: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: colors.primaryTint, top: -250, right: -180 },
  orbTwo: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,179,107,0.035)', bottom: -180, left: -120 },
});
