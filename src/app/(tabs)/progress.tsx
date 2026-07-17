import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { Card, Txt } from '@/components/ui';

const WEIGHTS = [84, 83.2, 82.5, 82, 81.4, 80.8]; // kg, last 6 weeks
const GOAL_WEIGHT = 78;
const STAT = { sessions: 24, hours: 36, streak: 5 };
const PRS = [
  { lift: 'Back squat', value: '120 kg', delta: '+10' },
  { lift: 'Bench press', value: '85 kg', delta: '+5' },
  { lift: 'Deadlift', value: '150 kg', delta: '+12.5' },
];
const WORKOUTS = [
  { title: 'Strength & conditioning', trainer: 'Maya Okafor', when: '2 days ago', mins: 60 },
  { title: 'Mobility flow', trainer: 'Aisha Rahman', when: 'Last week', mins: 45 },
  { title: 'HIIT circuit', trainer: 'Diego Santos', when: 'Last week', mins: 40 },
];
// Demo progress per goal.
const GOAL_PROGRESS: Record<string, number> = {
  'Build muscle': 0.62,
  'Lose weight': 0.48,
  'Improve mobility': 0.75,
  'Boost endurance': 0.4,
  'Sport-specific': 0.3,
  'General fitness': 0.55,
};

export default function Progress() {
  const { profile } = useAuth();
  const goals = profile?.goals?.length ? profile.goals : ['Build muscle', 'Lose weight'];

  const current = WEIGHTS[WEIGHTS.length - 1];
  const start = WEIGHTS[0];
  const lost = +(start - current).toFixed(1);
  const toGoal = +(current - GOAL_WEIGHT).toFixed(1);
  const goalPct = Math.min(1, (start - current) / (start - GOAL_WEIGHT));
  const min = Math.min(...WEIGHTS, GOAL_WEIGHT);
  const max = Math.max(...WEIGHTS);
  const range = Math.max(1, max - min);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={styles.header}><Txt variant="screenTitle">Progress</Txt></View>

        {/* Streak hero */}
        <View style={styles.section}>
          <View style={styles.hero}>
            <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.heroRow}>
              <View>
                <Txt style={styles.heroStreak}>{STAT.streak} week streak</Txt>
                <Txt style={styles.heroSub}>1 more week unlocks a free nutrition consult</Txt>
              </View>
              <Txt style={{ fontSize: 40 }}>🔥</Txt>
            </View>
            <View style={styles.heroTrack}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={[styles.heroPip, i < STAT.streak && styles.heroPipOn]} />
              ))}
            </View>
          </View>
        </View>

        {/* Stat tiles */}
        <View style={[styles.section, styles.statsRow]}>
          <Stat icon="barbell" value={String(STAT.sessions)} label="Sessions" />
          <Stat icon="time" value={`${STAT.hours}h`} label="Trained" />
          <Stat icon="trending-up" value={`${lost}kg`} label="Lost" tint={colors.success} />
        </View>

        {/* Weight goal */}
        <View style={styles.section}>
          <Card>
            <View style={styles.weightHead}>
              <View>
                <Txt variant="label">Weight goal</Txt>
                <View style={styles.weightRow}>
                  <Txt style={styles.weightVal}>{current}</Txt>
                  <Txt variant="caption"> kg</Txt>
                  <Txt variant="caption" style={{ marginLeft: 8 }}>→ {GOAL_WEIGHT} kg</Txt>
                </View>
              </View>
              <View style={styles.deltaPill}>
                <Ionicons name="arrow-down" size={13} color={colors.success} />
                <Txt style={styles.deltaTxt}>{lost} kg</Txt>
              </View>
            </View>

            {/* progress to goal */}
            <View style={styles.goalBar}>
              <View style={[styles.goalFill, { width: `${goalPct * 100}%` }]} />
            </View>
            <Txt variant="caption" style={{ marginTop: 6 }}>{toGoal} kg to go · {Math.round(goalPct * 100)}% there</Txt>

            {/* mini chart */}
            <View style={styles.chart}>
              {WEIGHTS.map((w, i) => (
                <View key={i} style={styles.barWrap}>
                  <View style={[styles.bar, { height: 10 + ((w - min) / range) * 56 }]} />
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* Goals */}
        <View style={styles.section}>
          <Txt variant="sectionTitle" style={{ marginBottom: 14 }}>Your goals</Txt>
          <Card>
            {goals.map((g, i) => {
              const pct = GOAL_PROGRESS[g] ?? 0.5;
              return (
                <View key={g} style={[styles.goalRow, i < goals.length - 1 && styles.goalRowBorder]}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.goalTop}>
                      <Txt variant="bodyStrong">{g}</Txt>
                      <Txt variant="caption" color={colors.primary}>{Math.round(pct * 100)}%</Txt>
                    </View>
                    <View style={styles.miniTrack}>
                      <View style={[styles.miniFill, { width: `${pct * 100}%` }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>

        {/* Personal records */}
        <View style={styles.section}>
          <Txt variant="sectionTitle" style={{ marginBottom: 14 }}>Personal records</Txt>
          <View style={styles.prRow}>
            {PRS.map((pr) => (
              <View key={pr.lift} style={styles.prCard}>
                <Txt variant="caption" numberOfLines={1}>{pr.lift}</Txt>
                <Txt style={styles.prVal}>{pr.value}</Txt>
                <View style={styles.prDelta}>
                  <Ionicons name="arrow-up" size={11} color={colors.success} />
                  <Txt style={styles.prDeltaTxt}>{pr.delta}</Txt>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent workouts */}
        <View style={styles.section}>
          <Txt variant="sectionTitle" style={{ marginBottom: 14 }}>Recent workouts</Txt>
          <View style={{ gap: 10 }}>
            {WORKOUTS.map((w, i) => (
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ icon, value, label, tint }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; tint?: string }) {
  return (
    <Card style={{ flex: 1 }}>
      <Ionicons name={icon} size={18} color={tint ?? colors.primary} />
      <Txt style={[styles.statVal, tint ? { color: tint } : null]}>{value}</Txt>
      <Txt variant="caption" style={{ marginTop: 2 }}>{label}</Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 4 },
  section: { paddingHorizontal: 22, marginTop: 18 },

  hero: { borderRadius: radius.xl, overflow: 'hidden', padding: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStreak: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.white },
  heroSub: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, maxWidth: 220 },
  heroTrack: { flexDirection: 'row', gap: 6, marginTop: 18 },
  heroPip: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.28)' },
  heroPipOn: { backgroundColor: colors.white },

  statsRow: { flexDirection: 'row', gap: 10 },
  statVal: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.textPrimary, marginTop: 8 },

  weightHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  weightRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  weightVal: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.textPrimary },
  deltaPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.successTint, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  deltaTxt: { fontFamily: fonts.bold, fontSize: 13, color: colors.success },
  goalBar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceHigh, overflow: 'hidden', marginTop: 16 },
  goalFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 18, height: 70 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', backgroundColor: colors.primary, borderRadius: 4, opacity: 0.85 },

  goalRow: { paddingVertical: 12 },
  goalRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  miniTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  miniFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },

  prRow: { flexDirection: 'row', gap: 10 },
  prCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12 },
  prVal: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary, marginTop: 6 },
  prDelta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  prDeltaTxt: { fontFamily: fonts.bold, fontSize: 12, color: colors.success },

  workout: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
});
