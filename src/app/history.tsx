import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { colors, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { useAuth } from '@/context/auth';
import { listMyBookings } from '@/lib/bookings';
import { listTrainers } from '@/lib/api';
import { isBackendConfigured } from '@/lib/supabase';
import { Badge, Card, EmptyState, Txt } from '@/components/ui';
import type { Booking, BookingStatus, Trainer } from '@/types/domain';
import { useLocale } from '@/context/locale';

const STATUS_TONE: Record<string, 'success' | 'brand' | 'neutral' | 'danger'> = {
  completed: 'success',
  confirmed: 'brand',
  cancelled: 'danger',
};

/** Showcase past sessions so the screen isn't empty on first open. */
const PAST: Array<{ trainer: string; when: string; total: number; status: BookingStatus }> = [
  { trainer: 'Maya Okafor', when: dayjs().subtract(2, 'day').toISOString(), total: 308, status: 'completed' },
  { trainer: 'Aisha Rahman', when: dayjs().subtract(9, 'day').toISOString(), total: 220, status: 'completed' },
  { trainer: 'Diego Santos', when: dayjs().subtract(16, 'day').toISOString(), total: 242, status: 'completed' },
];

export default function History() {
  const router = useRouter();
  const { profile } = useAuth();
  const { locale, localeTag, isRTL, tr } = useLocale();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allTrainers, setAllTrainers] = useState<Trainer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listMyBookings(profile?.id ?? 'demo-client'), listTrainers()])
      .then(([b, t]) => { setBookings(b); setAllTrainers(t); })
      .catch(() => setError(tr('Could not load session history.')))
      .finally(() => setLoaded(true));
  }, [profile?.id, tr]);

  const trainerName = (id: string) => allTrainers.find((t) => t.id === id)?.display_name ?? tr('Trainer');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.textPrimary} />
        </Pressable>
        <Txt variant="sectionTitle">{tr('Session history')}</Txt>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 22, gap: 12 }} showsVerticalScrollIndicator={false}>
        {error && <EmptyState icon="cloud-offline-outline" title={tr('History unavailable')} subtitle={error} />}
        {bookings.length > 0 && (
          <Txt variant="label" style={{ marginBottom: 2 }}>{tr('This session')}</Txt>
        )}
        {bookings.map((b) => (
          <Card key={b.id} onPress={() => router.push(`/session/${b.id}/track`)}>
            <Row
              name={trainerName(b.trainer_id)}
              when={b.scheduled_at ?? b.created_at}
              total={b.amount_due}
              status={b.status}
              locale={locale}
              localeTag={localeTag}
              isRTL={isRTL}
              tr={tr}
            />
          </Card>
        ))}

        {loaded && !error && isBackendConfigured && bookings.length === 0 && (
          <EmptyState icon="time" title={tr('No sessions yet')}
            subtitle={tr('Book your first session and it will show up here.')}
            actionLabel={tr('Find a trainer')} onAction={() => router.push('/(tabs)/discover')} />
        )}

        {!isBackendConfigured && (
          <>
            <Txt variant="label" style={{ marginTop: bookings.length ? 14 : 0, marginBottom: 2 }}>{tr('Earlier')}</Txt>
            {PAST.map((p, i) => (
              <Card key={i}>
                <Row name={p.trainer} when={p.when} total={p.total} status={p.status} locale={locale} localeTag={localeTag} isRTL={isRTL} tr={tr} />
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ name, when, total, status, locale, localeTag, isRTL, tr }: { name: string; when: string; total: number; status: string; locale: 'en' | 'ar'; localeTag: string; isRTL: boolean; tr: (value: string) => string }) {
  return (
    <View style={[styles.row, isRTL && styles.rtlRow]}>
      <View style={styles.icon}><Ionicons name="barbell" size={18} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong">{name}</Txt>
        <Txt variant="caption" style={{ marginTop: 2 }}>{dayjs(when).locale(locale).format('ddd، D MMM')} · {new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(new Date(when))}</Txt>
      </View>
      <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 5 }}>
        <Txt variant="bodyStrong">{formatMoney(total)}</Txt>
        <Badge label={tr(status).toUpperCase()} tone={STATUS_TONE[status] ?? 'neutral'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
});
