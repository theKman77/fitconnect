import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { addSessionToCalendar, shareOnWhatsApp } from '@/lib/integrations';
import { config } from '@/lib/config';
import { Txt } from '@/components/ui';
import { useLocale } from '@/context/locale';

type Status = 'ready' | 'setup' | 'mobile';

const STATUS: Record<Status, { label: string; color: string; bg: string }> = {
  ready: { label: 'Ready', color: colors.success, bg: colors.successTint },
  setup: { label: 'Needs setup', color: colors.warm, bg: 'rgba(255,179,107,0.12)' },
  mobile: { label: 'Mobile build', color: colors.textSecondary, bg: colors.surfaceHigh },
};

export default function Integrations() {
  const router = useRouter();
  const { isRTL, tr } = useLocale();
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Pressable style={styles.back} onPress={() => router.back()}><Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={21} color={colors.textPrimary} /></Pressable>
        <View style={{ flex: 1 }}>
          <Txt style={styles.kicker}>{tr('CONNECTED EXPERIENCE')}</Txt>
          <Txt style={styles.title}>{tr('Integrations')}</Txt>
        </View>
      </View>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="extension-puzzle" size={25} color={colors.primary} /></View>
          <Txt style={styles.heroTitle}>{tr('FitConnect works better with the tools you already use.')}</Txt>
          <Txt style={styles.heroCopy}>{tr('Every item below shows its honest readiness. Nothing is presented as connected until it can actually work.')}</Txt>
        </View>

        <Txt style={styles.sectionLabel}>{tr('WORKING ON WEB TODAY')}</Txt>
        <IntegrationCard icon="logo-whatsapp" name="WhatsApp" description={tr('Share FitConnect and referral codes through WhatsApp or WhatsApp Web.')} status="ready" action={tr('Try it')} onPress={() => shareOnWhatsApp(isRTL ? 'جرّب FitConnect واحجز مدربين شخصيين موثوقين في الرياض.' : 'Take a look at FitConnect — book trusted personal trainers across Riyadh.')} />
        <IntegrationCard icon="calendar" name={tr('Calendar')} description={tr('Add a FitConnect session to Google Calendar from any device.')} status="ready" action={tr('Add sample')} onPress={() => addSessionToCalendar({ title: isRTL ? 'جلسة تدريب FitConnect' : 'FitConnect training session', details: isRTL ? 'مثال لتكامل التقويم' : 'Sample calendar integration', location: isRTL ? 'الرياض' : 'Riyadh', start: new Date(Date.now() + 86400000), durationMin: 60 })} />
        <IntegrationCard icon="logo-instagram" name={tr('Social profiles')} description={tr('Clients and trainers can publish Instagram, TikTok, X and YouTube links.')} status="ready" action={tr('Edit socials')} onPress={() => router.push('/edit-profile')} />
        <IntegrationCard icon="logo-google" name={tr('Google sign-in')} description={tr('Connected through Supabase and verified by the founder on the live web app.')} status="ready" />

        <Txt style={styles.sectionLabel}>{tr('OWNER SETUP REQUIRED')}</Txt>
        <IntegrationCard icon="card" name="Moyasar · mada · Apple Pay" description={tr(config.paymentsEnabled ? 'Live payment mode is enabled.' : 'Checkout stays an unpaid demo until the business has a CR and Moyasar approval.')} status={config.paymentsEnabled ? 'ready' : 'setup'} />

        <Txt style={styles.sectionLabel}>{tr('MOBILE APP PHASE')}</Txt>
        <IntegrationCard icon="heart" name={tr('Apple Health & Health Connect')} description={tr('Import workouts, active calories and optional progress measurements with consent.')} status="mobile" />
        <IntegrationCard icon="navigate" name={tr('Live trainer location')} description={tr('Realtime location is implemented; the interactive map requires the installable mobile build.')} status="mobile" />
        <IntegrationCard icon="notifications" name={tr('Push notifications')} description={tr('Booking alerts are implemented and activate inside the installable mobile build.')} status="mobile" />
        <IntegrationCard icon="logo-apple" name={tr('Sign in with Apple')} description={tr('Required alongside Google sign-in for the eventual iOS App Store release.')} status="mobile" />
      </ScrollView>
    </SafeAreaView>
  );
}

function IntegrationCard({ icon, name, description, status, action, onPress }: { icon: keyof typeof Ionicons.glyphMap; name: string; description: string; status: Status; action?: string; onPress?: () => void }) {
  const meta = STATUS[status];
  const { isRTL, tr } = useLocale();
  return (
    <View style={[styles.card, isRTL && styles.rtlRow]}>
      <View style={styles.cardIcon}><Ionicons name={icon} size={22} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <View style={[styles.cardTop, isRTL && styles.rtlRow]}>
          <Txt style={styles.cardTitle}>{name}</Txt>
          <View style={[styles.status, { backgroundColor: meta.bg }]}><Txt style={[styles.statusText, { color: meta.color }]}>{tr(meta.label)}</Txt></View>
        </View>
        <Txt style={styles.cardCopy}>{description}</Txt>
        {action && onPress && <Pressable onPress={onPress} style={[styles.action, isRTL && styles.rtlRow]}><Txt style={styles.actionText}>{action}</Txt><Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={14} color={colors.primary} /></Pressable>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { width: '100%', maxWidth: 760, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  kicker: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.1, color: colors.primary },
  title: { fontFamily: fonts.extrabold, fontSize: 28, letterSpacing: -1, color: colors.textPrimary, marginTop: 2 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  hero: { padding: 22, borderRadius: radius.xxl, backgroundColor: colors.primaryTint, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.primaryBorder, marginBottom: 16 },
  heroIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, marginBottom: 16 },
  heroTitle: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 25, letterSpacing: -0.4, color: colors.textPrimary, maxWidth: 520 },
  heroCopy: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginTop: 8 },
  sectionLabel: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.2, color: colors.textDim, marginTop: 16, marginBottom: 3 },
  card: { flexDirection: 'row', gap: 14, padding: 17, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSubtle },
  cardIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  cardCopy: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 6 },
  status: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill },
  statusText: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.3 },
  action: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  actionText: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
});
