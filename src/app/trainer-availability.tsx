import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { colors, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { addAvailability, getMyTrainer, listAvailability, removeAvailability } from '@/lib/trainer';
import { confirm, notify } from '@/lib/confirm';
import { Badge, Card, EmptyState, Txt } from '@/components/ui';
import { DateRangePicker } from '@/components/scheduling/date-range-picker';
import { TimeOpeningPicker } from '@/components/scheduling/time-opening-picker';
import type { AvailabilitySlot, Trainer } from '@/types/domain';

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
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [day, setDay] = useState(dayjs().add(1, 'day').startOf('day'));
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const current = await getMyTrainer(profile);
      setTrainer(current);
      setSlots(await listAvailability(current));
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Ionicons name="chevron-back" size={24} color={colors.textPrimary} /></Pressable>
        <Txt variant="sectionTitle">Availability</Txt>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentInsetAdjustmentBehavior="automatic" refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="calendar" size={22} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Txt variant="cardTitle">Own your week</Txt>
            <Txt variant="caption" style={{ marginTop: 3 }}>Publish only the times you want clients to book. Tap a time again to remove it.</Txt>
          </View>
        </View>
        {error && <Txt variant="caption" color={colors.danger} style={{ marginTop: 12 }}>{error}</Txt>}

        <Txt variant="label" style={styles.label}>Choose a day</Txt>
        <DateRangePicker
          selected={day}
          onSelect={setDay}
          maxDaysAhead={84}
          countForDate={(date) => slots.filter((slot) => dayjs(slot.starts_at).isSame(date, 'day')).length}
        />

        <View style={styles.openingHead}>
          <View><Txt variant="label">One-hour openings</Txt><Txt variant="caption" style={{ marginTop: 3 }}>{day.format('dddd, MMMM D')}</Txt></View>
          <Badge label={`${timeOptions.filter((option) => option.active).length} SELECTED`} tone={timeOptions.some((option) => option.active) ? 'brand' : 'neutral'} />
        </View>
        <TimeOpeningPicker multiple options={timeOptions} onPress={(option) => toggleTime(option.hour, option.minute)} />

        <View style={styles.sectionHead}>
          <Txt variant="sectionTitle">Published openings</Txt>
          <Badge label={`${slots.length} LIVE`} tone={slots.length ? 'success' : 'neutral'} />
        </View>
        {upcoming.length === 0 ? (
          <Card><EmptyState icon="calendar-outline" title="No openings published" subtitle="Choose a day and tap the times clients may book." /></Card>
        ) : (
          <Card padded={false}>
            {upcoming.map((s, i) => (
              <View key={s.id} style={[styles.slotRow, i < upcoming.length - 1 && styles.border]}>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">{dayjs(s.starts_at).format('ddd, MMM D · h:mm A')}</Txt>
                  <Txt variant="caption" style={{ marginTop: 2 }}>{dayjs(s.ends_at).diff(dayjs(s.starts_at), 'minute')} minutes {s.is_peak ? '· evening rate' : ''}</Txt>
                </View>
                <Pressable hitSlop={10} disabled={s.booked} onPress={() => confirm({ title: 'Remove opening?', message: 'Clients will no longer see this time.', confirmLabel: 'Remove', destructive: true }, async () => { await removeAvailability(s.id); await load(); })}>
                  <Ionicons name={s.booked ? 'lock-closed' : 'trash-outline'} size={18} color={s.booked ? colors.textDim : colors.danger} />
                </Pressable>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 22, paddingBottom: 40 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.xl, backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 24, marginBottom: 12 },
  openingHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 24, marginBottom: 13 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 },
  slotRow: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
