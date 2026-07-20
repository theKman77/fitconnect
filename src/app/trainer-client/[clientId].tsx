import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { Avatar, Badge, Button, Card, EmptyState, InputSheet, Skeleton, Txt } from '@/components/ui';
import { colors, fonts, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { repeatClientFeePct, tierForSessions } from '@/lib/gamification';
import { getBookingCounterpart, getMyTrainer, listTrainerBookings, type BookingCounterpart } from '@/lib/trainer';
import { getTrainerClientRecord, relationshipSignal, saveTrainerClientRecord, sendCoachNudge } from '@/lib/retention';
import { notify } from '@/lib/confirm';
import type { Booking, CoachNudgeKind, Trainer, TrainerClientRecord } from '@/types/domain';

type Sheet = 'goal' | 'notes' | null;
const TAGS = ['Prefers mornings', 'Virtual-friendly', 'Strength focus', 'Needs accountability', 'Returning client'];

export default function TrainerClientWorkspace() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { profile } = useAuth();
  const { locale, localeTag, isRTL, tr } = useLocale();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [person, setPerson] = useState<BookingCounterpart | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [record, setRecord] = useState<TrainerClientRecord | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busyNudge, setBusyNudge] = useState<CoachNudgeKind | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rtlRow = isRTL ? styles.rtlRow : undefined;

  const load = useCallback(async () => {
    if (!clientId) return;
    try {
      setError(null);
      if (!profile) {
        const created = dayjs().subtract(24, 'day').toISOString();
        const value = demoBooking(clientId, created);
        setPerson({ profile_id: clientId, full_name: clientId === 'demo-lina' ? 'Lina A.' : 'Showcase client', avatar_url: null });
        setBookings([value, { ...value, id: `${value.id}-2`, scheduled_at: dayjs(created).subtract(8, 'day').toISOString() }]);
        setRecord({ trainer_id: 'demo-trainer', client_id: clientId, goal_summary: 'Build strength confidence with two consistent sessions each week.', private_notes: 'Prefers morning sessions. Responds well to simple rep targets and a short progress recap.', tags: ['Prefers mornings', 'Strength focus', 'Needs accountability'], relationship_status: 'attention', next_follow_up_at: null, last_contacted_at: dayjs().subtract(18, 'day').toISOString(), created_at: created, updated_at: created });
        return;
      }
      const mine = await getMyTrainer(profile);
      setTrainer(mine);
      if (!mine) throw new Error(tr('Trainer profile unavailable.'));
      const all = await listTrainerBookings(mine);
      const related = all.filter((booking) => booking.client_id === clientId).sort((a, b) => (b.scheduled_at ?? b.created_at).localeCompare(a.scheduled_at ?? a.created_at));
      setBookings(related);
      if (related[0]) setPerson(await getBookingCounterpart(related[0].id));
      setRecord(await getTrainerClientRecord(mine.id, clientId));
    } catch (value: any) {
      setError(value?.message ?? tr('Could not load this client workspace.'));
    } finally {
      setLoaded(true);
    }
  }, [clientId, profile, tr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const completed = useMemo(() => bookings.filter((booking) => booking.status === 'completed'), [bookings]);
  const upcoming = useMemo(() => bookings.filter((booking) => ['confirmed', 'en_route', 'arriving', 'in_progress'].includes(booking.status)), [bookings]);
  const latest = completed[0] ?? bookings[0];
  const tier = tierForSessions(completed.length);
  const fee = repeatClientFeePct(completed.length, tier.current.feePct);
  const generated = completed.reduce((sum, booking) => sum + (booking.trainer_payout ?? booking.base_price * (1 - fee / 100)), 0);
  const computedSignal = relationshipSignal(latest?.scheduled_at ?? latest?.created_at ?? null, upcoming.length > 0);
  const signal = record?.relationship_status ?? computedSignal;
  const name = person?.full_name ?? tr('Client');

  async function save(values: Partial<TrainerClientRecord>) {
    if (!clientId) return;
    if (!profile) {
      setRecord((current) => current ? { ...current, ...values, updated_at: new Date().toISOString() } : current);
      return;
    }
    if (!trainer) return;
    setRecord(await saveTrainerClientRecord(trainer.id, clientId, values));
  }

  async function toggleTag(tag: string) {
    const tags = record?.tags ?? [];
    await save({ tags: tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag] });
  }

  async function followUp(days: number) {
    await save({ next_follow_up_at: dayjs().add(days, 'day').hour(10).minute(0).second(0).toISOString() });
  }

  async function nudge(kind: CoachNudgeKind) {
    if (!clientId) return;
    const templates = {
      rebook: locale === 'ar'
        ? { title: 'جلستك القادمة جاهزة', body: 'حافظ على زخمك—لدي مواعيد مناسبة متاحة هذا الأسبوع على FitConnect.' }
        : { title: 'Your next session is ready', body: 'Keep your momentum going—I have good FitConnect openings available this week.' },
      check_in: locale === 'ar'
        ? { title: 'كيف تسير الأمور؟', body: 'أرسل لك متابعة سريعة. يمكننا تعديل الجلسة القادمة لتناسب طاقتك وأهدافك.' }
        : { title: 'How are things going?', body: 'A quick coach check-in. We can adjust your next session around your energy and goals.' },
      celebrate: locale === 'ar'
        ? { title: 'استمراريتك واضحة', body: 'عمل رائع في جلستك الأخيرة. سجلك يتقدم، وأنت أقرب إلى مهمتك التالية.' }
        : { title: 'Your consistency is showing', body: 'Great work in your last session. Your record is moving and your next mission is within reach.' },
    } as const;
    setBusyNudge(kind);
    try {
      if (!profile) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        await save({ last_contacted_at: new Date().toISOString(), next_follow_up_at: null, relationship_status: 'active' });
        notify(tr('Showcase prompt sent'), tr('In a trainer account, this appears instantly in the client’s home feed.'));
        return;
      }
      if (!trainer) return;
      await sendCoachNudge(trainer.id, clientId, kind, templates[kind].title, templates[kind].body);
      await save({ last_contacted_at: new Date().toISOString(), next_follow_up_at: null, relationship_status: 'active' });
      notify(tr('Coach prompt sent'), tr('It now appears in the client’s FitConnect home feed.'));
    } catch (value: any) {
      notify(tr('Prompt not sent'), value?.message ?? tr('Please try again.'));
    } finally {
      setBusyNudge(null);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={[styles.header, rtlRow]}>
          <Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={() => router.back()} style={styles.back}><Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={21} color={colors.textPrimary} /></Pressable>
          <View style={{ flex: 1 }}><Txt variant="monoTag">{tr('RETENTION STUDIO')}</Txt><Txt style={styles.headerTitle}>{tr('Coach the relationship')}</Txt></View>
        </View>

        {!loaded && <><Skeleton height={190} style={{ borderRadius: radius.xxl }} /><Skeleton height={140} style={{ borderRadius: radius.xl }} /></>}
        {error && <Card><EmptyState icon="cloud-offline-outline" title={tr('Client workspace unavailable')} subtitle={error} actionLabel={tr('Try again')} onAction={load} /></Card>}

        {loaded && !error && (
          <>
            <View style={styles.hero}>
              <LinearGradient colors={['#31170F', colors.surfaceElevated, colors.surface]} style={StyleSheet.absoluteFill} />
              <View style={[styles.personRow, rtlRow]}>
                <Avatar uri={person?.avatar_url} name={name} size={62} />
                <View style={{ flex: 1 }}><Txt style={styles.name}>{name}</Txt><Txt variant="caption" style={{ marginTop: 3 }}>{completed.length ? locale === 'ar' ? `${new Intl.NumberFormat(localeTag).format(completed.length)} جلسات معاً` : `${completed.length} sessions together` : tr('New coaching relationship')}</Txt></View>
                <Badge label={tr(signal === 'attention' ? 'NEEDS ATTENTION' : signal === 'paused' ? 'PAUSED' : 'ON TRACK')} tone={signal === 'attention' ? 'brand' : signal === 'paused' ? 'neutral' : 'success'} />
              </View>
              <View style={[styles.metrics, rtlRow]}>
                <Metric value={`${new Intl.NumberFormat(localeTag).format(fee)}٪`} label={tr('relationship fee')} />
                <Metric value={formatMoney(generated)} label={tr('earned together')} />
                <Metric value={latest ? dayjs(latest.scheduled_at ?? latest.created_at).locale(locale).format('D MMM') : '—'} label={tr('last session')} />
              </View>
            </View>

            <View style={styles.nextAction}>
              <View style={[styles.nextTop, rtlRow]}><View style={styles.nextIcon}><Ionicons name={signal === 'attention' ? 'pulse' : 'sparkles'} size={20} color={colors.primary} /></View><View style={{ flex: 1 }}><Txt variant="monoTag">{tr('NEXT BEST ACTION')}</Txt><Txt style={styles.nextTitle}>{tr(signal === 'attention' ? 'Reconnect before momentum disappears' : upcoming.length ? 'Keep the plan visible' : 'Turn progress into the next booking')}</Txt></View></View>
              <Txt variant="body" style={{ marginTop: 10 }}>{tr(signal === 'attention' ? 'There is no future session and this relationship is cooling. Send a thoughtful check-in—not a discount.' : upcoming.length ? 'A future session is booked. Celebrate progress and keep expectations clear.' : 'A relevant rebook prompt protects the habit and keeps payment, progress, and support together.')}</Txt>
              <Button title={tr(signal === 'attention' ? 'Send a personal check-in' : upcoming.length ? 'Celebrate their progress' : 'Invite them to rebook')} icon="paper-plane-outline" onPress={() => nudge(signal === 'attention' ? 'check_in' : upcoming.length ? 'celebrate' : 'rebook')} loading={!!busyNudge} style={{ marginTop: 15 }} />
            </View>

            <View style={[styles.sectionHead, rtlRow]}><View><Txt variant="monoTag">{tr('COACHING MEMORY')}</Txt><Txt style={styles.sectionTitle}>{tr('Context you should not lose')}</Txt></View><Ionicons name="lock-closed" size={17} color={colors.success} /></View>
            <Pressable style={styles.memoryCard} onPress={() => setSheet('goal')}>
              <View style={[styles.memoryTop, rtlRow]}><View style={styles.memoryIcon}><Ionicons name="flag" size={18} color={colors.primary} /></View><Txt variant="bodyStrong" style={{ flex: 1 }}>{tr('Current coaching goal')}</Txt><Txt style={styles.edit}>{tr('Edit')}</Txt></View>
              <Txt variant="body" style={{ marginTop: 9 }}>{record?.goal_summary || tr('Add the outcome this client is working toward—not a diagnosis.')}</Txt>
            </Pressable>
            <Pressable style={styles.memoryCard} onPress={() => setSheet('notes')}>
              <View style={[styles.memoryTop, rtlRow]}><View style={styles.memoryIcon}><Ionicons name="document-text" size={18} color={colors.primary} /></View><Txt variant="bodyStrong" style={{ flex: 1 }}>{tr('Private coaching notes')}</Txt><Txt style={styles.edit}>{tr('Edit')}</Txt></View>
              <Txt variant="body" numberOfLines={4} style={{ marginTop: 9 }}>{record?.private_notes || tr('Save session preferences, cues, and follow-up context. Never store IDs or medical diagnoses here.')}</Txt>
            </Pressable>

            <View style={[styles.sectionHead, rtlRow]}><View><Txt variant="monoTag">{tr('SIGNALS')}</Txt><Txt style={styles.sectionTitle}>{tr('Make follow-up smarter')}</Txt></View></View>
            <View style={[styles.tags, isRTL && styles.rtlWrap]}>
              {TAGS.map((tag) => {
                const active = record?.tags.includes(tag);
                return <Pressable key={tag} onPress={() => toggleTag(tag)} style={[styles.tag, active && styles.tagOn]}><Txt style={[styles.tagText, active && { color: colors.white }]}>{tr(tag)}</Txt></Pressable>;
              })}
            </View>

            <Card>
              <View style={[styles.followHead, rtlRow]}><View style={styles.memoryIcon}><Ionicons name="alarm" size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Txt variant="bodyStrong">{tr('Follow-up rhythm')}</Txt><Txt variant="caption" style={{ marginTop: 3 }}>{record?.next_follow_up_at ? locale === 'ar' ? `مجدول ${dayjs(record.next_follow_up_at).locale('ar').format('D MMM، h:mm A')}` : `Scheduled ${dayjs(record.next_follow_up_at).format('MMM D, h:mm A')}` : tr('No reminder scheduled')}</Txt></View></View>
              <View style={[styles.followChoices, rtlRow]}>{[1, 3, 7].map((days) => <Pressable key={days} onPress={() => followUp(days)} style={styles.followChoice}><Txt style={styles.followChoiceText}>{days === 1 ? tr('Tomorrow') : locale === 'ar' ? `بعد ${new Intl.NumberFormat(localeTag).format(days)} أيام` : `In ${days} days`}</Txt></Pressable>)}</View>
            </Card>

            <View style={[styles.sectionHead, rtlRow]}><View><Txt variant="monoTag">{tr('ON-PLATFORM VALUE')}</Txt><Txt style={styles.sectionTitle}>{tr('Useful reasons to come back')}</Txt></View></View>
            <View style={styles.nudges}>
              <Nudge icon="repeat" title={tr('Rebook prompt')} copy={tr('Reference real availability without sending private phone numbers.')} onPress={() => nudge('rebook')} busy={busyNudge === 'rebook'} />
              <Nudge icon="chatbubble-ellipses" title={tr('Human check-in')} copy={tr('Ask about energy and fit before the relationship cools.')} onPress={() => nudge('check_in')} busy={busyNudge === 'check_in'} />
              <Nudge icon="trophy" title={tr('Celebrate progress')} copy={tr('Turn an attended session into visible momentum and XP.')} onPress={() => nudge('celebrate')} busy={busyNudge === 'celebrate'} />
            </View>

            {latest && <Button title={tr('Open latest session & chat')} variant="secondary" icon={isRTL ? 'arrow-back' : 'arrow-forward'} onPress={() => router.push({ pathname: '/trainer-session/[id]', params: { id: latest.id } })} />}
          </>
        )}
      </ScrollView>

      <InputSheet visible={sheet === 'goal'} title={tr('Current coaching goal')} fields={[{ key: 'goal', label: tr('Outcome and approach'), placeholder: tr('Example: build confidence with two strength sessions each week'), initial: record?.goal_summary ?? '', multiline: true, maxLength: 600 }]} onSubmit={async (values) => save({ goal_summary: values.goal })} onClose={() => setSheet(null)} />
      <InputSheet visible={sheet === 'notes'} title={tr('Private coaching notes')} fields={[{ key: 'notes', label: tr('Visible only to you'), placeholder: tr('Preferences, useful cues, and what to revisit next time'), initial: record?.private_notes ?? '', multiline: true, maxLength: 3000 }]} onSubmit={async (values) => save({ private_notes: values.notes })} onClose={() => setSheet(null)} />
    </SafeAreaView>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <View style={styles.metric}><Txt style={styles.metricValue}>{value}</Txt><Txt style={styles.metricLabel}>{label}</Txt></View>;
}

function Nudge({ icon, title, copy, onPress, busy }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string; onPress: () => void; busy: boolean }) {
  return <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [styles.nudge, pressed && { opacity: 0.85 }]}><View style={styles.nudgeIcon}><Ionicons name={icon} size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Txt variant="bodyStrong">{title}</Txt><Txt variant="caption" style={{ marginTop: 3 }}>{copy}</Txt></View><Ionicons name={busy ? 'hourglass-outline' : 'paper-plane-outline'} size={18} color={colors.primary} /></Pressable>;
}

