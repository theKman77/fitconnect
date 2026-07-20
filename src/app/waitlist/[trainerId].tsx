import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { getTrainer } from '@/lib/api';
import { joinTrainerWaitlist, leaveTrainerWaitlist, listMyWaitlists } from '@/lib/demand';
import { confirm, notify } from '@/lib/confirm';
import { localizeDomain } from '@/lib/localize-domain';
import { Badge, Button, EmptyState, Skeleton, Txt } from '@/components/ui';
import { Segmented } from '@/components/ui/Segmented';
import { colors, fonts, radius } from '@/theme';
import type { DemandDaypart, SessionFormat, TrainerDetail, WaitlistRequest } from '@/types/domain';

const DAYPARTS: Array<{ key: DemandDaypart; icon: keyof typeof Ionicons.glyphMap; label: string; copy: string }> = [
  { key: 'morning', icon: 'sunny-outline', label: 'Morning', copy: 'Before 12' },
  { key: 'afternoon', icon: 'partly-sunny-outline', label: 'Afternoon', copy: '12 to 5' },
  { key: 'evening', icon: 'moon-outline', label: 'Evening', copy: 'After 5' },
];

export default function TrainerWaitlist() {
  const router = useRouter();
  const { trainerId } = useLocalSearchParams<{ trainerId: string }>();
  const { profile } = useAuth();
  const { locale, localeTag, isRTL, tr } = useLocale();
  const [trainer, setTrainer] = useState<TrainerDetail | null>(null);
  const [current, setCurrent] = useState<WaitlistRequest | null>(null);
  const [format, setFormat] = useState<SessionFormat>('in_person');
  const [dayparts, setDayparts] = useState<DemandDaypart[]>(['morning', 'afternoon', 'evening']);
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientId = profile?.id ?? 'demo-client';
  const rtlRow = isRTL ? styles.rtlRow : undefined;

  const load = useCallback(async () => {
    if (!trainerId) return;
    try {
      setError(null);
      const [detail, rows] = await Promise.all([
        getTrainer(trainerId, !profile && trainerId.startsWith('t-')),
        listMyWaitlists(clientId),
      ]);
      if (!detail) throw new Error(tr('Trainer profile unavailable.'));
      const existing = rows.find((row) => row.trainer_id === trainerId) ?? null;
      setTrainer(detail);
      setCurrent(existing);
      setSessionTypeId(existing?.session_type_id ?? detail.session_types.find((plan) => plan.active && plan.kind !== 'subscription')?.id ?? null);
      if (existing) {
        setFormat(existing.format);
        setDayparts(existing.preferred_dayparts);
        setWeekdays(existing.preferred_weekdays);
      }
    } catch (value: any) {
      setError(value?.message ?? tr('Could not load this waitlist.'));
    } finally {
      setLoaded(true);
    }
  }, [clientId, trainerId, tr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function toggleDaypart(value: DemandDaypart) {
    setDayparts((items) => items.includes(value) ? (items.length === 1 ? items : items.filter((item) => item !== value)) : [...items, value]);
  }

  function toggleWeekday(value: number) {
    setWeekdays((items) => items.includes(value) ? (items.length === 1 ? items : items.filter((item) => item !== value)) : [...items, value].sort());
  }

  async function save() {
    if (!trainerId) return;
    if (!profile) {
      router.push('/(auth)/sign-in?mode=up');
      return;
    }
    setSaving(true);
    try {
      const row = await joinTrainerWaitlist({
        clientId,
        trainerId,
        sessionTypeId,
        format,
        dayparts,
        weekdays,
        city: profile.city ?? trainer?.city ?? 'Riyadh',
      });
      setCurrent(row);
      notify(tr('Waitlist tuned'), tr('You will see matching Pulse Drops in FitConnect. Your identity remains private until you book.'));
    } catch (value: any) {
      notify(tr('Waitlist not saved'), value?.message ?? tr('Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    if (!current) return;
    confirm({ title: tr('Leave this waitlist?'), message: tr('You will stop receiving matched openings from this trainer.'), confirmLabel: tr('Leave waitlist'), destructive: true }, async () => {
      await leaveTrainerWaitlist(current.id, clientId);
      setCurrent(null);
    });
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.header, rtlRow]}>
          <Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={() => router.back()} style={styles.back}><Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={21} color={colors.textPrimary} /></Pressable>
          <View style={{ flex: 1 }}><Txt variant="monoTag">{tr('PRIVATE WAITLIST')}</Txt><Txt style={styles.title}>{tr('Tell FitConnect what fits.')}</Txt></View>
          {current && <Badge label={tr('ACTIVE')} tone="success" />}
        </View>

        {!loaded && <><Skeleton height={180} /><Skeleton height={250} /><Skeleton height={180} /></>}
        {error && <EmptyState icon="cloud-offline-outline" title={tr('Waitlist unavailable')} subtitle={error} actionLabel={tr('Try again')} onAction={load} />}

        {loaded && trainer && (
          <>
            <View style={styles.hero}>
              <LinearGradient colors={['#331B14', colors.surfaceElevated, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={[styles.heroTop, rtlRow]}><View style={styles.heroIcon}><Ionicons name="radio-outline" size={22} color={colors.primary} /></View><View style={{ flex: 1 }}><Txt variant="monoTag">{tr('WAITING FOR')}</Txt><Txt style={styles.trainerName}>{trainer.display_name}</Txt><Txt variant="caption" style={{ marginTop: 3 }}>{localizeDomain(trainer.headline, locale)}</Txt></View></View>
              <Txt variant="body" style={{ marginTop: 15 }}>{tr('When this trainer broadcasts an opening that fits your rhythm, it appears in Pulse Drops. Trainers see demand counts—not your name, phone, or private profile.')}</Txt>
              <View style={[styles.privacyLine, rtlRow]}><Ionicons name="eye-off-outline" size={16} color={colors.success} /><Txt variant="caption" style={{ flex: 1 }}>{tr('Private until you choose to book')}</Txt></View>
            </View>

            <View style={styles.block}>
              <Txt variant="monoTag">{tr('SESSION')}</Txt><Txt style={styles.blockTitle}>{tr('Keep the useful details')}</Txt>
              <Segmented options={[{ key: 'in_person', label: tr('In person') }, { key: 'virtual', label: tr('Virtual') }]} value={format} onChange={setFormat} />
              <View style={styles.planList}>
                {trainer.session_types.filter((plan) => plan.active && plan.kind !== 'subscription').map((plan) => (
                  <Pressable key={plan.id} accessibilityRole="radio" accessibilityState={{ checked: sessionTypeId === plan.id }} onPress={() => setSessionTypeId(plan.id)} style={[styles.plan, sessionTypeId === plan.id && styles.planOn, rtlRow]}>
                    <View style={[styles.radio, sessionTypeId === plan.id && styles.radioOn]}>{sessionTypeId === plan.id && <View style={styles.radioDot} />}</View>
                    <View style={{ flex: 1 }}><Txt variant="bodyStrong">{localizeDomain(plan.name, locale)}</Txt><Txt variant="caption" style={{ marginTop: 2 }}>{new Intl.NumberFormat(localeTag).format(plan.duration_min)} {tr('minutes')}</Txt></View>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.block}>
              <Txt variant="monoTag">{tr('TIME WINDOWS')}</Txt><Txt style={styles.blockTitle}>{tr('What part of the day works?')}</Txt>
              <View style={styles.daypartGrid}>
                {DAYPARTS.map((item) => {
                  const active = dayparts.includes(item.key);
                  return <Pressable key={item.key} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => toggleDaypart(item.key)} style={[styles.daypart, active && styles.daypartOn]}><Ionicons name={item.icon} size={21} color={active ? colors.primary : colors.textMuted} /><Txt style={[styles.daypartLabel, active && { color: colors.textPrimary }]}>{tr(item.label)}</Txt><Txt style={styles.daypartCopy}>{tr(item.copy)}</Txt>{active && <Ionicons name="checkmark-circle" size={16} color={colors.success} style={styles.check} />}</Pressable>;
                })}
              </View>
            </View>

            <View style={styles.block}>
              <Txt variant="monoTag">{tr('DAYS')}</Txt><Txt style={styles.blockTitle}>{tr('Which days can move?')}</Txt>
              <View style={[styles.weekGrid, isRTL && styles.rtlWrap]}>
                {[0, 1, 2, 3, 4, 5, 6].map((value) => {
                  const active = weekdays.includes(value);
                  return <Pressable key={value} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => toggleWeekday(value)} style={[styles.weekday, active && styles.weekdayOn]}><Txt style={[styles.weekdayText, active && styles.weekdayTextOn]}>{dayjs().day(value).locale(locale).format('dd')}</Txt></Pressable>;
                })}
              </View>
              <Txt variant="caption" style={{ marginTop: 12 }}>{tr('Your preferences expire after 60 days so old demand never follows you forever.')}</Txt>
            </View>

            <Button title={current ? tr('Update my waitlist') : profile ? tr('Join private waitlist') : tr('Create an account to join')} icon="notifications-outline" onPress={save} loading={saving} />
            {current && <Button title={tr('Leave waitlist')} variant="ghost" onPress={remove} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: 20, paddingBottom: 42, gap: 14 },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  rtlWrap: { direction: 'ltr', flexDirection: 'row-reverse' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  title: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 31, letterSpacing: -1, color: colors.textPrimary, marginTop: 4 },
  hero: { overflow: 'hidden', borderRadius: radius.xxl, padding: 18, borderWidth: 1, borderColor: colors.primaryBorder },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 50, height: 50, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  trainerName: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.textPrimary, marginTop: 3 },
  privacyLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  block: { borderRadius: radius.xxl, padding: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 13 },
  blockTitle: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.7, color: colors.textPrimary },
  planList: { gap: 8 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
  planOn: { borderColor: colors.primaryBorder, backgroundColor: colors.primaryTint },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.textDim, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  daypartGrid: { flexDirection: 'row', gap: 8 },
  daypart: { flex: 1, minHeight: 106, borderRadius: radius.lg, padding: 12, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, gap: 5 },
  daypartOn: { borderColor: colors.primaryBorder, backgroundColor: colors.primaryTint },
  daypartLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSecondary },
  daypartCopy: { fontFamily: fonts.medium, fontSize: 9, color: colors.textDim },
  check: { position: 'absolute', top: 9, right: 9 },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weekday: { width: '12%', minWidth: 43, aspectRatio: 1, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  weekdayOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  weekdayText: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted },
  weekdayTextOn: { color: colors.white },
});
