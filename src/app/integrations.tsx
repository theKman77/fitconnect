import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { addSessionToCalendar, shareOnWhatsApp } from '@/lib/integrations';
import { config } from '@/lib/config';
import { Txt } from '@/components/ui';

type Status = 'ready' | 'setup' | 'mobile';

const STATUS: Record<Status, { label: string; color: string; bg: string }> = {
  ready: { label: 'Ready', color: colors.success, bg: colors.successTint },
  setup: { label: 'Needs setup', color: colors.warm, bg: 'rgba(255,179,107,0.12)' },
  mobile: { label: 'Mobile build', color: colors.textSecondary, bg: colors.surfaceHigh },
};

export default function Integrations() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()}><Ionicons name="chevron-back" size={21} color={colors.textPrimary} /></Pressable>
        <View style={{ flex: 1 }}>
          <Txt style={styles.kicker}>CONNECTED EXPERIENCE</Txt>
          <Txt style={styles.title}>Integrations</Txt>
        </View>
      </View>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="extension-puzzle" size={25} color={colors.primary} /></View>
          <Txt style={styles.heroTitle}>FitConnect works better with the tools you already use.</Txt>
          <Txt style={styles.heroCopy}>Every item below shows its honest readiness. Nothing is presented as connected until it can actually work.</Txt>
        </View>

        <Txt style={styles.sectionLabel}>WORKING ON WEB TODAY</Txt>
        <IntegrationCard icon="logo-whatsapp" name="WhatsApp" description="Share FitConnect and referral codes through WhatsApp or WhatsApp Web." status="ready" action="Try it" onPress={() => shareOnWhatsApp('Take a look at FitConnect — book trusted personal trainers across Riyadh.')} />
        <IntegrationCard icon="calendar" name="Calendar" description="Add a FitConnect session to Google Calendar from any device." status="ready" action="Add sample" onPress={() => addSessionToCalendar({ title: 'FitConnect training session', details: 'Sample calendar integration', location: 'Riyadh', start: new Date(Date.now() + 86400000), durationMin: 60 })} />
        <IntegrationCard icon="logo-instagram" name="Social profiles" description="Clients and trainers can publish Instagram, TikTok, X and YouTube links." status="ready" action="Edit socials" onPress={() => router.push('/edit-profile')} />
        <IntegrationCard icon="logo-google" name="Google sign-in" description="Connected through Supabase and verified by the founder on the live web app." status="ready" />

        <Txt style={styles.sectionLabel}>OWNER SETUP REQUIRED</Txt>
        <IntegrationCard icon="card" name="Moyasar · mada · Apple Pay" description={config.paymentsEnabled ? 'Live payment mode is enabled.' : 'Checkout stays an unpaid demo until the business has a CR and Moyasar approval.'} status={config.paymentsEnabled ? 'ready' : 'setup'} />

        <Txt style={styles.sectionLabel}>MOBILE APP PHASE</Txt>
        <IntegrationCard icon="heart" name="Apple Health & Health Connect" description="Import workouts, active calories and optional progress measurements with consent." status="mobile" />
        <IntegrationCard icon="navigate" name="Live trainer location" description="Realtime location is implemented; the interactive map requires the installable mobile build." status="mobile" />
        <IntegrationCard icon="notifications" name="Push notifications" description="Booking alerts are implemented and activate inside the installable mobile build." status="mobile" />
        <IntegrationCard icon="logo-apple" name="Sign in with Apple" description="Required alongside Google sign-in for the eventual iOS App Store release." status="mobile" />
      </ScrollView>
    </SafeAreaView>
  );
}

function IntegrationCard({ icon, name, description, status, action, onPress }: { icon: keyof typeof Ionicons.glyphMap; name: string; description: string; status: Status; action?: string; onPress?: () => void }) {
  const meta = STATUS[status];
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}><Ionicons name={icon} size={22} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardTop}>
          <Txt style={styles.cardTitle}>{name}</Txt>
          <View style={[styles.status, { backgroundColor: meta.bg }]}><Txt style={[styles.statusText, { color: meta.color }]}>{meta.label}</Txt></View>
        </View>
        <Txt style={styles.cardCopy}>{description}</Txt>
        {action && onPress && <Pressable onPress={onPress} style={styles.action}><Txt style={styles.actionText}>{action}</Txt><Ionicons name="arrow-forward" size={14} color={colors.primary} /></Pressable>}
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
});
