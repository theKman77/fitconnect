import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { Avatar, Badge, Card, EmptyState, Skeleton, Txt } from '@/components/ui';
import { colors, fonts, radius } from '@/theme';
import { getBookingCounterpart, getMyTrainer, listTrainerBookings, type BookingCounterpart } from '@/lib/trainer';
import { relationshipSignal } from '@/lib/retention';
import { formatMoney } from '@/lib/config';
import type { Booking, RelationshipStatus } from '@/types/domain';

interface ClientPulse {
  id: string;
  person: BookingCounterpart | null;
  sessions: Booking[];
  latest: Booking;
  status: RelationshipStatus;
  hasUpcoming: boolean;
  value: number;
}

export default function TrainerClients() {
  const router = useRouter();
  const { profile } = useAuth();
  const { locale, localeTag, isRTL, tr } = useLocale();
  const [rows, setRows] = useState<ClientPulse[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rtlRow = isRTL ? styles.rtlRow : undefined;

  const load = useCallback(async () => {
    try {
      setError(null);
      if (!profile) {
        const demo = [
          demoPulse('demo-lina', 'Lina A.', 6, 4, 'attention', 1260),
          demoPulse('demo-omar', 'Omar N.', 11, 8, 'active', 2475, true),
          demoPulse('demo-sara', 'Sara R.', 4, 12, 'active', 820),
        ];
        setRows(demo);
        return;
      }
      const trainer = await getMyTrainer(profile);
      if (!trainer) throw new Error(tr('Trainer profile unavailable.'));
      const bookings = await listTrainerBookings(trainer);
      const grouped = new Map<string, Booking[]>();
      for (const booking of bookings.filter((item) => !['cancelled', 'no_show'].includes(item.status))) grouped.set(booking.client_id, [...(grouped.get(booking.client_id) ?? []), booking]);
      const pulses = await Promise.all([...grouped.entries()].map(async ([id, sessions]) => {
        const ordered = [...sessions].sort((a, b) => (b.scheduled_at ?? b.created_at).localeCompare(a.scheduled_at ?? a.created_at));
        const completed = ordered.filter((item) => item.status === 'completed');
        const upcoming = ordered.filter((item) => ['confirmed', 'en_route', 'arriving', 'in_progress'].includes(item.status));
        return {
          id, person: await getBookingCounterpart(ordered[0].id).catch(() => null), sessions: completed, latest: completed[0] ?? ordered[0],
          status: relationshipSignal((completed[0] ?? ordered[0]).scheduled_at ?? (completed[0] ?? ordered[0]).created_at, upcoming.length > 0),
          hasUpcoming: upcoming.length > 0,
          value: completed.reduce((sum, item) => sum + (item.trainer_payout ?? item.base_price * 0.9), 0),
        } as ClientPulse;
      }));
      setRows(pulses.sort((a, b) => Number(b.status === 'attention') - Number(a.status === 'attention') || b.sessions.length - a.sessions.length));
    } catch (value: any) {
      setError(value?.message ?? tr('Could not load your client book.'));
    } finally {
      setLoaded(true);
    }
  }, [profile, tr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const attention = rows.filter((row) => row.status === 'attention');
  const active = rows.filter((row) => row.status === 'active');
  const totalValue = useMemo(() => rows.reduce((sum, row) => sum + row.value, 0), [rows]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={[styles.header, rtlRow]}><Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={() => router.back()} style={styles.back}><Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={21} color={colors.textPrimary} /></Pressable><View style={{ flex: 1 }}><Txt variant="monoTag">{tr('RETENTION STUDIO')}</Txt><Txt style={styles.title}>{tr('Your client book')}</Txt></View></View>

        <View style={styles.hero}>
          <LinearGradient colors={['#35170F', colors.surfaceElevated, colors.surface]} style={StyleSheet.absoluteFill} />
          <Txt style={styles.heroTitle}>{tr('Know who needs you before they disappear.')}</Txt>
          <Txt variant="body" style={{ marginTop: 8 }}>{tr('A private relationship workspace built from sessions, follow-up rhythm, and future bookings—not invasive health scoring.')}</Txt>
          <View style={[styles.metrics, rtlRow]}><Metric value={new Intl.NumberFormat(localeTag).format(active.length)} label={tr('on track')} /><Metric value={new Intl.NumberFormat(localeTag).format(attention.length)} label={tr('need attention')} /><Metric value={formatMoney(totalValue)} label={tr('earned together')} /></View>
        </View>

        {!loaded && <><Skeleton height={90} /><Skeleton height={90} /><Skeleton height={90} /></>}
        {error && <Card><EmptyState icon="cloud-offline-outline" title={tr('Client book unavailable')} subtitle={error} actionLabel={tr('Try again')} onAction={load} /></Card>}
        {loaded && !error && rows.length === 0 && <Card><EmptyState icon="people-outline" title={tr('Your client book starts here')} subtitle={tr('A client appears after their first real booking with you.')} /></Card>}

        {attention.length > 0 && <><View style={[styles.sectionHead, rtlRow]}><View><Txt variant="monoTag">{tr('ATTENTION QUEUE')}</Txt><Txt style={styles.sectionTitle}>{tr('Reconnect thoughtfully')}</Txt></View><Badge label={new Intl.NumberFormat(localeTag).format(attention.length)} tone="brand" /></View><View style={styles.list}>{attention.map((row) => <ClientRow key={`attention-${row.id}`} row={row} locale={locale} localeTag={localeTag} isRTL={isRTL} tr={tr} onPress={() => router.push(`/trainer-client/${row.id}` as any)} />)}</View></>}

        {rows.length > 0 && <><View style={[styles.sectionHead, rtlRow]}><View><Txt variant="monoTag">{tr('ALL RELATIONSHIPS')}</Txt><Txt style={styles.sectionTitle}>{tr('Clients worth keeping')}</Txt></View></View><View style={styles.list}>{rows.map((row) => <ClientRow key={row.id} row={row} locale={locale} localeTag={localeTag} isRTL={isRTL} tr={tr} onPress={() => router.push(`/trainer-client/${row.id}` as any)} />)}</View></>}

        <View style={[styles.guardrail, rtlRow]}><Ionicons name="lock-closed" size={18} color={colors.success} /><View style={{ flex: 1 }}><Txt variant="bodyStrong">{tr('Private by design')}</Txt><Txt variant="caption" style={{ marginTop: 3 }}>{tr('Clients cannot see private notes. Other trainers cannot see this client relationship. FitConnect never ranks clients by body data.')}</Txt></View></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ClientRow({ row, locale, localeTag, isRTL, tr, onPress }: { row: ClientPulse; locale: string; localeTag: string; isRTL: boolean; tr: (value: string) => string; onPress: () => void }) {
  const name = row.person?.full_name ?? tr('Client');
  return <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${tr(row.status === 'attention' ? 'FOLLOW UP' : 'ON TRACK')}`} onPress={onPress} style={[styles.clientRow, isRTL && styles.rtlRow]}><Avatar uri={row.person?.avatar_url} name={name} size={48} /><View style={{ flex: 1 }}><View style={[styles.nameLine, isRTL && styles.rtlRow]}><Txt variant="bodyStrong" style={{ flex: 1 }}>{name}</Txt>{row.status === 'attention' && <View style={styles.signalDot} />}</View><Txt variant="caption" style={{ marginTop: 4 }}>{row.hasUpcoming ? tr('Future session booked') : row.sessions.length ? locale === 'ar' ? `${new Intl.NumberFormat(localeTag).format(row.sessions.length)} جلسات · آخرها ${dayjs(row.latest.scheduled_at ?? row.latest.created_at).locale('ar').format('D MMM')}` : `${row.sessions.length} sessions · last ${dayjs(row.latest.scheduled_at ?? row.latest.created_at).format('MMM D')}` : tr('First booking')}</Txt></View><View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }}><Badge label={tr(row.status === 'attention' ? 'FOLLOW UP' : 'ON TRACK')} tone={row.status === 'attention' ? 'brand' : 'success'} /><Txt style={styles.value}>{formatMoney(row.value)}</Txt></View></Pressable>;
}

function Metric({ value, label }: { value: string; label: string }) { return <View style={styles.metric}><Txt style={styles.metricValue}>{value}</Txt><Txt style={styles.metricLabel}>{label}</Txt></View>; }

function demoPulse(id: string, name: string, sessions: number, lastDaysAgo: number, status: RelationshipStatus, value: number, hasUpcoming = false): ClientPulse {
  const latest = demoBooking(id, lastDaysAgo);
  return { id, person: { profile_id: id, full_name: name, avatar_url: null }, sessions: Array.from({ length: sessions }, (_, index) => demoBooking(id, lastDaysAgo + index * 7)), latest, status, hasUpcoming, value };
}

function demoBooking(clientId: string, daysAgo: number): Booking {
  const created = dayjs().subtract(daysAgo, 'day').toISOString();
  return { id: `demo-${clientId}-${daysAgo}`, client_id: clientId, trainer_id: 'demo-trainer', session_type_id: null, status: 'completed', format: 'in_person', scheduled_at: created, duration_min: 60, address_line: null, city: 'Riyadh', lat: null, lng: null, virtual_link: null, is_split: false, friend_email: null, equipment_by_trainer: false, equipment_items: [], base_price: 250, equipment_fee: 0, peak_surge: 0, service_fee: 0, total: 250, amount_due: 250, stripe_checkout_id: null, stripe_payment_intent: null, paid: true, trainer_payout: 225, created_at: created, updated_at: created };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg }, content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 40, gap: 13 }, rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 }, back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  title: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -1, color: colors.textPrimary, marginTop: 5 }, hero: { overflow: 'hidden', borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.primaryBorder, padding: 18 },
  heroTitle: { maxWidth: 540, fontFamily: fonts.extrabold, fontSize: 27, lineHeight: 31, letterSpacing: -1, color: colors.textPrimary }, metrics: { flexDirection: 'row', marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.border },
  metric: { flex: 1, alignItems: 'center' }, metricValue: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.textPrimary, fontVariant: ['tabular-nums'] }, metricLabel: { fontFamily: fonts.medium, fontSize: 9, color: colors.textDim, marginTop: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 }, sectionTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.textPrimary, marginTop: 5 }, list: { gap: 9 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, nameLine: { flexDirection: 'row', alignItems: 'center', gap: 7 }, signalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary }, value: { fontFamily: fonts.monoBold, fontSize: 9, color: colors.textMuted },
  guardrail: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 15, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, marginTop: 4 },
});
