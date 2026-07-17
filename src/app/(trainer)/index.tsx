import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { colors, fonts, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { useAuth } from '@/context/auth';
import { getMyTrainer, listTrainerBookings, setTrainerOnline, estimateEarnings, STATUS_LABEL } from '@/lib/trainer';
import { Avatar, Badge, Card, Txt } from '@/components/ui';
import type { Booking, Trainer } from '@/types/domain';

const ACTIVE: string[] = ['confirmed', 'en_route', 'arriving', 'in_progress'];

export default function TrainerDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [online, setOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const t = await getMyTrainer(profile);
    setTrainer(t);
    setOnline(!!t?.available_now);
    setBookings(await listTrainerBookings(t));
  }, [profile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleOnline(v: boolean) {
    setOnline(v);
    await setTrainerOnline(trainer, v);
  }

  const upcoming = bookings.filter((b) => ACTIVE.includes(b.status));
  const firstName = (profile?.full_name ?? 'Coach').split(' ')[0];
  const earnings = estimateEarnings(bookings);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Txt variant="mono" style={{ color: colors.textMuted }}>TRAINER</Txt>
            <Txt variant="screenTitle" style={{ marginTop: 2 }}>Hi, {firstName}</Txt>
          </View>
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={46} />
        </View>

        {/* Online toggle */}
        <View style={styles.section}>
          <Card style={online ? styles.onlineCard : undefined}>
            <View style={styles.onlineRow}>
              <View style={[styles.pulse, { backgroundColor: online ? colors.success : colors.textFaint }]} />
              <View style={{ flex: 1 }}>
                <Txt variant="cardTitle">{online ? "You're online" : "You're offline"}</Txt>
                <Txt variant="caption" style={{ marginTop: 2 }}>
                  {online ? 'Clients can book you now' : 'Go online to receive bookings'}
                </Txt>
              </View>
              <Switch
                value={online}
                onValueChange={toggleOnline}
                trackColor={{ false: colors.surfaceHigh, true: colors.success }}
                thumbColor={colors.white}
              />
            </View>
          </Card>
        </View>

        {/* Stats */}
        <View style={[styles.section, styles.statsRow]}>
          <Stat label="Earnings" value={formatMoney(earnings)} icon="wallet" />
          <Stat label="Upcoming" value={String(upcoming.length)} icon="calendar" />
          <Stat label="Rating" value={trainer ? trainer.rating.toFixed(1) : '—'} icon="star" />
        </View>

        {/* Upcoming sessions */}
        <View style={styles.section}>
          <Txt variant="sectionTitle" style={{ marginBottom: 14 }}>Upcoming sessions</Txt>
          <View style={{ gap: 10 }}>
            {upcoming.map((b) => (
              <Card key={b.id} onPress={() => router.push({ pathname: '/trainer-session/[id]', params: { id: b.id } })}>
                <View style={styles.bookingRow}>
                  <View style={styles.bookingIcon}><Ionicons name="barbell" size={18} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong">
                      {b.scheduled_at ? dayjs(b.scheduled_at).format('ddd, MMM D · h:mm A') : 'Session'}
                    </Txt>
                    <Txt variant="caption" style={{ marginTop: 2 }}>
                      {b.format === 'virtual' ? 'Virtual' : b.address_line ?? 'In person'}
                    </Txt>
                  </View>
                  <Badge label={STATUS_LABEL[b.status].toUpperCase()} tone={b.status === 'in_progress' ? 'success' : 'brand'} />
                </View>
              </Card>
            ))}
            {upcoming.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={28} color={colors.textFaint} />
                <Txt variant="body" center style={{ marginTop: 10 }}>
                  No upcoming sessions. Go online so clients can book you.
                </Txt>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <Card style={{ flex: 1 }}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Txt variant="screenTitle" style={{ fontSize: 20, marginTop: 8 }}>{value}</Txt>
      <Txt variant="caption" style={{ marginTop: 2 }}>{label}</Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 6 },
  section: { paddingHorizontal: 22, marginTop: 16 },
  onlineCard: { borderColor: 'rgba(59,209,111,0.4)' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pulse: { width: 12, height: 12, borderRadius: 6 },
  statsRow: { flexDirection: 'row', gap: 10 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookingIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
});
