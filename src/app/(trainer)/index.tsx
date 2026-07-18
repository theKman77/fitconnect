import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { colors, fonts, radius } from '@/theme';
import { config, formatMoney } from '@/lib/config';
import { useAuth } from '@/context/auth';
import { getMyTrainer, listTrainerBookings, setTrainerOnline, STATUS_LABEL } from '@/lib/trainer';
import { tierForSessions, repeatClientFeePct, TRAINER_TIERS } from '@/lib/gamification';
import { Avatar, Badge, Card, Txt } from '@/components/ui';
import { notify } from '@/lib/confirm';
import type { Booking, Trainer } from '@/types/domain';

const ACTIVE: string[] = ['confirmed', 'en_route', 'arriving', 'in_progress'];

export default function TrainerDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [online, setOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const t = await getMyTrainer(profile);
      setTrainer(t);
      setOnline(!!t?.available_now);
      setBookings(await listTrainerBookings(t));
    } catch (e: any) {
      setLoadError(e?.message ?? 'Could not refresh the trainer dashboard.');
    }
  }, [profile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleOnline(v: boolean) {
    setOnline(v);
    try {
      await setTrainerOnline(trainer, v);
    } catch (e: any) {
      setOnline(!v);
      notify('Status not changed', e?.message ?? 'Please try again.');
    }
  }

  // ---- derived ----
  const upcoming = bookings.filter((b) => ACTIVE.includes(b.status));
  const completedAll = bookings.filter((b) => b.status === 'completed');
  const paidCompleted = completedAll.filter((b) => b.paid);
  const firstName = (profile?.full_name ?? 'Coach').split(' ')[0];

  // Earnings by week, last 6 weeks (trainer's cut = total - platform fee).
  const weeks = Array.from({ length: 6 }).map((_, i) => dayjs().startOf('week').subtract(5 - i, 'week'));
  const weeklyEarnings = weeks.map((w) =>
    paidCompleted
      .filter((b) => dayjs(b.scheduled_at ?? b.created_at).isSame(w, 'week'))
      .reduce((s, b) => s + (b.trainer_payout ?? 0), 0),
  );
  const totalEarnings = paidCompleted.reduce((s, b) => s + (b.trainer_payout ?? 0), 0);
  const demoPipeline = completedAll.filter((b) => !b.paid).reduce((s, b) => s + (b.trainer_payout ?? 0), 0);
  const maxWeek = Math.max(1, ...weeklyEarnings);

  // Tier ladder — progress accrues only from on-platform completed sessions.
  const tier = tierForSessions(completedAll.length);

  // Client roster with per-client repeat discount (anti-poaching lever).
  const byClient = new Map<string, number>();
  for (const b of completedAll) byClient.set(b.client_id, (byClient.get(b.client_id) ?? 0) + 1);
  const roster = [...byClient.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Week at a glance: sessions per day, next 7 days.
  const days = Array.from({ length: 7 }).map((_, i) => dayjs().add(i, 'day'));
  const perDay = days.map((d) => upcoming.filter((b) => b.scheduled_at && dayjs(b.scheduled_at).isSame(d, 'day')).length);

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
          {loadError && <Txt variant="caption" color={colors.danger} style={{ marginBottom: 10 }}>{loadError}</Txt>}
          {trainer?.onboarding_status && trainer.onboarding_status !== 'approved' && (
            <Card onPress={() => router.push('/trainer-edit' as any)} style={{ marginBottom: 10, borderColor: colors.primaryBorder }}>
              <View style={styles.onlineRow}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">Finish trainer setup</Txt>
                  <Txt variant="caption" style={{ marginTop: 2 }}>Your profile is private until FitConnect approves it.</Txt>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
              </View>
            </Card>
          )}
          <Card style={online ? styles.onlineCard : undefined}>
            <View style={styles.onlineRow}>
              <View style={[styles.pulse, { backgroundColor: online ? colors.success : colors.textFaint }]} />
              <View style={{ flex: 1 }}>
                <Txt variant="cardTitle">{online ? "You're online" : "You're offline"}</Txt>
                <Txt variant="caption" style={{ marginTop: 2 }}>
                  {online ? 'Clients can book you now' : 'Go online to receive bookings'}
                </Txt>
              </View>
              <Switch value={online} onValueChange={toggleOnline}
                trackColor={{ false: colors.surfaceHigh, true: colors.success }} thumbColor={colors.white} />
            </View>
          </Card>
        </View>

        {/* Tier ladder */}
        <View style={styles.section}>
          <Card onPress={() => router.push('/trainer-availability' as any)}>
            <View style={styles.onlineRow}>
              <View style={styles.bookingIcon}><Ionicons name="calendar" size={18} color={colors.primary} /></View>
              <View style={{ flex: 1 }}><Txt variant="bodyStrong">Publish your schedule</Txt><Txt variant="caption" style={{ marginTop: 2 }}>Open and close bookable times in two taps</Txt></View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <View style={styles.tierCard}>
            <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.tierTop}>
              <View style={{ flex: 1 }}>
                <Txt style={styles.tierName}>
                  <Ionicons name={tier.current.icon} size={18} color={colors.white} />  {tier.current.name} trainer
                </Txt>
                <Txt style={styles.tierSub}>Platform fee: {tier.current.feePct}% · {completedAll.length} sessions completed</Txt>
              </View>
            </View>
            {tier.next && (
              <>
                <View style={styles.tierTrack}>
                  <View style={[styles.tierFill, { width: `${Math.max(4, tier.progress * 100)}%` }]} />
                </View>
                <Txt style={styles.tierNext}>
                  {tier.next.minSessions - completedAll.length} sessions to {tier.next.name} — fee drops to {tier.next.feePct}%, {tier.next.perks[0].toLowerCase()}
                </Txt>
              </>
            )}
          </View>
        </View>

        {/* Earnings */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Txt variant="sectionTitle">Earnings</Txt>
            <Txt style={styles.earningsTotal}>{formatMoney(totalEarnings)}</Txt>
          </View>
          <Card style={{ marginTop: 12 }}>
            <View style={styles.chart}>
              {weeklyEarnings.map((v, i) => (
                <View key={i} style={styles.chartCol}>
                  <View style={[styles.chartBar, { height: 8 + (v / maxWeek) * 56, opacity: v === 0 ? 0.25 : 0.9 }]} />
                  <Txt style={styles.chartLbl}>{weeks[i].format('D/M')}</Txt>
                </View>
              ))}
            </View>
            <View style={styles.protectRow}>
              <Ionicons name={config.paymentsEnabled ? 'shield-checkmark' : 'flask'} size={14} color={config.paymentsEnabled ? colors.success : colors.primary} />
              <Txt variant="caption" style={{ flex: 1 }}>
                {config.paymentsEnabled ? 'Paid, completed sessions are eligible for payout.' : `Demo mode: no cash is payable. Simulated pipeline value ${formatMoney(demoPipeline)}.`}
              </Txt>
            </View>
          </Card>
        </View>

        {/* Week at a glance */}
        <View style={styles.section}>
          <Txt variant="sectionTitle" style={{ marginBottom: 12 }}>This week</Txt>
          <View style={styles.weekRow}>
            {days.map((d, i) => (
              <View key={i} style={[styles.dayCell, perDay[i] > 0 && styles.dayCellOn]}>
                <Txt style={[styles.dayLbl, perDay[i] > 0 && { color: colors.primary }]}>{d.format('dd')[0]}</Txt>
                <Txt style={[styles.dayNum, perDay[i] > 0 && { color: colors.textPrimary }]}>{d.format('D')}</Txt>
                {perDay[i] > 0 && <View style={styles.dayDot} />}
              </View>
            ))}
          </View>
        </View>

        {/* Client roster */}
        <View style={styles.section}>
          <Txt variant="sectionTitle" style={{ marginBottom: 4 }}>Your clients</Txt>
          <Txt variant="caption" style={{ marginBottom: 12 }}>
            Your fee drops the longer a client stays with you.
          </Txt>
          {roster.length === 0 ? (
            <Card>
              <View style={styles.emptyRoster}>
                <Ionicons name="people" size={22} color={colors.textFaint} />
                <Txt variant="caption" style={{ flex: 1 }}>
                  Clients you complete sessions with appear here, with their loyalty fee discount.
                </Txt>
              </View>
            </Card>
          ) : (
            <Card padded={false}>
              {roster.map(([clientId, count], i) => {
                const fee = repeatClientFeePct(count, tier.current.feePct);
                return (
                  <View key={clientId} style={[styles.clientRow, i < roster.length - 1 && styles.clientBorder]}>
                    <Avatar name={`C ${i + 1}`} size={40} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="bodyStrong">Client</Txt>
                      <Txt variant="caption" style={{ marginTop: 2 }}>{count} session{count === 1 ? '' : 's'} together</Txt>
                    </View>
                    <Badge label={`${fee}% FEE`} tone={fee < tier.current.feePct ? 'success' : 'neutral'} />
                  </View>
                );
              })}
            </Card>
          )}
        </View>

        {/* Upcoming sessions */}
        <View style={styles.section}>
          <Txt variant="sectionTitle" style={{ marginBottom: 12 }}>Upcoming sessions</Txt>
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
              <Card>
                <View style={styles.emptyRoster}>
                  <Ionicons name="calendar-outline" size={22} color={colors.textFaint} />
                  <Txt variant="caption" style={{ flex: 1 }}>No upcoming sessions. Go online so clients can book you.</Txt>
                </View>
              </Card>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 6 },
  section: { paddingHorizontal: 22, marginTop: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  onlineCard: { borderColor: 'rgba(59,209,111,0.4)' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pulse: { width: 12, height: 12, borderRadius: 6 },

  tierCard: { borderRadius: radius.xl, overflow: 'hidden', padding: 18 },
  tierTop: { flexDirection: 'row', alignItems: 'center' },
  tierName: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.white },
  tierSub: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  tierTrack: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 16 },
  tierFill: { height: '100%', backgroundColor: colors.white, borderRadius: 4 },
  tierNext: { fontFamily: fonts.medium, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 8 },

  earningsTotal: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.textPrimary },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 84 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  chartBar: { width: '62%', backgroundColor: colors.primary, borderRadius: 4 },
  chartLbl: { fontFamily: fonts.mono, fontSize: 9, color: colors.textDim },
  protectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },

  weekRow: { flexDirection: 'row', gap: 8 },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 3 },
  dayCellOn: { borderColor: colors.primaryBorder, backgroundColor: colors.primaryTint },
  dayLbl: { fontFamily: fonts.monoBold, fontSize: 10, color: colors.textDim },
  dayNum: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },

  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  clientBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  emptyRoster: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookingIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
});
