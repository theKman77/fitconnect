import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { Button, Card, Chip, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { goalOptions, experienceLevels, injuryOptions } from '@/data/seed';

const STEPS = 3;

export default function Onboarding() {
  const router = useRouter();
  const { updateProfile, session, isDemo } = useAuth();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<string[]>([]);
  const [level, setLevel] = useState<string | null>(null);
  const [injuries, setInjuries] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const canContinue = step === 0 ? goals.length > 0 : step === 1 ? !!level : true;

  async function next() {
    if (step < STEPS - 1) {
      setStep(step + 1);
      return;
    }
    // Live mode requires an account before answers can be saved.
    if (!isDemo && !session) {
      router.replace({ pathname: '/(auth)/sign-in', params: { mode: 'up' } });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        goals,
        experience_level: level,
        injuries,
        onboarded: true,
      });
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save your answers. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Progress */}
      <View style={styles.top}>
        <View style={styles.progressRow}>
          {step > 0 ? (
            <Pressable onPress={() => setStep(step - 1)} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </Pressable>
          ) : (
            <View style={{ width: 22 }} />
          )}
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${((step + 1) / STEPS) * 100}%` }]} />
          </View>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <>
            <Txt variant="screenTitle">What are your fitness goals?</Txt>
            <Txt variant="body" style={styles.sub}>Pick all that apply. This shapes who we recommend.</Txt>
            <View style={styles.chips}>
              {goalOptions.map((g) => (
                <Chip key={g} label={g} selected={goals.includes(g)} onPress={() => toggle(goals, setGoals, g)} />
              ))}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Txt variant="screenTitle">What is your experience level?</Txt>
            <Txt variant="body" style={styles.sub}>So trainers meet you where you are.</Txt>
            <View style={{ gap: 12, marginTop: 22 }}>
              {experienceLevels.map((l) => (
                <Card key={l.key} onPress={() => setLevel(l.key)} selected={level === l.key}>
                  <Txt variant="bodyStrong">{l.label}</Txt>
                  <Txt variant="caption" style={{ marginTop: 3 }}>{l.sub}</Txt>
                </Card>
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Txt variant="screenTitle">Any injuries or limitations?</Txt>
            <Txt variant="body" style={styles.sub}>Trainers prep in advance so sessions stay safe.</Txt>
            <View style={styles.chips}>
              {injuryOptions.map((i) => (
                <Chip key={i} label={i} selected={injuries.includes(i)} onPress={() => toggle(injuries, setInjuries, i)} />
              ))}
            </View>
            <View style={styles.note}>
              <Ionicons name="lock-closed" size={16} color={colors.primary} />
              <Txt variant="caption" style={{ flex: 1, color: colors.textMuted }}>
                Stored privately for future matching. This MVP does not expose health notes to trainers yet.
              </Txt>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {error && <Txt variant="caption" color={colors.danger} center style={{ marginBottom: 10 }}>{error}</Txt>}
        <Button
          title={step < STEPS - 1 ? 'Continue' : 'Find my trainer'}
          onPress={next}
          disabled={!canContinue}
          loading={saving}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: 22, paddingTop: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 24 },
  sub: { marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  note: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 24,
  },
  footer: { padding: 22, paddingTop: 12 },
});
