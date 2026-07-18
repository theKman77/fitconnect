import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { colors, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { useAuth } from '@/context/auth';
import { getMyTrainer, listTrainerBookings, STATUS_LABEL } from '@/lib/trainer';
import { Badge, Card, Txt } from '@/components/ui';
import { Segmented } from '@/components/ui/Segmented';
import type { Booking } from '@/types/domain';

const ACTIVE = ['pending', 'confirmed', 'en_route', 'arriving', 'in_progress'];

export default function TrainerBookings() {
  const router = useRouter();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const t = await getMyTrainer(profile);
      setBookings(await listTrainerBookings(t));
    } catch (e: any) {
      setError(e?.message ?? 'Could not load bookings.');
    }
  }, [profile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = bookings.filter((b) =>
    tab === 'upcoming' ? ACTIVE.includes(b.status) : !ACTIVE.includes(b.status));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}><Txt variant="screenTitle">Bookings</Txt></View>
      <View style={styles.segment}>
        <Segmented
          options={[{ key: 'upcoming', label: 'Upcoming' }, { key: 'past', label: 'Past' }]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 8, gap: 12 }} showsVerticalScrollIndicator={false}>
        {error && <Txt variant="caption" color={colors.danger}>{error}</Txt>}
        {shown.map((b) => (
          <Card key={b.id} onPress={() => router.push({ pathname: '/trainer-session/[id]', params: { id: b.id } })}>
            <View style={styles.row}>
              <View style={styles.icon}><Ionicons name="barbell" size={18} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong">
                  {b.scheduled_at ? dayjs(b.scheduled_at).format('ddd, MMM D · h:mm A') : 'Session'}
                </Txt>
                <Txt variant="caption" style={{ marginTop: 2 }}>
                  {b.format === 'virtual' ? 'Virtual session' : b.address_line ?? 'In person'}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <Txt variant="bodyStrong">{formatMoney(b.trainer_payout ?? 0)}</Txt>
                {!b.paid && <Txt variant="caption">estimate</Txt>}
                <Badge label={STATUS_LABEL[b.status].toUpperCase()}
                  tone={b.status === 'completed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'brand'} />
              </View>
            </View>
          </Card>
        ))}
        {shown.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={28} color={colors.textFaint} />
            <Txt variant="body" center style={{ marginTop: 10 }}>
              {tab === 'upcoming' ? 'No upcoming bookings yet.' : 'No past sessions yet.'}
            </Txt>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 22, paddingTop: 12 },
  segment: { paddingHorizontal: 22, paddingVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 20 },
});
