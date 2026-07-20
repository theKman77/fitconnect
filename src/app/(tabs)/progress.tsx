import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { colors, fonts, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { isBackendConfigured } from '@/lib/supabase';
import { listMyBookings } from '@/lib/bookings';
import { listTrainers } from '@/lib/api';
import { listWeights, addWeight, listPRs, upsertPR, workoutsFromBookings, weeklyStreak, countReviewsGiven } from '@/lib/progress';
import { computeXP, levelFromXP, ACHIEVEMENTS, ClientStats } from '@/lib/gamification';
import { Card, EmptyState, InputSheet, Txt } from '@/components/ui';
import type { Booking, PersonalRecord, ProgressEntry, Trainer } from '@/types/domain';
import { useLocale } from '@/context/locale';
import { listChallenges, listMyChallengeMemberships } from '@/lib/retention';
import type { Challenge, ChallengeMembership } from '@/types/domain';

// Demo-mode showcase stats (kept for the demo profile / Expo Go without backend).
const DEMO_STATS: ClientStats = { sessions: 24, streakWeeks: 5, prCount: 3, reviewsGiven: 6, weightLogs: 6 };
const DEMO_WORKOUTS = [
  { title: 'Strength & conditioning', trainer: 'Maya Okafor', when: '2 days ago', mins: 60 },
  { title: 'Mobility flow', trainer: 'Aisha Rahman', when: 'Last week', mins: 45 },
  { title: 'HIIT circuit', trainer: 'Diego Santos', when: 'Last week', mins: 40 },
];
const LEVEL_NAMES_AR: Record<string, string> = { Rookie: 'مبتدئ', Mover: 'متحرك', Grinder: 'مثابر', Athlete: 'رياضي', Beast: 'وحش', Legend: 'أسطورة' };
const ACHIEVEMENTS_AR: Record<string, string> = {
  first: 'الجلسة الأولى', five: '٥ جلسات', ten: '١٠ جلسات', streak3: '٣ أسابيع متتالية',
  streak6: '٦ أسابيع متتالية', pr1: 'الرقم الأول', pr3: 'صائد الأرقام', logger: 'مدفوع بالبيانات', reviewer: 'روح رياضية',
};
const DEMO_WORKOUTS_AR = [
  { title: 'القوة واللياقة', trainer: 'مايا أوكافور', when: 'قبل يومين', mins: 60 },
  { title: 'تدفق الحركة', trainer: 'عائشة رحمن', when: 'الأسبوع الماضي', mins: 45 },
  { title: 'تمارين عالية الشدة', trainer: 'دييغو سانتوس', when: 'الأسبوع الماضي', mins: 40 },
];

export default function Progress() {
  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  const { locale, localeTag, isRTL, t, tr } = useLocale();
  const [weights, setWeights] = useState<ProgressEntry[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allTrainers, setAllTrainers] = useState<Trainer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState<'weight' | 'pr' | 'goal' | null>(null);
  const [reviewsGiven, setReviewsGiven] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [memberships, setMemberships] = useState<ChallengeMembership[]>([]);

  const clientId = profile?.id ?? 'demo-client';
  const useLiveData = isBackendConfigured && !!profile;

  const load = useCallback(async () => {
    if (!useLiveData) {
      setWeights([]);
      setPRs([]);
      setBookings([]);
      setAllTrainers([]);
      setReviewsGiven(0);
      setChallenges(await listChallenges(true));
      setMemberships(await listMyChallengeMemberships('demo-client'));
      setError(null);
      setLoaded(true);
      return;
    }
    try {
      setError(null);
      const [w, p, b, t, reviewCount, nextChallenges, nextMemberships] = await Promise.all([
        listWeights(clientId),
        listPRs(clientId),
        listMyBookings(clientId),
        listTrainers(),
        countReviewsGiven(clientId),
        listChallenges(),
        listMyChallengeMemberships(clientId),
      ]);
      setWeights(w);
      setPRs(p);
      setBookings(b);
      setAllTrainers(t);
      setReviewsGiven(reviewCount);
      setChallenges(nextChallenges);
      setMemberships(nextMemberships);
    } catch (e: any) {
      setError(e?.message ?? t('progress.unavailable'));
    } finally {
      setLoaded(true);
    }
  }, [clientId, t, useLiveData]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ---- derived ----
  const completed = workoutsFromBookings(bookings);
  const stats: ClientStats = useLiveData
    ? {
        sessions: completed.length,
        streakWeeks: weeklyStreak(completed.map((b) => b.scheduled_at ?? b.created_at)),
        prCount: prs.length,
        reviewsGiven,
        weightLogs: weights.length,
      }
    : DEMO_STATS;
  const challengeXP = memberships.reduce((sum, membership) => {
    const challenge = challenges.find((item) => item.id === membership.challenge_id);
    return sum + (challenge && membership.progress >= challenge.target ? challenge.reward_xp : 0);
  }, 0);
  const level = levelFromXP(computeXP(stats) + challengeXP);
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

  const hours = useLiveData
    ? Math.round(completed.reduce((s, b) => s + (b.duration_min || 60), 0) / 60)
    : 36;
  const sessionsThisWeek = useLiveData
    ? completed.filter((b) => dayjs(b.scheduled_at ?? b.created_at).isSame(dayjs(), 'week')).length
    : 2;
  const missionTarget = 3;
  const missionProgress = Math.min(1, sessionsThisWeek / missionTarget);

  const trainerName = (id: string) => allTrainers.find((trainer) => trainer.id === id)?.display_name ?? t('progress.yourTrainer');
  const number = (value: number) => new Intl.NumberFormat(localeTag, { maximumFractionDigits: 1 }).format(value);
  const unitKg = locale === 'ar' ? 'كجم' : 'kg';
  const levelName = locale === 'ar' ? (LEVEL_NAMES_AR[level.name] ?? level.name) : level.name;
  const demoWorkouts = locale === 'ar' ? DEMO_WORKOUTS_AR : DEMO_WORKOUTS;
  const rtlRow = isRTL ? styles.rtlRow : undefined;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={styles.header}><Txt variant="screenTitle">{t('progress.title')}</Txt></View>
        {error && <View style={styles.section}><Card><EmptyState icon="cloud-offline-outline" title={t('progress.unavailable')} subtitle={error} actionLabel={t('common.tryAgain')} onAction={load} /></Card></View>}

        {/* Level + streak hero */}
        <View style={styles.section}>
          <View style={styles.hero}>
            <LinearGradient colors={[colors.surfaceHigh, '#21130F', colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.heroGlow} />
            <View style={[styles.heroRow, rtlRow]}>
              <View style={{ flex: 1 }}>
                <Txt style={styles.heroLevel}>{t('progress.level')} {number(level.level)} · {levelName}</Txt>
                <Txt style={styles.heroSub}>
                  {stats.streakWeeks > 0 ? `${number(stats.streakWeeks)} ${t('progress.weekStreakValue')} 🔥` : t('progress.startStreak')}
                </Txt>
              </View>
              <View style={styles.xpRing}>
                <Txt style={styles.xpTxt}>{number(level.xp)}</Txt>
                <Txt style={styles.xpLbl}>XP</Txt>
              </View>
            </View>
            <View style={styles.heroTrack}>
              <View style={[styles.heroFill, { width: `${Math.max(4, level.progress * 100)}%` }]} />
            </View>
            <Txt style={styles.heroNext}>
              {level.progress >= 1 ? t('progress.maxLevel') : `${number(level.levelSpan - level.intoLevel)} ${t('progress.toLevel')} ${number(level.level + 1)}`}
            </Txt>
          </View>
        </View>

        {/* Stat tiles */}
        <View style={[styles.section, styles.statsRow, rtlRow]}>
          <Stat icon="barbell" value={number(stats.sessions)} label={t('progress.sessions')} />
          <Stat icon="time" value={locale === 'ar' ? `${number(hours)} س` : `${hours}h`} label={t('progress.trained')} />
          <Stat icon="flame" value={number(stats.streakWeeks)} label={t('progress.weekStreak')} />
        </View>

        <View style={styles.section}>
          <Pressable style={styles.mission} onPress={() => router.push('/(tabs)/discover')}>
            <View style={[styles.missionTop, rtlRow]}>
              <View style={styles.missionIcon}><Ionicons name="flag" size={19} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Txt style={styles.missionEyebrow}>{t('progress.mission')}</Txt>
                <Txt style={styles.missionTitle}>{sessionsThisWeek >= missionTarget ? t('progress.missionComplete') : t('progress.moveThree')}</Txt>
              </View>
              <View style={styles.reward}><Ionicons name="sparkles" size={12} color={colors.warm} /><Txt style={styles.rewardText}>150 XP</Txt></View>
            </View>
            <View style={styles.missionTrack}><View style={[styles.missionFill, { width: `${Math.max(4, missionProgress * 100)}%` }]} /></View>
            <View style={[styles.missionBottom, rtlRow]}>
              <Txt style={styles.missionMeta}>{number(Math.min(sessionsThisWeek, missionTarget))} {t('progress.ofSessions')}</Txt>
              <Txt style={styles.missionLink}>{sessionsThisWeek >= missionTarget ? t('progress.exploreGoal') : t('progress.bookSession')} {isRTL ? '←' : '→'}</Txt>
            </View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Pressable style={styles.circleCard} onPress={() => router.push('/momentum' as any)}>
            <LinearGradient colors={['#34180F', colors.surfaceElevated, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={[styles.circleTop, rtlRow]}>
              <View style={styles.circleIcon}><Ionicons name="people" size={20} color={colors.white} /></View>
              <View style={{ flex: 1 }}><Txt style={styles.circleEyebrow}>{tr('MOMENTUM CIRCLES')}</Txt><Txt style={styles.circleTitle}>{tr('Progress feels lighter together.')}</Txt></View>
              <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={20} color={colors.primary} />
            </View>
            <Txt variant="body" style={{ marginTop: 10 }}>{tr('Join privacy-first challenges where only verified FitConnect sessions count—never weight or body metrics.')}</Txt>
            <View style={[styles.circleProof, rtlRow]}>
              <View style={styles.circleFaces}><View style={[styles.miniFace, { backgroundColor: '#5430D8' }]} /><View style={[styles.miniFace, { backgroundColor: '#C44676', marginLeft: -7 }]} /><View style={[styles.miniFace, { backgroundColor: '#247A72', marginLeft: -7 }]} /></View>
              <Txt style={styles.circleProofText}>{tr('Small circles · aliases · verified effort')}</Txt>
            </View>
          </Pressable>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <View style={[styles.sectionHead, rtlRow]}>
            <Txt variant="sectionTitle">{t('progress.achievements')}</Txt>
            <Txt variant="caption">{number(earnedCount)}/{number(ACHIEVEMENTS.length)}</Txt>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 22, paddingTop: 12 }} style={{ marginHorizontal: -22 }}>
            {ACHIEVEMENTS.map((a) => {
              const on = a.earned(stats);
              return (
                <View key={a.id} style={[styles.badge, on ? styles.badgeOn : styles.badgeOff]}>
                  <Ionicons name={a.icon} size={20} color={on ? colors.primary : colors.textFaint} />
                  <Txt style={[styles.badgeTxt, { color: on ? colors.textPrimary : colors.textFaint }]} numberOfLines={2}>
                    {locale === 'ar' ? (ACHIEVEMENTS_AR[a.id] ?? a.title) : a.title}
                  </Txt>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Weight */}
        <View style={styles.section}>
          <View style={[styles.sectionHead, rtlRow]}>
            <Txt variant="sectionTitle">{t('progress.weight')}</Txt>
            <Pressable onPress={() => setSheet('weight')} hitSlop={8}>
              <Txt style={styles.link}>+ {t('progress.logWeight')}</Txt>
            </Pressable>
          </View>
          {weightVals.length === 0 ? (
            loaded && (
              <Card style={{ marginTop: 12 }}>
                <EmptyState icon="scale" title={t('progress.noWeights')}
                  subtitle={t('progress.noWeightsCopy')}
                  actionLabel={t('progress.logWeight')} onAction={() => setSheet('weight')} />
              </Card>
            )
          ) : (
            <Card style={{ marginTop: 12 }}>
              <View style={[styles.weightHead, rtlRow]}>
                <View>
                  <View style={[styles.weightRow, rtlRow]}>
                    <Txt style={styles.weightVal}>{number(current)}</Txt>
                    <Txt variant="caption"> {unitKg}</Txt>
                    {goal != null && <Txt variant="caption" style={{ marginLeft: 8 }}>{isRTL ? '←' : '→'} {number(goal)} {unitKg}</Txt>}
                  </View>
                  <Pressable onPress={() => setSheet('goal')} hitSlop={6}>
                    <Txt variant="caption" color={colors.primary} style={{ marginTop: 4 }}>
                      {goal != null ? t('progress.changeGoal') : t('progress.setGoal')}
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
                  <Txt variant="caption" style={{ marginTop: 6 }}>{number(Math.round(goalPct * 100))}% {t('progress.goalPercentSuffix')}</Txt>
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
                <Txt variant="caption" style={{ marginTop: 14 }}>{t('progress.trendHint')}</Txt>
              )}
            </Card>
          )}
        </View>

        {/* Personal records */}
        <View style={styles.section}>
          <View style={[styles.sectionHead, rtlRow]}>
            <Txt variant="sectionTitle">{t('progress.records')}</Txt>
            <Pressable onPress={() => setSheet('pr')} hitSlop={8}>
              <Txt style={styles.link}>+ {t('progress.addRecord')}</Txt>
            </Pressable>
          </View>
          {prs.length === 0 ? (
            loaded && (
              <Card style={{ marginTop: 12 }}>
                <EmptyState icon="trophy" title={t('progress.noRecords')}
                  subtitle={t('progress.noRecordsCopy')}
                  actionLabel={t('progress.addRecord')} onAction={() => setSheet('pr')} />
              </Card>
            )
          ) : (
            <View style={[styles.prRow, rtlRow, { marginTop: 12 }]}>
              {prs.slice(0, 6).map((pr) => (
                <View key={pr.id} style={styles.prCard}>
                  <Txt variant="caption" numberOfLines={1}>{pr.lift}</Txt>
                  <Txt style={styles.prVal}>{number(pr.value)} {pr.unit === 'kg' ? unitKg : pr.unit}</Txt>
                  <Txt variant="caption" style={{ marginTop: 4 }}>{dayjs(pr.achieved_at).locale(locale).format('D MMM')}</Txt>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recent workouts */}
        <View style={styles.section}>
          <Txt variant="sectionTitle" style={{ marginBottom: 12 }}>{t('progress.recent')}</Txt>
          {useLiveData ? (
            completed.length === 0 ? (
              loaded && (
                <Card>
                  <EmptyState icon="fitness" title={t('progress.noSessions')}
                    subtitle={t('progress.noSessionsCopy')} />
                </Card>
              )
            ) : (
              <View style={{ gap: 10 }}>
                {completed.slice(0, 5).map((b) => (
                  <Card key={b.id}>
                    <View style={[styles.workout, rtlRow]}>
                      <View style={styles.wIcon}><Ionicons name="fitness" size={18} color={colors.primary} /></View>
                      <View style={{ flex: 1 }}>
                        <Txt variant="bodyStrong">{t('progress.trainingSession')}</Txt>
                        <Txt variant="caption" style={{ marginTop: 2 }}>
                          {t('progress.with')} {trainerName(b.trainer_id)} · {number(b.duration_min)} {t('progress.minutes')}
                        </Txt>
                      </View>
                      <Txt variant="caption">{dayjs(b.scheduled_at ?? b.created_at).locale(locale).format('D MMM')}</Txt>
                    </View>
                  </Card>
                ))}
              </View>
            )
          ) : (
            <View style={{ gap: 10 }}>
              {demoWorkouts.map((w, i) => (
                <Card key={i}>
                  <View style={[styles.workout, rtlRow]}>
                    <View style={styles.wIcon}><Ionicons name="fitness" size={18} color={colors.primary} /></View>
                    <View style={{ flex: 1 }}>
                      <Txt variant="bodyStrong">{w.title}</Txt>
                      <Txt variant="caption" style={{ marginTop: 2 }}>{t('progress.with')} {w.trainer} · {number(w.mins)} {t('progress.minutes')}</Txt>
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
        title={t('progress.logToday')}
        fields={[{ key: 'kg', label: t('progress.weightKg'), placeholder: locale === 'ar' ? 'مثال: ٨٠٫٥' : 'e.g. 80.5', keyboardType: 'decimal-pad' }]}
        onSubmit={async (v) => {
          const kg = parseLocalizedNumber(v.kg);
          if (isNaN(kg) || kg <= 20 || kg >= 400) throw new Error(t('progress.weightError'));
          await addWeight(clientId, kg);
          await load();
        }}
        onClose={() => setSheet(null)}
      />
      <InputSheet
        visible={sheet === 'pr'}
        title={t('progress.addPersonalRecord')}
        fields={[
          { key: 'lift', label: t('progress.exercise'), placeholder: t('progress.exerciseExample') },
          { key: 'value', label: t('progress.weightKg'), placeholder: locale === 'ar' ? 'مثال: ١٢٠' : 'e.g. 120', keyboardType: 'decimal-pad' },
        ]}
        onSubmit={async (v) => {
          const val = parseLocalizedNumber(v.value);
          if (!v.lift.trim()) throw new Error(t('progress.exerciseError'));
          if (isNaN(val) || val <= 0 || val > 1000) throw new Error(t('progress.recordError'));
          await upsertPR(clientId, v.lift.trim(), val);
          await load();
        }}
        onClose={() => setSheet(null)}
      />
      <InputSheet
        visible={sheet === 'goal'}
        title={t('progress.setWeightGoal')}
        fields={[{ key: 'goal', label: t('progress.goalWeight'), placeholder: locale === 'ar' ? 'مثال: ٧٨' : 'e.g. 78', keyboardType: 'decimal-pad', initial: goal ? String(goal) : undefined }]}
        onSubmit={async (v) => {
          const g = parseLocalizedNumber(v.goal);
          if (isNaN(g) || g <= 20 || g >= 400) throw new Error(t('progress.goalError'));
          await updateProfile({ weight_goal: g });
        }}
        onClose={() => setSheet(null)}
      />
    </SafeAreaView>
  );
}

function parseLocalizedNumber(value: string): number {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const normalized = value
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/٫/g, '.')
    .replace(/[٬,]/g, '');
  return Number.parseFloat(normalized);
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
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 4 },
  section: { paddingHorizontal: 22, marginTop: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },

  hero: { borderRadius: radius.xxl, overflow: 'hidden', padding: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.primaryBorder },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -70, top: -95, backgroundColor: colors.primaryTintStrong },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroLevel: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.white },
  heroSub: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  xpRing: {
    width: 66, height: 66, borderRadius: 33, borderWidth: 3, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint,
  },
  xpTxt: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.white },
  xpLbl: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.8)' },
  heroTrack: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 16 },
  heroFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  heroNext: { fontFamily: fonts.medium, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 8 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statVal: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.textPrimary, marginTop: 8 },

  mission: { padding: 17, borderRadius: radius.xxl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  missionTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  missionIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  missionEyebrow: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 1.1, color: colors.primary },
  missionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary, marginTop: 3 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,179,107,0.11)' },
  rewardText: { fontFamily: fonts.bold, fontSize: 9, color: colors.warm },
  missionTrack: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceHigh, overflow: 'hidden', marginTop: 16 },
  missionFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  missionBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 },
  missionMeta: { fontFamily: fonts.medium, fontSize: 10, color: colors.textDim },
  missionLink: { fontFamily: fonts.bold, fontSize: 11, color: colors.primary },
  circleCard: { overflow: 'hidden', borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.primaryBorder, padding: 17 },
  circleTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  circleIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  circleEyebrow: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 1, color: colors.primary },
  circleTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary, marginTop: 3 },
  circleProof: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 15 },
  circleFaces: { flexDirection: 'row', alignItems: 'center' },
  miniFace: { width: 23, height: 23, borderRadius: 12, borderWidth: 2, borderColor: colors.surface },
  circleProofText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.textMuted },

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
