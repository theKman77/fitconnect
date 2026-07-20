import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { colors, fonts, radius } from '@/theme';
import { config, formatMoney } from '@/lib/config';
import { useAuth } from '@/context/auth';
import {
  getBookingCounterpart,
  getMyTrainer,
  listTrainerBookings,
  setTrainerOnline,
  STATUS_LABEL,
  type BookingCounterpart,
} from '@/lib/trainer';
import { tierForSessions, repeatClientFeePct } from '@/lib/gamification';
import { Avatar, Badge, Card, EmptyState, Skeleton, Txt } from '@/components/ui';
import { notify } from '@/lib/confirm';
import type { Booking, Trainer } from '@/types/domain';
import { useLocale } from '@/context/locale';

const ACTIVE = ['confirmed', 'en_route', 'arriving', 'in_progress'];

export default function TrainerBusinessHub() {
  const router = useRouter();
  const { profile } = useAuth();
  const { locale, localeTag, isRTL, tr } = useLocale();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [counterparts, setCounterparts] = useState<Record<string, BookingCounterpart>>({});
  const [online, setOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const value = await getMyTrainer(profile);
      const nextBookings = await listTrainerBookings(value);
      setTrainer(value);
      setOnline(!!value?.available_now);
      setBookings(nextBookings);

      const latestByClient = new Map<string, Booking>();
      for (const booking of nextBookings) if (!latestByClient.has(booking.client_id)) latestByClient.set(booking.client_id, booking);
      const people = await Promise.all(
        [...latestByClient.values()].slice(0, 8).map(async (booking) => [booking.client_id, await getBookingCounterpart(booking.id).catch(() => null)] as const),
      );
      setCounterparts(Object.fromEntries(people.filter((entry): entry is [string, BookingCounterpart] => !!entry[1])));
    } catch (error: any) {
      setLoadError(error?.message ?? tr('Could not refresh your business hub.'));
    } finally {
      setLoaded(true);
    }
  }, [profile, tr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleOnline(value: boolean) {
    setOnline(value);
    try {
      await setTrainerOnline(trainer, value);
    } catch (error: any) {
      setOnline(!value);
      notify(tr('Status not changed'), error?.message ?? tr('Please try again.'));
    }
  }

  const upcoming = useMemo(() => bookings
    .filter((booking) => ACTIVE.includes(booking.status))
    .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? '')), [bookings]);
  const completed = bookings.filter((booking) => booking.status === 'completed');
  const paidCompleted = completed.filter((booking) => booking.paid);
  const earnings = paidCompleted.reduce((sum, booking) => sum + (booking.trainer_payout ?? 0), 0);
  const monthEarnings = paidCompleted
    .filter((booking) => dayjs(booking.scheduled_at ?? booking.created_at).isSame(dayjs(), 'month'))
    .reduce((sum, booking) => sum + (booking.trainer_payout ?? 0), 0);
  const simulatedPipeline = completed.filter((booking) => !booking.paid).reduce((sum, booking) => sum + (booking.trainer_payout ?? 0), 0);
  const nextBooking = upcoming[0];
  const tier = tierForSessions(completed.length);

  const byClient = new Map<string, Booking[]>();
  for (const booking of completed) byClient.set(booking.client_id, [...(byClient.get(booking.client_id) ?? []), booking]);
  const clients = [...byClient.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 5);
  const repeatClients = clients.filter(([, sessions]) => sessions.length > 1).length;
  const repeatRate = clients.length ? Math.round((repeatClients / clients.length) * 100) : 0;
  const attentionClients = clients.filter(([clientId, sessions]) => {
    const latest = [...sessions].sort((a, b) => (b.scheduled_at ?? b.created_at).localeCompare(a.scheduled_at ?? a.created_at))[0];
    const hasUpcoming = upcoming.some((booking) => booking.client_id === clientId);
    return !hasUpcoming && dayjs().diff(dayjs(latest.scheduled_at ?? latest.created_at), 'day') >= 21;
  }).length;

  const weeks = Array.from({ length: 6 }, (_, index) => dayjs().startOf('week').subtract(5 - index, 'week'));
  const weekly = weeks.map((week) => paidCompleted
    .filter((booking) => dayjs(booking.scheduled_at ?? booking.created_at).isSame(week, 'week'))
    .reduce((sum, booking) => sum + (booking.trainer_payout ?? 0), 0));
  const maxWeek = Math.max(1, ...weekly);

  const days = Array.from({ length: 7 }, (_, index) => dayjs().add(index, 'day'));
  const perDay = days.map((date) => upcoming.filter((booking) => booking.scheduled_at && dayjs(booking.scheduled_at).isSame(date, 'day')).length);
  const bookedDays = perDay.filter(Boolean).length;
  const firstName = (profile?.full_name ?? 'Coach').split(' ')[0];

  const profileSignals = [trainer?.headline, trainer?.bio, trainer?.avatar_url, trainer?.video_intro_url, trainer?.specialties.length, Object.keys(trainer?.socials ?? {}).length];
  const profileStrength = Math.round((profileSignals.filter(Boolean).length / profileSignals.length) * 100);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={[styles.header, isRTL && styles.rtlRow]}>
          <View style={{ flex: 1 }}>
            <Txt variant="monoTag">{tr('TRAINER BUSINESS HUB')}</Txt>
            <Txt style={styles.title}>{isRTL ? `امتلك يومك، ${firstName}.` : `Own your day, ${firstName}.`}</Txt>
          </View>
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={48} />
        </View>

        {loadError && <Card><EmptyState icon="cloud-offline-outline" title={tr('Hub unavailable')} subtitle={loadError} actionLabel={tr('Try again')} onAction={load} /></Card>}

        {!loaded ? <DashboardSkeleton /> : (
          <>
            <View style={styles.commandCard}>
              <LinearGradient colors={['#2A1712', colors.surfaceElevated, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={styles.commandGlow} />
              <View style={[styles.onlineRow, isRTL && styles.rtlRow]}>
                <View style={[styles.statusDot, { backgroundColor: online ? colors.success : colors.textFaint }]} />
                <View style={{ flex: 1 }}>
                  <Txt style={styles.onlineTitle}>{tr(online ? 'Open for new clients' : 'Not taking instant bookings')}</Txt>
                  <Txt style={styles.onlineCopy}>{tr(online ? 'Your profile is visible as available now.' : 'Your published schedule is still bookable.')}</Txt>
                </View>
                <Switch value={online} onValueChange={toggleOnline} trackColor={{ false: colors.surfaceHigh, true: colors.success }} thumbColor={colors.white} />
              </View>

              <View style={styles.commandDivider} />
              {nextBooking ? (
                <Pressable onPress={() => router.push({ pathname: '/trainer-session/[id]', params: { id: nextBooking.id } })} style={[styles.nextSession, isRTL && styles.rtlRow]}>
                  <View style={styles.timeTile}>
                    <Txt style={styles.timeMain}>{new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(new Date(nextBooking.scheduled_at!))}</Txt>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="monoTag">NEXT UP · {dayjs(nextBooking.scheduled_at).format('ddd').toUpperCase()}</Txt>
                    <Txt variant="bodyStrong" style={{ marginTop: 5 }}>{counterparts[nextBooking.client_id]?.full_name ?? tr('Client session')}</Txt>
                    <Txt variant="caption" style={{ marginTop: 3 }}>{nextBooking.format === 'virtual' ? tr('Virtual coaching') : nextBooking.city ?? tr('In person')} · {new Intl.NumberFormat(localeTag).format(nextBooking.duration_min)} {locale === 'ar' ? 'دقيقة' : 'min'}</Txt>
                  </View>
                  <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={20} color={colors.primary} />
                </Pressable>
              ) : (
                <Pressable onPress={() => router.push('/trainer-availability' as any)} style={[styles.nextSession, isRTL && styles.rtlRow]}>
                  <View style={styles.emptyNextIcon}><Ionicons name="calendar-outline" size={21} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}><Txt variant="bodyStrong">{tr('Turn empty hours into bookable time')}</Txt><Txt variant="caption" style={{ marginTop: 3 }}>{tr('Publish openings clients can reserve instantly.')}</Txt></View>
                  <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={20} color={colors.primary} />
                </Pressable>
              )}
            </View>

            {trainer?.onboarding_status && trainer.onboarding_status !== 'approved' && (
              <Pressable onPress={() => router.push('/trainer-edit' as any)} style={[styles.reviewBanner, isRTL && styles.rtlRow]}>
                <Ionicons name="document-text-outline" size={19} color={colors.primary} />
                <View style={{ flex: 1 }}><Txt variant="bodyStrong">{tr('Finish your trainer application')}</Txt><Txt variant="caption" style={{ marginTop: 2 }}>{tr('Your public profile stays hidden until it is approved.')}</Txt></View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textDim} />
              </Pressable>
            )}

            <View style={styles.quickGrid}>
              <QuickAction icon="calendar" label={tr('Schedule')} meta={`${new Intl.NumberFormat(localeTag).format(bookedDays)}/٧ ${tr('active days')}`} onPress={() => router.push('/trainer-availability' as any)} />
              <QuickAction icon="sparkles" label={tr('Public profile')} meta={`${new Intl.NumberFormat(localeTag).format(profileStrength)}٪ ${tr('complete')}`} onPress={() => trainer ? router.push(`/trainer/${trainer.id}`) : router.push('/trainer-edit' as any)} />
              <QuickAction icon="create-outline" label={tr('Edit offer')} meta={`${tr('From')} ${formatMoney(trainer?.base_price ?? 0)}`} onPress={() => router.push('/trainer-edit' as any)} />
              <QuickAction icon="heart-circle-outline" label={tr('Retention studio')} meta={attentionClients ? locale === 'ar' ? `${new Intl.NumberFormat(localeTag).format(attentionClients)} تحتاج متابعة` : `${attentionClients} need attention` : tr('Clients on track')} onPress={() => router.push('/trainer-clients' as any)} />
            </View>

            <View style={styles.sectionHead}>
              <View><Txt variant="monoTag">{tr('BUSINESS PULSE')}</Txt><Txt style={styles.sectionTitle}>{tr('The numbers that matter')}</Txt></View>
            </View>
            <View style={styles.metrics}>
              <Metric value={formatMoney(config.paymentsEnabled ? monthEarnings : simulatedPipeline)} label={tr(config.paymentsEnabled ? 'This month' : 'Demo pipeline')} icon={config.paymentsEnabled ? 'wallet' : 'flask'} />
              <Metric value={new Intl.NumberFormat(localeTag).format(upcoming.length)} label={tr('Upcoming')} icon="calendar-outline" />
              <Metric value={`${new Intl.NumberFormat(localeTag).format(repeatRate)}٪`} label={tr('Repeat clients')} icon="repeat" />
            </View>

            <View style={styles.tierCard}>
              <View style={styles.tierTop}>
                <View style={styles.tierShield}><Ionicons name={tier.current.icon} size={23} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Txt variant="monoTag">{tr('FITCONNECT PARTNER LEVEL')}</Txt>
                  <Txt style={styles.tierTitle}>{tier.current.name} · {tier.current.feePct}% platform fee</Txt>
                </View>
                <Badge label={`${new Intl.NumberFormat(localeTag).format(completed.length)} ${tr('SESSIONS')}`} tone="neutral" />
              </View>
              {tier.next ? (
                <>
                  <View style={styles.tierTrack}><View style={[styles.tierFill, { width: `${Math.max(4, tier.progress * 100)}%` }]} /></View>
                  <Txt variant="caption" style={{ marginTop: 9 }}>{tier.next.minSessions - completed.length} on-platform sessions to {tier.next.name}: {tier.next.feePct}% fee and {tier.next.perks[0].toLowerCase()}.</Txt>
                </>
              ) : <Txt variant="caption" style={{ marginTop: 10 }}>{tr('Elite status keeps your lowest fee, top discovery position, and future partner perks.')}</Txt>}
            </View>

            <View style={styles.valueCard}>
              <View style={styles.valueTop}>
                <View style={styles.valueMark}><Ionicons name="infinite" size={22} color={colors.white} /></View>
                <View style={{ flex: 1 }}><Txt style={styles.valueTitle}>{tr('Your client book compounds here.')}</Txt><Txt variant="body" style={{ marginTop: 5 }}>{tr('Every completed session improves retention economics instead of resetting the relationship.')}</Txt></View>
              </View>
              <View style={styles.valueList}>
                <ValueLine icon="trending-down" text={tr('Repeat-client fees can fall as low as 3%.')} />
                <ValueLine icon="people" text={tr('Session history and rebooking stay organized per client.')} />
                <ValueLine icon="shield-checkmark" text={tr('Payment records, support, progress, and discovery remain attached.')} />
              </View>
            </View>

            <View style={styles.sectionHead}>
              <View><Txt variant="monoTag">{tr('RELATIONSHIPS')}</Txt><Txt style={styles.sectionTitle}>{tr('Clients worth keeping')}</Txt></View>
              <Pressable onPress={() => router.push('/(trainer)/bookings')}><Txt style={styles.link}>{tr('All bookings')}</Txt></Pressable>
            </View>
            {clients.length === 0 ? (
              <Card><EmptyState icon="people-outline" title={tr('Your client book starts here')} subtitle={tr('Completed sessions become organized client relationships with better repeat-client economics.')} /></Card>
            ) : (
              <Card padded={false}>
                {clients.map(([clientId, sessions], index) => {
                  const person = counterparts[clientId];
                  const fee = repeatClientFeePct(sessions.length, tier.current.feePct);
                  const latest = [...sessions].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
                  return (
                    <Pressable key={clientId} onPress={() => router.push(`/trainer-client/${clientId}` as any)} style={[styles.clientRow, index < clients.length - 1 && styles.rowBorder]}>
                      <Avatar uri={person?.avatar_url} name={person?.full_name ?? 'Client'} size={44} />
                      <View style={{ flex: 1 }}>
                        <Txt variant="bodyStrong">{person?.full_name ?? 'Client'}</Txt>
                        <Txt variant="caption" style={{ marginTop: 3 }}>{sessions.length} session{sessions.length === 1 ? '' : 's'} together · {dayjs(latest.scheduled_at ?? latest.created_at).format('MMM D')}</Txt>
                      </View>
                      <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 5 }}><Badge label={`${new Intl.NumberFormat(localeTag).format(fee)}٪ ${locale === 'ar' ? 'عمولة' : 'FEE'}`} tone={fee < tier.current.feePct ? 'success' : 'neutral'} /><Txt style={styles.rebook}>{tr('Follow up')} {isRTL ? '←' : '→'}</Txt></View>
                    </Pressable>
                  );
                })}
              </Card>
            )}

            <View style={styles.sectionHead}><View><Txt variant="monoTag">{tr('FORWARD VIEW')}</Txt><Txt style={styles.sectionTitle}>{tr('Next seven days')}</Txt></View></View>
            <View style={styles.weekGrid}>
              {days.map((date, index) => {
                const count = perDay[index];
                const firstSession = upcoming.find((booking) => dayjs(booking.scheduled_at).isSame(date, 'day'));
                return (
                  <Pressable
                    key={date.format('YYYY-MM-DD')}
                    onPress={() => router.push('/trainer-availability' as any)}
                    accessibilityLabel={`${date.format('dddd, MMMM D')}, ${count} sessions`}
                    style={({ pressed }) => [styles.agendaDay, count > 0 && styles.agendaDayOn, pressed && styles.pressed]}
                  >
                    <View style={styles.agendaDate}>
                      <Txt style={[styles.agendaDayName, count > 0 && { color: colors.primary }]}>{date.locale(locale).format('ddd').toUpperCase()}</Txt>
                      <Txt style={styles.agendaDayNumber}>{new Intl.NumberFormat(localeTag).format(Number(date.format('D')))}</Txt>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt variant="bodyStrong" numberOfLines={1}>{count > 0 ? locale === 'ar' ? `${new Intl.NumberFormat(localeTag).format(count)} جلسات` : `${count} session${count === 1 ? '' : 's'}` : tr('Open day')}</Txt>
                      <Txt variant="caption" numberOfLines={1} style={{ marginTop: 3 }}>{firstSession ? locale === 'ar' ? `الأولى ${new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(new Date(firstSession.scheduled_at!))}` : `First at ${dayjs(firstSession.scheduled_at).format('h:mm A')}` : tr('Add availability')}</Txt>
                    </View>
                    <Ionicons name={count > 0 ? 'checkmark-circle' : 'add-circle-outline'} size={18} color={count > 0 ? colors.success : colors.textDim} />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.sectionHead}><View><Txt variant="monoTag">{tr('EARNINGS TREND')}</Txt><Txt style={styles.sectionTitle}>{config.paymentsEnabled ? formatMoney(earnings) : tr('Ready for live payments')}</Txt></View></View>
            <Card>
              <View style={styles.chart}>
                {weekly.map((value, index) => (
                  <View key={weeks[index].format('YYYY-MM-DD')} style={styles.chartColumn}>
                    <View style={[styles.chartBar, { height: 8 + (value / maxWeek) * 64, opacity: value ? 1 : 0.2 }]} />
                    <Txt style={styles.chartLabel}>{weeks[index].format('D/M')}</Txt>
                  </View>
                ))}
              </View>
              <View style={styles.protectionRow}>
                <Ionicons name={config.paymentsEnabled ? 'shield-checkmark' : 'business-outline'} size={16} color={config.paymentsEnabled ? colors.success : colors.primary} />
                <Txt variant="caption" style={{ flex: 1 }}>{tr(config.paymentsEnabled ? 'Paid, completed sessions are eligible for settlement.' : 'Your CR and Moyasar approval are the only missing steps before tracked bookings can become real payouts.')}</Txt>
              </View>
            </Card>

            <View style={styles.sectionHead}><View><Txt variant="monoTag">{tr('SESSIONS')}</Txt><Txt style={styles.sectionTitle}>{tr('Coming up')}</Txt></View></View>
            <View style={{ gap: 10 }}>
              {upcoming.slice(0, 4).map((booking) => (
                <Pressable key={booking.id} onPress={() => router.push({ pathname: '/trainer-session/[id]', params: { id: booking.id } })} style={styles.bookingCard}>
                  <View style={styles.bookingDate}><Txt style={styles.bookingDay}>{dayjs(booking.scheduled_at).format('DD')}</Txt><Txt style={styles.bookingMonth}>{dayjs(booking.scheduled_at).format('MMM').toUpperCase()}</Txt></View>
                  <View style={{ flex: 1 }}><Txt variant="bodyStrong">{counterparts[booking.client_id]?.full_name ?? tr('Client session')}</Txt><Txt variant="caption" style={{ marginTop: 3 }}>{new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(new Date(booking.scheduled_at!))} · {booking.format === 'virtual' ? tr('Virtual') : booking.city ?? tr('In person')}</Txt></View>
                  <Badge label={tr(STATUS_LABEL[booking.status]).toUpperCase()} tone={booking.status === 'in_progress' ? 'success' : 'brand'} />
                </Pressable>
              ))}
              {upcoming.length === 0 && <Card><EmptyState icon="calendar-outline" title={tr('No sessions scheduled')} subtitle={tr('Publish openings or go online to make the next booking easy.')} actionLabel={tr('Open schedule')} onAction={() => router.push('/trainer-availability' as any)} /></Card>}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, meta, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; meta: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}><View style={styles.quickIcon}><Ionicons name={icon} size={19} color={colors.primary} /></View><Txt style={styles.quickLabel}>{label}</Txt><Txt style={styles.quickMeta} numberOfLines={1}>{meta}</Txt></Pressable>;
}

function Metric({ value, label, icon }: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return <View style={styles.metric}><Ionicons name={icon} size={17} color={colors.primary} /><Txt style={styles.metricValue} numberOfLines={1}>{value}</Txt><Txt style={styles.metricLabel}>{label}</Txt></View>;
}

function ValueLine({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.valueLine}><Ionicons name={icon} size={16} color={colors.primaryLight} /><Txt style={styles.valueText}>{text}</Txt></View>;
}

function DashboardSkeleton() {
  return <View style={{ gap: 14 }}><Skeleton height={210} /><View style={{ flexDirection: 'row', gap: 10 }}><Skeleton width="32%" height={105} /><Skeleton width="32%" height={105} /><Skeleton width="32%" height={105} /></View><Skeleton height={130} /><Skeleton height={180} /></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 34, gap: 14, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 },
  title: { fontFamily: fonts.extrabold, fontSize: 31, lineHeight: 35, letterSpacing: -1.25, color: colors.textPrimary, marginTop: 6 },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  commandCard: { minHeight: 210, borderRadius: radius.xxl, overflow: 'hidden', padding: 18, borderWidth: 1, borderColor: colors.primaryBorder },
  commandGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -90, top: -110, backgroundColor: colors.primaryTintStrong },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  onlineTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  onlineCopy: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 3 },
  commandDivider: { height: 1, backgroundColor: colors.border, marginVertical: 17 },
  nextSession: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  timeTile: { minWidth: 66, height: 66, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  timeMain: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.white },
  timePeriod: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 0.8, color: 'rgba(255,255,255,0.78)' },
  emptyNextIcon: { width: 54, height: 54, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  reviewBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder, padding: 15 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  quickAction: { flexGrow: 1, flexBasis: '46%', minWidth: 0, minHeight: 106, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, padding: 13 },
  quickIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  quickLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.textPrimary, marginTop: 12 },
  quickMeta: { fontFamily: fonts.regular, fontSize: 9, color: colors.textDim, marginTop: 3 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingTop: 14 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 26, letterSpacing: -0.65, color: colors.textPrimary, marginTop: 5 },
  link: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
  metrics: { flexDirection: 'row', gap: 9 },
  metric: { flex: 1, minWidth: 0, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, padding: 14 },
  metricValue: { fontFamily: fonts.extrabold, fontSize: 17, letterSpacing: -0.5, color: colors.textPrimary, marginTop: 10 },
  metricLabel: { fontFamily: fonts.medium, fontSize: 9, color: colors.textDim, marginTop: 3 },
  tierCard: { borderRadius: radius.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primaryBorder, padding: 18 },
  tierTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tierShield: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  tierTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary, marginTop: 4 },
  tierTrack: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceHigh, overflow: 'hidden', marginTop: 16 },
  tierFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  valueCard: { borderRadius: radius.xxl, overflow: 'hidden', backgroundColor: '#25130F', borderWidth: 1, borderColor: colors.primaryBorder, padding: 18 },
  valueTop: { flexDirection: 'row', gap: 13 },
  valueMark: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  valueTitle: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: colors.textPrimary },
  valueList: { gap: 10, marginTop: 17, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.primaryBorder },
  valueLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  valueText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rebook: { fontFamily: fonts.bold, fontSize: 9, color: colors.primary },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  agendaDay: { width: '48%', flexGrow: 1, minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
  agendaDayOn: { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder },
  agendaDate: { width: 39, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  agendaDayName: { fontFamily: fonts.monoBold, fontSize: 7, color: colors.textDim, letterSpacing: 0.5 },
  agendaDayNumber: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.textPrimary, marginTop: 2 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 94 },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  chartBar: { width: '66%', borderRadius: 5, backgroundColor: colors.primary },
  chartLabel: { fontFamily: fonts.mono, fontSize: 8, color: colors.textDim },
  protectionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  bookingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, padding: 11 },
  bookingDate: { width: 52, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  bookingDay: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.textPrimary },
  bookingMonth: { fontFamily: fonts.monoBold, fontSize: 8, color: colors.primary, letterSpacing: 0.7 },
});
