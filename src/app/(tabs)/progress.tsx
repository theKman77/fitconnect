import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { colors, fonts, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { isBackendConfigured } from '@/lib/supabase';
import { listMyBookings } from '@/lib/bookings';
import { listTrainers } from '@/lib/api';
import { listWeights, addWeight, listPRs, upsertPR, workoutsFromBookings, weeklyStreak, countReviewsGiven } from '@/lib/progress';
import { computeXP, levelFromXP, ACHIEVEMENTS, ClientStats } from '@/lib/gamification';
import { Card, EmptyState, InputSheet, Txt } from '@/components/ui';
import type { Booking, PersonalRecord, ProgressEntry, Trainer } from '@/types/domain';

// Demo-mode showcase stats (kept for the demo profile / Expo Go without backend).
const DEMO_STATS: ClientStats = { sessions: 24, streakWeeks: 5, prCount: 3, reviewsGiven: 6, weightLogs: 6 };
const DEMO_WORKOUTS = [
  { title: 'Strength & conditioning', trainer: 'Maya Okafor', when: '2 days ago', mins: 60 },
  { title: 'Mobility flow', trainer: 'Aisha Rahman', when: 'Last week', mins: 45 },
  { title: 'HIIT circuit', trainer: 'Diego Santos', when: 'Last week', mins: 40 },
];

export default function Progress() {
  const { profile, updateProfile } = useAuth();
  const [weights, setWeights] = useState<ProgressEntry[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allTrainers, setAllTrainers] = useState<Trainer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState<'weight' | 'pr' | 'goal' | null>(null);
  const [reviewsGiven, setReviewsGiven] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clientId = profile?.id ?? 'demo-client';

  const load = useCallback(async () => {
    try {
      setError(null);
      const [w, p, b, t, reviewCount] = await Promise.all([
        listWeights(clientId),
        listPRs(clientId),
        listMyBookings(clientId),
        listTrainers(),
        countReviewsGiven(clientId),
      ]);
      setWeights(w);
      setPRs(p);
      setBookings(b);
      setAllTrainers(t);
      setReviewsGiven(reviewCount);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load progress.');
    } finally {
      setLoaded(true);
    }
  }, [clientId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ---- derived ----
  const completed = workoutsFromBookings(bookings);
  const stats: ClientStats = isBackendConfigured
    ? {
        sessions: completed.length,
        streakWeeks: weeklyStreak(completed.map((b) => b.scheduled_at ?? b.created_at)),
        prCount: prs.length,
        reviewsGiven,
        weightLogs: weights.length,
      }
    : DEMO_STATS;
  const level = levelFromXP(computeXP(stats));
  const earnedCount = ACHIEVEMENTS.filter((a) => a.earned(stats)).length;

  const weightVals = weights.map((w) => w.weight ?? 0).filter(Boolean);
  const current = weightVals[weightVals.length - 1];
  const first = weightVals[0];
  const lost = current != null && first != null ? +(first - current).toFixed(1) : 0;
  const goal = profile?.weight_goal ?? null;
  const goalPct = goal && first && current && first !== goal
    ? Math.max(0, Math.min(1, (first - current) / (first - goal)))
    : 0;
  const chartVals = weightVals.slice(-8);
  const min = Math.min(...chartVals, goal ?? Infinity);
  const range = Math.max(1, Math.max(...chartVals) - min);

  const hours = isBackendConfigured
    ? Math.round(completed.reduce((s, b) => s + (b.duration_min || 60), 0) / 60)
    : 36;

  const trainerName = (id: string) => allTrainers.find((t) => t.id === id)?.display_name ?? 'your trainer';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={styles.header}><Txt variant="screenTitle">Progress</Txt></View>
        {error && <View style={styles.section}><Card><EmptyState icon="cloud-offline-outline" title="Progress unavailable" subtitle={error} actionLabel="Try again" onAction={load} /></Card></View>}

        {/* Level + streak hero */}
        <View style={styles.section}>
          <View style={styles.hero}>
            <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Txt style={styles.heroLevel}>Level {level.level} · {level.name}</Txt>
                <Txt style={styles.heroSub}>
                  {stats.streakWeeks > 0 ? `${stats.streakWeeks}-week streak 🔥` : 'Book a session to start your streak'}
                </Txt>
              </View>
              <View style={styles.xpRing}>
                <Txt style={styles.xpTxt}>{level.xp}</Txt>
                <Txt style={styles.xpLbl}>XP</Txt>
              </View>
            </View>
            <View style={styles.heroTrack}>
              <View style={[styles.heroFill, { width: `${Math.max(4, level.progress * 100)}%` }]} />
            </View>
            <Txt style={styles.heroNext}>
              {level.progress >= 1 ? 'Max level — legend status' : `${level.levelSpan - level.intoLevel} XP to level ${level.level + 1}`}
            </Txt>
          </View>
        </View>

        {/* Stat tiles */}
        <View style={[styles.section, styles.statsRow]}>
          <Stat icon="barbell" value={String(stats.sessions)} label="Sessions" />
          <Stat icon="time" value={`${hours}h`} label="Trained" />
          <Stat icon="flame" value={String(stats.streakWeeks)} label="Week streak" />
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Txt variant="sectionTitle">Achievements</Txt>
            <Txt variant="caption">{earnedCount}/{ACHIEVEMENTS.length}</Txt>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 22, paddingTop: 12 }} style={{ marginHorizontal: -22 }}>
            {ACHIEVEMENTS.map((a) => {
              const on = a.earned(stats);
              return (
                <View key={a.id} style={[styles.badge, on ? styles.badgeOn : styles.badgeOff]}>
                  <Ionicons name={a.icon} size={20} color={on ? colors.primary : colors.textFaint} />
                  <Txt style={[styles.badgeTxt, { color: on ? colors.textPrimary : colors.textFaint }]} numberOfLines={2}>
                    {a.title}
                  </Txt>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Weight */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Txt variant="sectionTitle">Weight</Txt>
            <Pressable onPress={() => setSheet('weight')} hitSlop={8}>
              <Txt style={styles.link}>+ Log weight</Txt>
            </Pressable>
          </View>
          {weightVals.length === 0 ? (
            loaded && (
              <Card style={{ marginTop: 12 }}>
                <EmptyState icon="scale" title="No weigh-ins yet"
                  subtitle="Log your first weight to start the chart."
                  actionLabel="Log weight" onAction={() => setSheet('weight')} />
              </Card>
            )
          ) : (
            <Card style={{ marginTop: 12 }}>
              <View style={styles.weightHead}>
                <View>
                  <View style={styles.weightRow}>
                    <Txt style={styles.weightVal}>{current}</Txt>
                    <Txt variant="caption"> kg</Txt>
                    {goal != null && <Txt variant="caption" style={{ marginLeft: 8 }}>→ {goal} kg</Txt>}
                  </View>
                  <Pressable onPress={() => setSheet('goal')} hitSlop={6}>
                    <Txt variant="caption" color={colors.primary} style={{ marginTop: 4 }}>
                      {goal != null ? 'Change goal' : 'Set a goal'}
                    </Txt>
                  </Pressable>
                </View>
                {lost !== 0 && (
                  <View style={[styles.deltaPill, lost < 0 && { backgroundColor: colors.primaryTint }]}>
                    <Ionicons name={lost > 0 ? 'arrow-down' : 'arrow-up'} size={13} color={lost > 0 ? colors.success : colors.primary} />
                    <Txt style={[styles.deltaTxt, lost < 0 && { color: colors.primary }]}>{Math.abs(lost)} kg</Txt>
                  </View>
                )}
              </View>
              {goal != null && goalPct > 0 && (
                <>
                  <View style={styles.goalBar}><View style={[styles.goalFill, { width: `${goalPct * 100}%` }]} /></View>
                  <Txt variant="caption" style={{ marginTop: 6 }}>{Math.round(goalPct * 100)}% of the way to your goal</Txt>
                </>
              )}
              {chartVals.length >= 2 ? (
                <View style={styles.chart}>
                  {chartVals.map((w, i) => (
                    <View key={i} style={styles.barWrap}>
                      <View style={[styles.bar, { height: 10 + ((w - min) / range) * 56 }]} />
                    </View>
                  ))}
                </View>
              ) : (
                <Txt variant="caption" style={{ marginTop: 14 }}>Log a few more weigh-ins to see your trend chart.</Txt>
              )}
            </Card>
          )}
        </View>

        {/* Personal records */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Txt variant="sectionTitle">Personal records</Txt>
            <Pressable onPress={() => setSheet('pr')} hitSlop={8}>
              <Txt style={styles.link}>+ Add PR</Txt>
            </Pressable>
          </View>
          {prs.length === 0 ? (
            loaded && (
              <Card style={{ marginTop: 12 }}>
                <EmptyState icon="trophy" title="No records yet"
                  subtitle="Add your lifts and watch them climb."
                  actionLabel="Add a PR" onAction={() => setSheet('pr')} />
              </Card>
            )
          ) : (
            <View style={[styles.prRow, { marginTop: 12 }]}>
              {prs.slice(0, 6).map((pr) => (
                <View key={pr.id} style={styles.prCard}>
                  <Txt variant="caption" numberOfLines={1}>{pr.lift}</Txt>
                  <Txt style={styles.prVal}>{pr.value} {pr.unit}</Txt>
                  <Txt variant="caption" style={{ marginTop: 4 }}>{dayjs(pr.achieved_at).format('MMM D')}</Txt>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recent workouts */}
        <View style={styles.section}>
          <Txt variant="sectionTitle" style={{ marginBottom: 12 }}>Recent workouts</Txt>
          {isBackendConfigured ? (
            completed.length === 0 ? (
              loaded && (
                <Card>
                  <EmptyState icon="fitness" title="No sessions yet"
                    subtitle="Your completed sessions with trainers will appear here." />
                </Card>
              )
            ) : (
              <View style={{ gap: 10 }}>
                {completed.slice(0, 5).map((b) => (
                  <Card key={b.id}>
                    <View style={styles.workout}>
                      <View style={styles.wIcon}><Ionicons name="fitness" size={18} color={colors.primary} /></View>
                      <View style={{ flex: 1 }}>
                        <Txt variant="bodyStrong">Training session</Txt>
                        <Txt variant="caption" style={{ marginTop: 2 }}>
                          with {trainerName(b.trainer_id)} · {b.duration_min} min
                        </Txt>
                      </View>
                      <Txt variant="caption">{dayjs(b.scheduled_at ?? b.created_at).format('MMM D')}</Txt>
                    </View>
                  </Card>
                ))}
              </View>
            )
          ) : (
            <View style={{ gap: 10 }}>
              {DEMO_WORKOUTS.map((w, i) => (
                <Card key={i}>
                  <View style={styles.workout}>
                    <View style={styles.wIcon}><Ionicons name="fitness" size={18} color={colors.primary} /></View>
                    <View style={{ flex: 1 }}>
                      <Txt variant="bodyStrong">{w.title}</Txt>
                      <Txt variant="caption" style={{ marginTop: 2 }}>with {w.trainer} · {w.mins} min</Txt>
                    </View>
                    <Txt variant="caption">{w.when}</Txt>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Entry sheets */}
      <InputSheet
        visible={sheet === 'weight'}
        title="Log today's weight"
        fields={[{ key: 'kg', label: 'Weight (kg)', placeholder: 'e.g. 80.5', keyboardType: 'decimal-pad' }]}
        onSubmit={async (v) => {
          const kg = parseFloat(v.kg);
          if (isNaN(kg) || kg <= 20 || kg >= 400) throw new Error('Enter a weight between 20 and 400 kg.');
          await addWeight(clientId, kg);
          await load();
        }}
        onClose={() => setSheet(null)}
      />
      <InputSheet
        visible={sheet === 'pr'}
        title="Add a personal record"
        fields={[
          { key: 'lift', label: 'Exercise', placeholder: 'e.g. Back squat' },
          { key: 'value', label: 'Weight (kg)', placeholder: 'e.g. 120', keyboardType: 'decimal-pad' },
        ]}
        onSubmit={async (v) => {
          const val = parseFloat(v.value);
          if (!v.lift.trim()) throw new Error('Enter an exercise name.');
          if (isNaN(val) || val <= 0 || val > 1000) throw new Error('Enter a value between 0 and 1,000 kg.');
          await upsertPR(clientId, v.lift.trim(), val);
          await load();
        }}
        onClose={() => setSheet(null)}
      />
      <InputSheet
        visible={sheet === 'goal'}
        title="Set your weight goal"
        fields={[{ key: 'goal', label: 'Goal weight (kg)', placeholder: 'e.g. 78', keyboardType: 'decimal-pad', initial: goal ? String(goal) : undefined }]}
        onSubmit={async (v) => {
          const g = parseFloat(v.goal);
          if (isNaN(g) || g <= 20 || g >= 400) throw new Error('Enter a goal between 20 and 400 kg.');
          await updateProfile({ weight_goal: g });
        }}
        onClose={() => setSheet(null)}
      />
    </SafeAreaView>
  );
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <Card style={{ flex: 1 }}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Txt style={styles.statVal}>{value}</Txt>
      <Txt variant="caption" style={{ marginTop: 2 }}>{label}</Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 4 },
  section: { paddingHorizontal: 22, marginTop: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },

  hero: { borderRadius: radius.xl, overflow: 'hidden', padding: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroLevel: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.white },
  heroSub: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  xpRing: {
    width: 62, height: 62, borderRadius: 31, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)',
  },
  xpTxt: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.white },
  xpLbl: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.8)' },
  heroTrack: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 16 },
  heroFill: { height: '100%', backgroundColor: colors.white, borderRadius: 4 },
  heroNext: { fontFamily: fonts.medium, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 8 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statVal: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.textPrimary, marginTop: 8 },

  badge: { width: 92, borderRadius: radius.lg, borderWidth: 1, padding: 12, alignItems: 'center', gap: 8, minHeight: 84 },
  badgeOn: { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder },
  badgeOff: { backgroundColor: colors.surface, borderColor: colors.border },
  badgeTxt: { fontFamily: fonts.semibold, fontSize: 11, textAlign: 'center' },

  weightHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  weightRow: { flexDirection: 'row', alignItems: 'baseline' },
  weightVal: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.textPrimary },
  deltaPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.successTint, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  deltaTxt: { fontFamily: fonts.bold, fontSize: 13, color: colors.success },
  goalBar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceHigh, overflow: 'hidden', marginTop: 14 },
  goalFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 18, height: 70 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', backgroundColor: colors.primary, borderRadius: 4, opacity: 0.85 },

  prRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  prCard: { minWidth: '30%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12 },
  prVal: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary, marginTop: 6 },

  workout: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
});
