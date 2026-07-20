import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { useAuth } from '@/context/auth';
import { useBooking } from '@/context/booking';
import { useLocale } from '@/context/locale';
import { getTrainer } from '@/lib/api';
import { listMyWaitlistMatches, listMyWaitlists, listOpenSlotDrops, markWaitlistMatchSeen } from '@/lib/demand';
import { formatMoney } from '@/lib/config';
import { localizeDomain } from '@/lib/localize-domain';
import { Badge, Button, EmptyState, Skeleton, Txt } from '@/components/ui';
import { colors, fonts, radius } from '@/theme';
import type { SlotBroadcast, Trainer, WaitlistMatch, WaitlistRequest } from '@/types/domain';

export default function SlotDrops() {
  const router = useRouter();
  const { profile } = useAuth();
  const { start } = useBooking();
  const { locale, localeTag, isRTL, tr } = useLocale();
  const [drops, setDrops] = useState<SlotBroadcast[]>([]);
  const [matches, setMatches] = useState<WaitlistMatch[]>([]);
  const [waitlists, setWaitlists] = useState<WaitlistRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientId = profile?.id ?? 'demo-client';
  const rtlRow = isRTL ? styles.rtlRow : undefined;

  const load = useCallback(async () => {
    try {
      setError(null);
      const [nextDrops, nextMatches, nextWaitlists] = await Promise.all([
        listOpenSlotDrops(!profile),
        listMyWaitlistMatches(clientId),
        listMyWaitlists(clientId),
      ]);
      setDrops(nextDrops);
      setMatches(nextMatches);
      setWaitlists(nextWaitlists);
    } catch (value: any) {
      setError(value?.message ?? tr('Pulse Drops are temporarily unavailable.'));
    } finally {
      setLoaded(true);
    }
  }, [clientId, profile, tr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function book(drop: SlotBroadcast) {
    if (!profile) {
      router.push('/(auth)/sign-in?mode=up');
      return;
    }
    const opening = drop.availability;
    if (!opening) return;
    setBusy(drop.id);
    try {
      const matched = matches.find((item) => item.broadcast_id === drop.id);
      if (matched) await markWaitlistMatchSeen(matched.id, clientId);
      const detail = await getTrainer(drop.trainer_id);
      if (!detail) throw new Error(tr('Trainer profile unavailable.'));
      const plans = detail.session_types.filter((plan) => plan.active && plan.kind !== 'subscription');
      const preferred = waitlists.find((row) => row.trainer_id === drop.trainer_id);
      const plan = plans.find((item) => item.id === preferred?.session_type_id) ?? plans.find((item) => item.popular) ?? plans[0];
      if (!plan) throw new Error(tr('No bookable plan is available.'));
      start(detail, plans, plan, {
        format: preferred?.format ?? 'in_person',
        scheduledAt: new Date(opening.starts_at),
        isPeak: opening.is_peak,
        city: preferred?.city ?? profile.city ?? 'Riyadh',
      });
      router.push({ pathname: '/booking/[trainerId]', params: { trainerId: detail.id, startStep: '2', drop: drop.id } });
    } catch (value: any) {
      setError(value?.message ?? tr('Could not prepare this opening.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={[styles.header, rtlRow]}>
          <Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={() => router.back()} style={styles.back}><Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={21} color={colors.textPrimary} /></Pressable>
          <View style={{ flex: 1 }}><Txt variant="monoTag">{tr('PULSE DROPS')}</Txt><Txt style={styles.title}>{tr('Good openings should not disappear.')}</Txt></View>
        </View>

        <View style={styles.hero}>
          <LinearGradient colors={['#3A1A10', '#1C1515', colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.heroOrb} />
          <View style={[styles.livePill, rtlRow]}><View style={styles.liveDot} /><Txt style={styles.liveText}>{tr('LIVE · NEXT 72 HOURS')}</Txt></View>
          <Txt style={styles.heroTitle}>{tr('A trainer freed up. You get first look.')}</Txt>
          <Txt variant="body" style={styles.heroCopy}>{tr('These are real published openings that would otherwise go unused. Waitlist matches are private and booking still uses FitConnect protection.')}</Txt>
          <View style={[styles.heroStats, rtlRow]}>
            <HeroStat value={new Intl.NumberFormat(localeTag).format(drops.length)} label={tr('open now')} />
            <HeroStat value={new Intl.NumberFormat(localeTag).format(matches.length)} label={tr('matched to you')} />
            <HeroStat value={locale === 'ar' ? '٧٢س' : '72h'} label={tr('maximum window')} />
          </View>
        </View>

        {error && <View style={[styles.error, rtlRow]}><Ionicons name="cloud-offline-outline" size={18} color={colors.danger} /><Txt variant="caption" style={{ flex: 1 }}>{error}</Txt></View>}
        {!loaded && <><Skeleton height={210} /><Skeleton height={210} /></>}

        {loaded && drops.length === 0 && <EmptyState icon="flash-outline" title={tr('No Pulse Drops right now')} subtitle={tr('Join a trainer waitlist and matched openings will appear here first.')} actionLabel={tr('Find a trainer')} onAction={() => router.push('/(tabs)/discover')} />}

        {loaded && drops.length > 0 && (
          <>
            <View style={[styles.sectionHead, rtlRow]}><View><Txt variant="monoTag">{tr('EXPIRING INVENTORY')}</Txt><Txt style={styles.sectionTitle}>{tr('Move while the time fits')}</Txt></View><Badge label={`${new Intl.NumberFormat(localeTag).format(drops.length)} ${tr('LIVE')}`} tone="brand" /></View>
            {drops.map((drop) => {
              const trainer = normalizedTrainer(drop.trainer);
              const opening = drop.availability;
              const match = matches.some((item) => item.broadcast_id === drop.id);
              if (!trainer || !opening) return null;
              const startAt = dayjs(opening.starts_at);
              const hours = Math.max(1, Math.ceil(startAt.diff(dayjs(), 'minute') / 60));
              return (
                <View key={drop.id} style={[styles.dropCard, match && styles.dropMatched]}>
                  <View style={[styles.dropTop, rtlRow]}>
                    <View style={styles.timeTile}><Txt style={styles.timeMain}>{new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(startAt.toDate())}</Txt><Txt style={styles.timeDay}>{startAt.locale(locale).format('ddd')}</Txt></View>
                    <View style={{ flex: 1 }}><View style={[styles.nameRow, rtlRow]}><Txt style={styles.dropName}>{trainer.display_name}</Txt>{trainer.verified && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}</View><Txt variant="caption" style={{ marginTop: 3 }}>{localizeDomain(trainer.headline, locale)}</Txt></View>
                    {match ? <Badge label={tr('YOUR MATCH')} tone="success" /> : <Badge label={`${new Intl.NumberFormat(localeTag).format(hours)}${locale === 'ar' ? 'س' : 'h'}`} tone="neutral" />}
                  </View>
                  <View style={[styles.metaRow, rtlRow]}>
                    <Meta icon="calendar-outline" text={startAt.locale(locale).format('dddd، D MMMM')} />
                    <Meta icon="location-outline" text={localizeDomain(trainer.city ?? 'Riyadh', locale)} />
                    <Meta icon="cash-outline" text={tr('From') + ' ' + formatMoney(trainer.base_price)} />
                  </View>
                  <View style={[styles.demandLine, rtlRow]}><Ionicons name="people-outline" size={16} color={colors.primary} /><Txt variant="caption" style={{ flex: 1 }}>{tr('Matched privately with')} {new Intl.NumberFormat(localeTag).format(drop.matched_count)} {tr('waiting clients')}</Txt><Txt style={styles.expires}>{tr('Closes at session time')}</Txt></View>
                  <Button title={busy === drop.id ? tr('Preparing…') : tr('Review this opening')} icon={isRTL ? 'arrow-back' : 'arrow-forward'} loading={busy === drop.id} onPress={() => book(drop)} />
                  <Pressable onPress={() => router.push(`/waitlist/${drop.trainer_id}` as any)} style={styles.waitLink}><Txt variant="caption" color={colors.primary}>{tr('Need a different time? Tune my waitlist')}</Txt></Pressable>
                </View>
              );
            })}
          </>
        )}

        <View style={styles.guardrail}><Ionicons name="shield-checkmark" size={20} color={colors.success} /><View style={{ flex: 1 }}><Txt variant="bodyStrong">{tr('Demand without exposing clients')}</Txt><Txt variant="caption" style={{ marginTop: 4 }}>{tr('Trainers see aggregate demand and match counts. They do not receive your identity or contact details from a waitlist.')}</Txt></View></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function normalizedTrainer(value: SlotBroadcast['trainer']): Trainer | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return <View style={styles.heroStat}><Txt style={styles.heroStatValue}>{value}</Txt><Txt style={styles.heroStatLabel}>{label}</Txt></View>;
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.meta}><Ionicons name={icon} size={14} color={colors.textMuted} /><Txt style={styles.metaText}>{text}</Txt></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, paddingBottom: 40, gap: 14 },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  title: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 31, letterSpacing: -1, color: colors.textPrimary, marginTop: 4 },
  hero: { minHeight: 280, borderRadius: radius.xxl, overflow: 'hidden', padding: 20, borderWidth: 1, borderColor: colors.primaryBorder },
  heroOrb: { position: 'absolute', width: 230, height: 230, borderRadius: 115, right: -75, top: -120, backgroundColor: colors.primaryTintStrong },
  livePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: 'rgba(255,92,53,0.18)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  liveText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.1, color: colors.primaryLight },
  heroTitle: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 33, letterSpacing: -1.1, color: colors.white, marginTop: 22, maxWidth: 460 },
  heroCopy: { marginTop: 10, maxWidth: 560 },
  heroStats: { flexDirection: 'row', marginTop: 21, gap: 8 },
  heroStat: { flex: 1, minWidth: 0, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.055)', padding: 11 },
  heroStatValue: { fontFamily: fonts.extrabold, fontSize: 19, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  heroStatLabel: { fontFamily: fonts.medium, fontSize: 9, color: colors.textMuted, marginTop: 3 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, borderRadius: radius.lg, backgroundColor: colors.dangerTint },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  sectionTitle: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.8, color: colors.textPrimary, marginTop: 4 },
  dropCard: { borderRadius: radius.xxl, padding: 17, gap: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dropMatched: { borderColor: 'rgba(59,209,111,0.35)', backgroundColor: '#111A16' },
  dropTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeTile: { width: 67, height: 67, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder },
  timeMain: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.primary },
  timeDay: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 0.9, color: colors.textMuted, marginTop: 2, textTransform: 'uppercase' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dropName: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: colors.surfaceElevated },
  metaText: { fontFamily: fonts.medium, fontSize: 10, color: colors.textSecondary },
  demandLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expires: { fontFamily: fonts.mono, fontSize: 8, color: colors.textDim },
  waitLink: { alignSelf: 'center', padding: 4 },
  guardrail: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: radius.xl, padding: 16, backgroundColor: colors.successTint, borderWidth: 1, borderColor: 'rgba(59,209,111,0.2)' },
});
