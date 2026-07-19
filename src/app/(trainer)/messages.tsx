import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { colors, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { getMyTrainer, listTrainerBookings } from '@/lib/trainer';
import { Avatar, Card, Txt } from '@/components/ui';
import type { Booking } from '@/types/domain';
import { useLocale } from '@/context/locale';

const CHATTABLE = ['confirmed', 'en_route', 'arriving', 'in_progress', 'completed'];

export default function TrainerMessages() {
  const router = useRouter();
  const { profile } = useAuth();
  const { locale, localeTag, isRTL, tr } = useLocale();
  const [bookings, setBookings] = useState<Booking[]>([]);

  const load = useCallback(async () => {
    const t = await getMyTrainer(profile);
    setBookings(await listTrainerBookings(t));
  }, [profile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const threads = bookings.filter((b) => CHATTABLE.includes(b.status));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}><Txt variant="screenTitle">{tr('Messages')}</Txt></View>
      <ScrollView contentContainerStyle={{ padding: 22, gap: 12 }} showsVerticalScrollIndicator={false}>
        {threads.map((b) => (
          <Card key={b.id} onPress={() => router.push({ pathname: '/trainer-session/[id]', params: { id: b.id } })}>
            <View style={[styles.row, isRTL && styles.rtlRow]}>
              <Avatar name={tr('client')} size={44} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong">{tr('Client · session chat')}</Txt>
                <Txt variant="caption" style={{ marginTop: 2 }}>
                  {b.scheduled_at ? `${dayjs(b.scheduled_at).locale(locale).format('D MMM')} · ${new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(new Date(b.scheduled_at))}` : tr('Scheduled')}
                </Txt>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textDim} />
            </View>
          </Card>
        ))}
        {threads.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={28} color={colors.textFaint} />
            <Txt variant="body" center style={{ marginTop: 10 }}>{tr('No conversations yet.')}</Txt>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 22, paddingTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empty: { alignItems: 'center', paddingVertical: 50 },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
});
