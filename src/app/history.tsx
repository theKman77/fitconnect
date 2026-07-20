import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { colors, fonts, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { useAuth } from '@/context/auth';
import { useBooking } from '@/context/booking';
import { listMyBookings } from '@/lib/bookings';
import { getTrainer, listTrainers } from '@/lib/api';
import { listAvailability } from '@/lib/trainer';
import { isBackendConfigured } from '@/lib/supabase';
import { Badge, Card, EmptyState, Txt } from '@/components/ui';
import type { Booking, BookingStatus, Trainer } from '@/types/domain';
import { useLocale } from '@/context/locale';

const STATUS_TONE: Record<string, 'success' | 'brand' | 'neutral' | 'danger'> = {
  completed: 'success',
  confirmed: 'brand',
  cancelled: 'danger',
};

const PAST: Array<{ trainerId: string; trainer: string; when: string; total: number; status: BookingStatus }> = [
  { trainerId: 't-maya', trainer: 'Maya Okafor', when: dayjs().subtract(2, 'day').toISOString(), total: 308, status: 'completed' },
  { trainerId: 't-aisha', trainer: 'Aisha Rahman', when: dayjs().subtract(9, 'day').toISOString(), total: 220, status: 'completed' },
  { trainerId: 't-diego', trainer: 'Diego Santos', when: dayjs().subtract(16, 'day').toISOString(), total: 242, status: 'completed' },
];

type RebookSource = Pick<Booking, 'id' | 'trainer_id' | 'session_type_id' | 'format' | 'address_line' | 'city' | 'equipment_by_trainer' | 'equipment_items' | 'scheduled_at'>;

export default function History() {
  const router = useRouter();
  const { profile } = useAuth();
  const { start } = useBooking();
  const { locale, localeTag, isRTL, tr } = useLocale();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allTrainers, setAllTrainers] = useState<Trainer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rebooking, setRebooking] = useState<string | null>(null);
  const useLiveData = isBackendConfigured && Boolean(profile);

  useEffect(() => {
    Promise.all([useLiveData ? listMyBookings(profile!.id) : Promise.resolve([]), listTrainers()])
      .then(([nextBookings, nextTrainers]) => { setBookings(nextBookings); setAllTrainers(nextTrainers); })
      .catch(() => setError(tr('Could not load session history.')))
      .finally(() => setLoaded(true));
  }, [profile?.id, tr, useLiveData]);

  const trainerName = (id: string) => allTrainers.find((trainer) => trainer.id === id)?.display_name ?? tr('Trainer');

  async function rebook(input: RebookSource) {
    setRebooking(input.id);
    setError(null);
    try {
      const detail = await getTrainer(input.trainer_id, !profile && input.trainer_id.startsWith('t-'));
      if (!detail) throw new Error(tr('Trainer profile unavailable.'));
      const plans = detail.session_types.filter((plan) => plan.active && plan.kind !== 'subscription');
      const plan = plans.find((item) => item.id === input.session_type_id) ?? plans.find((item) => item.popular) ?? plans[0];
      if (!plan) throw new Error(tr('No bookable plan is available.'));

      const openings = (await listAvailability(detail)).filter((slot) => !slot.booked && dayjs(slot.starts_at).isAfter(dayjs().add(15, 'minute')));
      if (profile && openings.length === 0) {
        router.push(`/waitlist/${detail.id}` as any);
        return;
      }

      const opening = openings[0];
      const oldHour = input.scheduled_at ? dayjs(input.scheduled_at).hour() : 9;
      const fallback = dayjs().add(1, 'day').hour(oldHour).minute(0).second(0);
      const scheduledAt = opening ? new Date(opening.starts_at) : fallback.toDate();
      start(detail, plans, plan, {
        format: input.format,
        addressLine: input.address_line ?? 'Al Olaya St 128, Apt 4B',
        city: input.city ?? profile?.city ?? detail.city ?? 'Riyadh',
        equipmentByTrainer: input.equipment_by_trainer,
        equipmentItems: input.equipment_items,
        scheduledAt,
        isPeak: opening?.is_peak ?? (scheduledAt.getHours() >= 18 && scheduledAt.getHours() < 20),
      });
      router.push({ pathname: '/booking/[trainerId]', params: { trainerId: detail.id, startStep: '3', rebook: '1' } });
    } catch (value: any) {
      setError(value?.message ?? tr('Could not prepare your repeat booking.'));
    } finally {
      setRebooking(null);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.textPrimary} />
        </Pressable>
        <Txt variant="sectionTitle">{tr('Session history')}</Txt>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.repeatHero, isRTL && styles.rtlRow]}><View style={styles.repeatHeroIcon}><Ionicons name="repeat" size={20} color={colors.primary} /></View><View style={{ flex: 1 }}><Txt variant="bodyStrong">{tr('Your next session can start from the last one.')}</Txt><Txt variant="caption" style={{ marginTop: 3 }}>{tr('Repeat keeps your plan, format, equipment, and location—then uses the next real opening.')}</Txt></View></View>
        {error && <EmptyState icon="cloud-offline-outline" title={tr('History unavailable')} subtitle={error} />}
        {bookings.length > 0 && <Txt variant="label">{tr('This session')}</Txt>}

        {bookings.map((booking) => (
          <Card key={booking.id}>
            <SessionRow
              name={trainerName(booking.trainer_id)}
              when={booking.scheduled_at ?? booking.created_at}
              total={booking.amount_due}
              status={booking.status}
              locale={locale}
              localeTag={localeTag}
              isRTL={isRTL}
              tr={tr}
              onOpen={() => router.push(`/session/${booking.id}/track`)}
              onRebook={booking.status === 'completed' ? () => rebook(booking) : undefined}
              rebooking={rebooking === booking.id}
            />
          </Card>
        ))}

        {loaded && !error && useLiveData && bookings.length === 0 && (
          <EmptyState icon="time" title={tr('No sessions yet')} subtitle={tr('Book your first session and it will show up here.')} actionLabel={tr('Find a trainer')} onAction={() => router.push('/(tabs)/discover')} />
        )}

        {!useLiveData && (
          <>
            <Txt variant="label" style={{ marginTop: bookings.length ? 8 : 0 }}>{tr('Earlier')}</Txt>
            {PAST.map((past, index) => (
              <Card key={past.trainerId}>
                <SessionRow name={past.trainer} when={past.when} total={past.total} status={past.status} locale={locale} localeTag={localeTag} isRTL={isRTL} tr={tr}
                  onRebook={() => rebook({ id: `past-${index}`, trainer_id: past.trainerId, session_type_id: null, format: 'in_person', address_line: 'Al Olaya St 128, Apt 4B', city: 'Riyadh', equipment_by_trainer: false, equipment_items: [], scheduled_at: past.when })}
                  rebooking={rebooking === `past-${index}`}
                />
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SessionRow({ name, when, total, status, locale, localeTag, isRTL, tr, onOpen, onRebook, rebooking }: {
  name: string;
  when: string;
  total: number;
  status: string;
  locale: 'en' | 'ar';
  localeTag: string;
  isRTL: boolean;
  tr: (value: string) => string;
  onOpen?: () => void;
  onRebook?: () => void;
  rebooking?: boolean;
}) {
  return (
    <View>
      <Pressable accessibilityRole={onOpen ? 'button' : undefined} onPress={onOpen} style={[styles.row, isRTL && styles.rtlRow]}>
        <View style={styles.icon}><Ionicons name="barbell" size={18} color={colors.primary} /></View>
        <View style={{ flex: 1 }}><Txt variant="bodyStrong">{name}</Txt><Txt variant="caption" style={{ marginTop: 2 }}>{dayjs(when).locale(locale).format('ddd، D MMM')} · {new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(new Date(when))}</Txt></View>
        <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 5 }}><Txt variant="bodyStrong">{formatMoney(total)}</Txt><Badge label={tr(status).toUpperCase()} tone={STATUS_TONE[status] ?? 'neutral'} /></View>
      </Pressable>
      {onRebook && <Pressable accessibilityRole="button" accessibilityLabel={`${tr('Repeat with')} ${name}`} disabled={rebooking} onPress={onRebook} style={[styles.repeatButton, isRTL && styles.rtlRow]}><Ionicons name={rebooking ? 'hourglass-outline' : 'repeat'} size={16} color={colors.primary} /><Txt style={styles.repeatText}>{rebooking ? tr('Preparing…') : tr('Repeat with same setup')}</Txt><Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={15} color={colors.primary} /></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  content: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: 22, paddingBottom: 40, gap: 12 },
  repeatHero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, padding: 15, backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder },
  repeatHeroIcon: { width: 42, height: 42, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  repeatButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 13, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  repeatText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
});
