import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { colors, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { useAuth } from '@/context/auth';
import { listMyBookings } from '@/lib/bookings';
import { listTrainers } from '@/lib/api';
import { Badge, Card, Txt } from '@/components/ui';
import type { Booking, BookingStatus, Trainer } from '@/types/domain';

const STATUS_TONE: Record<string, 'success' | 'brand' | 'neutral' | 'danger'> = {
  completed: 'success',
  confirmed: 'brand',
  cancelled: 'danger',
};

/** Showcase past sessions so the screen isn't empty on first open. */
const PAST: Array<{ trainer: string; when: string; total: number; status: BookingStatus }> = [
  { trainer: 'Maya Okafor', when: dayjs().subtract(2, 'day').toISOString(), total: 308, status: 'completed' },
  { trainer: 'Aisha Rahman', when: dayjs().subtract(9, 'day').toISOString(), total: 220, status: 'completed' },
  { trainer: 'Diego Santos', when: dayjs().subtract(16, 'day').toISOString(), total: 242, status: 'completed' },
];

export default function History() {
  const router = useRouter();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allTrainers, setAllTrainers] = useState<Trainer[]>([]);

  useEffect(() => {
    listMyBookings(profile?.id ?? 'demo-client').then(setBookings);
    listTrainers().then(setAllTrainers);
  }, [profile?.id]);

  const trainerName = (id: string) => allTrainers.find((t) => t.id === id)?.display_name ?? 'Trainer';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Txt variant="sectionTitle">Session history</Txt>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 22, gap: 12 }} showsVerticalScrollIndicator={false}>
        {bookings.length > 0 && (
          <Txt variant="label" style={{ marginBottom: 2 }}>This session</Txt>
        )}
        {bookings.map((b) => (
          <Card key={b.id} onPress={() => router.push(`/session/${b.id}/track`)}>
            <Row
              name={trainerName(b.trainer_id)}
              when={b.scheduled_at ?? b.created_at}
              total={b.amount_due}
              status={b.status}
            />
          </Card>
        ))}

        <Txt variant="label" style={{ marginTop: bookings.length ? 14 : 0, marginBottom: 2 }}>Earlier</Txt>
        {PAST.map((p, i) => (
          <Card key={i}>
            <Row name={p.trainer} when={p.when} total={p.total} status={p.status} />
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ name, when, total, status }: { name: string; when: string; total: number; status: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}><Ionicons name="barbell" size={18} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong">{name}</Txt>
        <Txt variant="caption" style={{ marginTop: 2 }}>{dayjs(when).format('ddd, MMM D · h:mm A')}</Txt>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <Txt variant="bodyStrong">{formatMoney(total)}</Txt>
        <Badge label={status.replace('_', ' ').toUpperCase()} tone={STATUS_TONE[status] ?? 'neutral'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
});
