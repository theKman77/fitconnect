import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { colors, fonts, radius } from '@/theme';
import { getBooking } from '@/lib/bookings';
import { addSessionToCalendar, shareOnWhatsApp } from '@/lib/integrations';
import { Button, Txt } from '@/components/ui';
import type { Booking } from '@/types/domain';
import { useLocale } from '@/context/locale';

export default function Confirmation() {
  const router = useRouter();
  const { bookingId, simulated } = useLocalSearchParams<{ bookingId: string; simulated?: string }>();
  const { locale, localeTag, isRTL, tr } = useLocale();
  const [booking, setBooking] = useState<Booking | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookingId) getBooking(bookingId).then(setBooking).catch(() => setError(tr('We saved the reservation, but could not reload its details.')));
  }, [bookingId, tr]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <LinearGradient colors={[colors.primary, colors.primaryDeep]} style={styles.check}>
          <Ionicons name="checkmark" size={48} color={colors.white} />
        </LinearGradient>
        <Txt variant="screenTitle" center style={{ marginTop: 24 }}>{tr(simulated === '1' ? 'Demo session reserved' : "You're booked!")}</Txt>
        {booking?.scheduled_at && (
          <Txt variant="body" center style={{ marginTop: 8 }}>
            {dayjs(booking.scheduled_at).locale(locale).format('dddd، D MMMM')} · {new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(new Date(booking.scheduled_at))}
          </Txt>
        )}
        <View style={[styles.recap, isRTL && styles.rtlRow]}>
          <Ionicons name={simulated === '1' ? 'flask' : 'shield-checkmark'} size={16} color={simulated === '1' ? colors.primary : colors.success} />
          <Txt variant="caption" style={{ flex: 1 }}>
            {simulated === '1'
              ? tr('This reservation is stored in the database for testing. No payment was collected.')
              : tr('Your payment is being verified. You can message your trainer from the session page.')}
          </Txt>
        </View>
        {error && <Txt variant="caption" color={colors.danger} center style={{ marginTop: 12 }}>{error}</Txt>}
      </View>

      <View style={styles.actions}>
        <Button
          title={tr(booking?.format === 'virtual' ? 'Open session' : 'View session & chat')}
          icon="navigate"
          onPress={() => booking && router.replace(`/session/${booking.id}/track`)}
        />
        {booking?.scheduled_at && (
          <Button
            title={tr('Add to calendar')}
            variant="secondary"
            icon="calendar"
            onPress={() =>
              addSessionToCalendar({
                title: 'FitConnect training session',
                details: 'Personal training session booked on FitConnect.',
                location: booking.address_line ?? undefined,
                start: new Date(booking.scheduled_at!),
                durationMin: booking.duration_min || 60,
              })
            }
          />
        )}
        <Button
          title={tr('Tell a friend on WhatsApp')}
          variant="secondary"
          icon="logo-whatsapp"
          onPress={() => shareOnWhatsApp('Just booked a personal trainer on FitConnect 💪 Try it — trainers come to you, in person or virtual.')}
        />
        <Button title={tr('Back to home')} variant="ghost" onPress={() => router.replace('/(tabs)')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 22, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  check: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  recap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 16,
  },
  actions: { gap: 10, paddingBottom: 10 },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
});
