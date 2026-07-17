import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { Card, Txt } from '@/components/ui';

const WEIGHTS = [186, 184, 183, 182, 181, 180];
const MILESTONES = [
  { icon: 'trophy', label: 'First 10 sessions', done: true },
  { icon: 'flame', label: '5-week streak', done: true },
  { icon: 'barbell', label: 'New squat PR', done: false },
];
const WORKOUTS = [
  { title: 'Strength & conditioning', trainer: 'Maya Okafor', when: '2 days ago' },
  { title: 'Mobility flow', trainer: 'Aisha Rahman', when: 'Last week' },
  { title: 'HIIT circuit', trainer: 'Diego Santos', when: 'Last week' },
];

export default function Progress() {
  const min = Math.min(...WEIGHTS);
  const max = Math.max(...WEIGHTS);
  const range = Math.max(1, max - min);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}><Txt variant="screenTitle">Progress</Txt></View>

        {/* Weight card */}
        <View style={styles.section}>
          <Card>
            <View style={styles.weightHead}>
              <View>
                <Txt variant="label">Weight</Txt>
                <View style={styles.weightRow}>
                  <Txt style={styles.weightVal}>{WEIGHTS[WEIGHTS.length - 1]}</Txt>
                  <Txt variant="caption"> lb</Txt>
                </View>
              </View>
              <View style={styles.deltaPill}>
                <Ionicons name="arrow-down" size={13} color={colors.success} />
                <Txt style={styles.deltaTxt}>6 lb</Txt>
                <Txt variant="caption"> · 6 wks</Txt>
              </View>
            </View>
            <View style={styles.chart}>
              {WEIGHTS.map((w, i) => (
                <View key={i} style={styles.barWrap}>
                  <View style={[styles.bar, { height: 12 + ((w - min) / range) * 60 }]} />
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* Milestones */}
        <View style={styles.section}>
          <Txt variant="sectionTitle" style={{ marginBottom: 14 }}>Milestones</Txt>
          <View style={{ gap: 10 }}>
            {MILESTONES.map((m) => (
              <Card key={m.label}>
                <View style={styles.milestone}>
                  <View style={[styles.mIcon, { backgroundColor: m.done ? colors.primaryTint : colors.surfaceElevated }]}>
                    <Ionicons name={m.icon as any} size={18} color={m.done ? colors.primary : colors.textDim} />
                  </View>
                  <Txt variant="bodyStrong" style={{ flex: 1 }}>{m.label}</Txt>
                  {m.done
                    ? <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    : <Txt variant="caption">In progress</Txt>}
                </View>
              </Card>
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
                    <Txt variant="caption" style={{ marginTop: 2 }}>with {w.trainer}</Txt>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 4 },
  section: { paddingHorizontal: 22, marginTop: 20 },
  weightHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  weightRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  weightVal: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.textPrimary },
  deltaPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.successTint, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5,
  },
  deltaTxt: { fontFamily: fonts.bold, fontSize: 13, color: colors.success },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 20, height: 76 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', backgroundColor: colors.primary, borderRadius: 4, opacity: 0.85 },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  workout: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
});
