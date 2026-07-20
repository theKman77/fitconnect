import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { colors, fonts, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { addAvailability, getMyTrainer, listAvailability, removeAvailability } from '@/lib/trainer';
import { broadcastOpening, closeSlotBroadcast, getTrainerDemandSummary, listTrainerBroadcasts } from '@/lib/demand';
import { confirm, notify } from '@/lib/confirm';
import { Badge, Card, EmptyState, Txt } from '@/components/ui';
import { DateRangePicker } from '@/components/scheduling/date-range-picker';
import { TimeOpeningPicker } from '@/components/scheduling/time-opening-picker';
import { useLocale } from '@/context/locale';
import type { AvailabilitySlot, SlotBroadcast, Trainer, TrainerDemandSummary } from '@/types/domain';

const TIMES = [
  { label: '7:00 AM', hour: 7 },
  { label: '9:00 AM', hour: 9 },
  { label: '12:00 PM', hour: 12 },
  { label: '3:00 PM', hour: 15 },
  { label: '6:00 PM', hour: 18 },
  { label: '7:30 PM', hour: 19, minute: 30 },
];

export default function TrainerAvailability() {
  const router = useRouter();
  const { profile } = useAuth();
  const { locale, localeTag, isRTL, t, tr } = useLocale();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [day, setDay] = useState(dayjs().add(1, 'day').startOf('day'));
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broadcasts, setBroadcasts] = useState<SlotBroadcast[]>([]);
  const [demand, setDemand] = useState<TrainerDemandSummary>({ waitlisted_clients: 0, open_broadcasts: 0, matched_clients: 0 });
  const [broadcastBusy, setBroadcastBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const current = await getMyTrainer(profile);
      setTrainer(current);
      const [nextSlots, nextBroadcasts, nextDemand] = current
        ? await Promise.all([listAvailability(current), listTrainerBroadcasts(current.id), getTrainerDemandSummary(current.id)])
        : [[], [], { waitlisted_clients: 0, open_broadcasts: 0, matched_clients: 0 }];
      setSlots(nextSlots);
      setBroadcasts(nextBroadcasts);
      setDemand(nextDemand);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load availability.');
    }
  }, [profile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleTime(hour: number, minute = 0) {
    if (!trainer) return;
    const start = day.hour(hour).minute(minute).second(0).millisecond(0);
    const existing = slots.find((s) => dayjs(s.starts_at).isSame(start, 'minute'));
    const key = start.toISOString();
    setBusyKey(key);
    try {
      if (existing) await removeAvailability(existing.id);
      else await addAvailability(trainer, start.toDate());
      await load();
    } catch (e: any) {
      notify('Availability not changed', e?.message ?? 'Please try again.');
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleBroadcast(slot: AvailabilitySlot) {
    if (!trainer) return;
    const existing = broadcasts.find((item) => item.availability_id === slot.id && item.status === 'open');
    setBroadcastBusy(slot.id);
    try {
      if (existing) {
        await closeSlotBroadcast(existing.id, trainer.id);
        notify(tr('Pulse Drop closed'), tr('This opening remains bookable but is no longer being promoted.'));
      } else {
        const result = await broadcastOpening(slot);
        notify(tr('Pulse Drop is live'), `${tr('Privately matched with')} ${new Intl.NumberFormat(localeTag).format(result.matched_count)} ${tr('waiting clients')}.`);
      }
      await load();
    } catch (e: any) {
      notify(tr('Pulse Drop not changed'), e?.message ?? tr('Please try again.'));
    } finally {
      setBroadcastBusy(null);
    }
  }

  const upcoming = slots.filter((s) => dayjs(s.starts_at).isAfter(dayjs())).slice(0, 12);
  const timeOptions = TIMES.map((time) => {
    const start = day.hour(time.hour).minute(time.minute ?? 0).second(0).millisecond(0);
    return {
      key: start.toISOString(),
      label: time.label,
      hour: time.hour,
      minute: time.minute,
      active: slots.some((slot) => dayjs(slot.starts_at).isSame(start, 'minute')),
      disabled: start.isBefore(dayjs().add(15, 'minute')),
      busy: busyKey === start.toISOString(),
      peak: time.hour >= 18,
    };
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.textPrimary} /></Pressable>
        <Txt variant="sectionTitle">{t('availability.title')}</Txt>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentInsetAdjustmentBehavior="automatic" refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />} contentContainerStyle={styles.content}>
        <View style={[styles.hero, isRTL && styles.rtlRow]}>
          <View style={styles.heroIcon}><Ionicons name="calendar" size={22} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Txt variant="cardTitle">{t('availability.heroTitle')}</Txt>
            <Txt variant="caption" style={{ marginTop: 3 }}>{t('availability.heroCopy')}</Txt>
          </View>
        </View>
        <View style={styles.demandCard}>
          <View style={[styles.demandTop, isRTL && styles.rtlRow]}><View style={styles.pulseIcon}><Ionicons name="pulse" size={21} color={colors.primary} /></View><View style={{ flex: 1 }}><Txt variant="monoTag">{tr('PRIVATE DEMAND SIGNAL')}</Txt><Txt style={styles.demandTitle}>{tr('Fill the hour, not your inbox.')}</Txt></View></View>
          <Txt variant="caption" style={{ marginTop: 8 }}>{tr('You see aggregate interest only. Client identities stay private until someone completes a protected booking.')}</Txt>
          <View style={[styles.demandMetrics, isRTL && styles.rtlRow]}>
            <DemandMetric value={demand.waitlisted_clients} label={tr('waiting')} localeTag={localeTag} />
            <DemandMetric value={demand.open_broadcasts} label={tr('live drops')} localeTag={localeTag} />
            <DemandMetric value={demand.matched_clients} label={tr('matches')} localeTag={localeTag} />
          </View>
        </View>
        {error && <Txt variant="caption" color={colors.danger} style={{ marginTop: 12 }}>{error}</Txt>}

        <Txt variant="label" style={styles.label}>{t('availability.chooseDay')}</Txt>
        <DateRangePicker
          selected={day}
          onSelect={setDay}
          maxDaysAhead={84}
          countForDate={(date) => slots.filter((slot) => dayjs(slot.starts_at).isSame(date, 'day')).length}
        />

        <View style={[styles.openingHead, isRTL && styles.rtlRow]}>
          <View><Txt variant="label">{t('availability.openings')}</Txt><Txt variant="caption" style={{ marginTop: 3 }}>{day.locale(locale).format('dddd، D MMMM')}</Txt></View>
          <Badge label={`${timeOptions.filter((option) => option.active).length} ${t('availability.selected')}`} tone={timeOptions.some((option) => option.active) ? 'brand' : 'neutral'} />
        </View>
        <TimeOpeningPicker multiple options={timeOptions} onPress={(option) => toggleTime(option.hour, option.minute)} />

        <View style={[styles.sectionHead, isRTL && styles.rtlRow]}>
          <Txt variant="sectionTitle">{t('availability.published')}</Txt>
          <Badge label={`${slots.length} ${t('availability.live')}`} tone={slots.length ? 'success' : 'neutral'} />
        </View>
        {upcoming.length === 0 ? (
          <Card><EmptyState icon="calendar-outline" title={t('availability.emptyTitle')} subtitle={t('availability.emptyCopy')} /></Card>
        ) : (
          <Card padded={false}>
            {upcoming.map((s, i) => (
              <View key={s.id} style={[styles.slotRow, isRTL && styles.rtlRow, i < upcoming.length - 1 && styles.border]}>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">{dayjs(s.starts_at).locale(locale).format('ddd، D MMM · h:mm A')}</Txt>
                  <Txt variant="caption" style={{ marginTop: 2 }}>{dayjs(s.ends_at).diff(dayjs(s.starts_at), 'minute')} {t('availability.minutes')} {s.is_peak ? `· ${t('availability.eveningRate')}` : ''}</Txt>
                </View>
                <View style={styles.slotActions}>
                  {!s.booked && dayjs(s.starts_at).isBefore(dayjs().add(72, 'hour')) && (() => {
                    const active = broadcasts.find((item) => item.availability_id === s.id && item.status === 'open');
                    return <Pressable accessibilityRole="button" accessibilityLabel={tr(active ? 'Close Pulse Drop' : 'Broadcast Pulse Drop')} disabled={broadcastBusy === s.id} onPress={() => toggleBroadcast(s)} style={[styles.pulseButton, active && styles.pulseButtonOn]}><Ionicons name={broadcastBusy === s.id ? 'hourglass-outline' : active ? 'radio' : 'megaphone-outline'} size={15} color={active ? colors.white : colors.primary} /><Txt style={[styles.pulseButtonText, active && { color: colors.white }]}>{tr(active ? 'LIVE' : 'PULSE')}</Txt></Pressable>;
                  })()}
                  <Pressable accessibilityRole="button" accessibilityLabel={t('availability.remove')} hitSlop={10} disabled={s.booked} onPress={() => confirm({ title: t('availability.removeTitle'), message: t('availability.removeCopy'), confirmLabel: t('availability.remove'), destructive: true }, async () => { await removeAvailability(s.id); await load(); })}>
                    <Ionicons name={s.booked ? 'lock-closed' : 'trash-outline'} size={18} color={s.booked ? colors.textDim : colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DemandMetric({ value, label, localeTag }: { value: number; label: string; localeTag: string }) {
  return <View style={styles.demandMetric}><Txt style={styles.demandValue}>{new Intl.NumberFormat(localeTag).format(value)}</Txt><Txt style={styles.demandLabel}>{label}</Txt></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 22, paddingBottom: 40 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.xl, backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  demandCard: { marginTop: 14, borderRadius: radius.xl, padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primaryBorder },
  demandTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  pulseIcon: { width: 43, height: 43, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  demandTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary, marginTop: 3 },
  demandMetrics: { flexDirection: 'row', gap: 8, marginTop: 14 },
  demandMetric: { flex: 1, borderRadius: radius.md, padding: 10, backgroundColor: colors.surfaceElevated },
  demandValue: { fontFamily: fonts.extrabold, fontSize: 19, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  demandLabel: { fontFamily: fonts.medium, fontSize: 9, color: colors.textMuted, marginTop: 2 },
  label: { marginTop: 24, marginBottom: 12 },
  openingHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 24, marginBottom: 13 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 },
  slotRow: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
  slotActions: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  pulseButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder },
  pulseButtonOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pulseButtonText: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 0.8, color: colors.primary },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
