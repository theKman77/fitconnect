import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { colors, fonts, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { addAvailability, getMyTrainer, listAvailability, removeAvailability } from '@/lib/trainer';
import { confirm, notify } from '@/lib/confirm';
import { Badge, Card, EmptyState, Txt } from '@/components/ui';
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
  const days = Array.from({ length: 14 }, (_, i) => dayjs().startOf('day').add(i, 'day'));

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

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Ionicons name="chevron-back" size={24} color={colors.textPrimary} /></Pressable>
        <Txt variant="sectionTitle">Availability</Txt>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />} contentContainerStyle={{ padding: 22, paddingBottom: 40 }}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="calendar" size={22} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Txt variant="cardTitle">Own your week</Txt>
            <Txt variant="caption" style={{ marginTop: 3 }}>Publish only the times you want clients to book. Tap a time again to remove it.</Txt>
          </View>
        </View>
        {error && <Txt variant="caption" color={colors.danger} style={{ marginTop: 12 }}>{error}</Txt>}

        <Txt variant="label" style={styles.label}>Choose a day</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -22 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 22 }}>
          {days.map((d) => {
            const selected = d.isSame(day, 'day');
            const count = slots.filter((s) => dayjs(s.starts_at).isSame(d, 'day')).length;
            return (
              <Pressable key={d.format('YYYY-MM-DD')} onPress={() => setDay(d)} style={[styles.day, selected && styles.dayOn]}>
                <Txt style={[styles.dayName, selected && { color: colors.primary }]}>{d.isSame(dayjs(), 'day') ? 'TODAY' : d.format('ddd').toUpperCase()}</Txt>
                <Txt style={styles.dayNumber}>{d.format('D')}</Txt>
                <Txt variant="caption">{count ? `${count} open` : d.format('MMM')}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        <Txt variant="label" style={styles.label}>One-hour openings</Txt>
        <View style={styles.timeGrid}>
          {TIMES.map((t) => {
            const start = day.hour(t.hour).minute(t.minute ?? 0).second(0).millisecond(0);
            const active = slots.some((s) => dayjs(s.starts_at).isSame(start, 'minute'));
            const past = start.isBefore(dayjs().add(15, 'minute'));
            return (
              <Pressable key={t.label} disabled={past || busyKey === start.toISOString()} onPress={() => toggleTime(t.hour, t.minute)}
                style={[styles.time, active && styles.timeOn, past && { opacity: 0.35 }]}>
                <Ionicons name={active ? 'checkmark-circle' : 'add-circle-outline'} size={17} color={active ? colors.white : colors.primary} />
                <Txt style={[styles.timeText, active && { color: colors.white }]}>{t.label}</Txt>
              </Pressable>
            );
          })}
        </View>

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
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.xl, backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 24, marginBottom: 12 },
  day: { width: 78, paddingVertical: 12, alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dayOn: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  dayName: { fontFamily: fonts.monoBold, fontSize: 9, color: colors.textDim },
  dayNumber: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.textPrimary, marginVertical: 3 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  time: { width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primaryBorder, backgroundColor: colors.surface },
  timeOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 },
  slotRow: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
