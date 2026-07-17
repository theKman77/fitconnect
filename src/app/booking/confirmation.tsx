import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { colors, fonts, radius } from '@/theme';
import { getBooking } from '@/lib/bookings';
import { Button, Txt } from '@/components/ui';
import type { Booking } from '@/types/domain';

export default function Confirmation() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | undefined>();

  useEffect(() => {
    if (bookingId) getBooking(bookingId).then(setBooking);
  }, [bookingId]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <LinearGradient colors={[colors.primary, colors.primaryDeep]} style={styles.check}>
          <Ionicons name="checkmark" size={48} color={colors.white} />
        </LinearGradient>
        <Txt variant="screenTitle" center style={{ marginTop: 24 }}>You're booked!</Txt>
        {booking?.scheduled_at && (
          <Txt variant="body" center style={{ marginTop: 8 }}>
            {dayjs(booking.scheduled_at).format('dddd, MMMM D')} · confirmed
          </Txt>
        )}
        <View style={styles.recap}>
          <Ionicons name="shield-checkmark" size={16} color={colors.success} />
          <Txt variant="caption" style={{ flex: 1 }}>
            A confirmation and prep details are on the way. You can message your trainer anytime.
          </Txt>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Track your trainer"
          icon="navigate"
          onPress={() => booking && router.replace(`/session/${booking.id}/track`)}
        />
        <Button title="View my subscription" variant="secondary" onPress={() => router.replace('/membership')} />
        <Button title="Back to home" variant="ghost" onPress={() => router.replace('/(tabs)')} />
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
});
