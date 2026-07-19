import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { Button, Card, Chip, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { goalOptions, experienceLevels, injuryOptions } from '@/data/seed';
import { useLocale } from '@/context/locale';

const STEPS = 3;

const ARABIC_GOALS: Record<string, string> = {
  'Build muscle': 'بناء العضلات',
  'Lose weight': 'خسارة الوزن',
  'Improve mobility': 'تحسين الحركة',
  'Boost endurance': 'رفع التحمّل',
  'Sport-specific': 'رياضة محددة',
  'General fitness': 'اللياقة العامة',
};

const ARABIC_LEVELS: Record<string, { label: string; sub: string }> = {
  beginner: { label: 'مبتدئ', sub: 'جديد في التدريب أو عائد إليه' },
  intermediate: { label: 'متوسط', sub: 'متمكن من الأساسيات' },
  advanced: { label: 'متقدم', sub: 'تتدرب باستمرار منذ سنوات' },
};

const ARABIC_INJURIES: Record<string, string> = {
  None: 'لا يوجد',
  'Lower back': 'أسفل الظهر',
  Knee: 'الركبة',
  Shoulder: 'الكتف',
  Wrist: 'المعصم',
  Neck: 'الرقبة',
  Ankle: 'الكاحل',
};

export default function Onboarding() {
  const router = useRouter();
  const { updateProfile, session, isDemo } = useAuth();
  const { locale, isRTL, t } = useLocale();
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
      setError(e?.message ?? t('onboarding.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Progress */}
      <View style={styles.top}>
        <View style={[styles.progressRow, isRTL && styles.rtlRow]}>
          {step > 0 ? (
            <Pressable onPress={() => setStep(step - 1)} hitSlop={10}>
              <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={colors.textPrimary} />
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
            <Txt variant="screenTitle">{t('onboarding.goalsTitle')}</Txt>
            <Txt variant="body" style={styles.sub}>{t('onboarding.goalsCopy')}</Txt>
            <View style={[styles.chips, isRTL && styles.rtlWrap]}>
              {goalOptions.map((g) => (
                <Chip key={g} label={locale === 'ar' ? ARABIC_GOALS[g] ?? g : g} selected={goals.includes(g)} onPress={() => toggle(goals, setGoals, g)} />
              ))}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Txt variant="screenTitle">{t('onboarding.experienceTitle')}</Txt>
            <Txt variant="body" style={styles.sub}>{t('onboarding.experienceCopy')}</Txt>
            <View style={{ gap: 12, marginTop: 22 }}>
              {experienceLevels.map((l) => (
                <Card key={l.key} onPress={() => setLevel(l.key)} selected={level === l.key}>
                  <Txt variant="bodyStrong">{locale === 'ar' ? ARABIC_LEVELS[l.key]?.label ?? l.label : l.label}</Txt>
                  <Txt variant="caption" style={{ marginTop: 3 }}>{locale === 'ar' ? ARABIC_LEVELS[l.key]?.sub ?? l.sub : l.sub}</Txt>
                </Card>
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Txt variant="screenTitle">{t('onboarding.injuriesTitle')}</Txt>
            <Txt variant="body" style={styles.sub}>{t('onboarding.injuriesCopy')}</Txt>
            <View style={[styles.chips, isRTL && styles.rtlWrap]}>
              {injuryOptions.map((i) => (
                <Chip key={i} label={locale === 'ar' ? ARABIC_INJURIES[i] ?? i : i} selected={injuries.includes(i)} onPress={() => toggle(injuries, setInjuries, i)} />
              ))}
            </View>
            <View style={[styles.note, isRTL && styles.rtlRow]}>
              <Ionicons name="lock-closed" size={16} color={colors.primary} />
              <Txt variant="caption" style={{ flex: 1, color: colors.textMuted }}>
                {t('onboarding.privateNote')}
              </Txt>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {error && <Txt variant="caption" color={colors.danger} center style={{ marginBottom: 10 }}>{error}</Txt>}
        <Button
          title={step < STEPS - 1 ? t('onboarding.continue') : t('onboarding.findTrainer')}
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
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  rtlWrap: { direction: 'ltr', flexDirection: 'row-reverse' },
});