function demoBooking(clientId: string, created: string): Booking {
  return { id: `demo-${clientId}`, client_id: clientId, trainer_id: 'demo-trainer', session_type_id: null, status: 'completed', format: 'in_person', scheduled_at: created, duration_min: 60, address_line: null, city: 'Riyadh', lat: null, lng: null, virtual_link: null, is_split: false, friend_email: null, equipment_by_trainer: false, equipment_items: [], base_price: 250, equipment_fee: 0, peak_surge: 0, service_fee: 0, total: 250, amount_due: 250, stripe_checkout_id: null, stripe_payment_intent: null, paid: true, trainer_payout: 225, created_at: created, updated_at: created };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, paddingBottom: 42, gap: 13 },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  rtlWrap: { direction: 'rtl' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  headerTitle: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -1, color: colors.textPrimary, marginTop: 5 },
  hero: { overflow: 'hidden', borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.primaryBorder, padding: 18 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: fonts.extrabold, fontSize: 23, color: colors.textPrimary, letterSpacing: -0.7 },
  metrics: { flexDirection: 'row', marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.border },
  metric: { flex: 1, alignItems: 'center', paddingHorizontal: 3 },
  metricValue: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  metricLabel: { fontFamily: fonts.medium, fontSize: 8, color: colors.textDim, marginTop: 4, textAlign: 'center' },
  nextAction: { borderRadius: radius.xl, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.primaryBorder, padding: 16 },
  nextTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  nextIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  nextTitle: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: colors.textPrimary, marginTop: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 9 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 27, letterSpacing: -0.7, color: colors.textPrimary, marginTop: 5 },
  memoryCard: { borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 15 },
  memoryTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memoryIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  edit: { fontFamily: fonts.bold, fontSize: 11, color: colors.primary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tagOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textSecondary },
  followHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  followChoices: { flexDirection: 'row', gap: 8, marginTop: 14 },
  followChoice: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceHigh },
  followChoiceText: { fontFamily: fonts.bold, fontSize: 10, color: colors.textSecondary },
  nudges: { gap: 9 },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  nudgeIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
});
