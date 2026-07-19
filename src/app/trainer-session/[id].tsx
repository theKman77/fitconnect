import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import * as Location from 'expo-location';
import { colors, fonts, radius } from '@/theme';
import { config, formatMoney } from '@/lib/config';
import { useAuth } from '@/context/auth';
import { getBooking, updateBookingStatus } from '@/lib/bookings';
import { advanceLabel, getBookingCounterpart, nextStatus, STATUS_LABEL, type BookingCounterpart } from '@/lib/trainer';
import { listMessages, sendMessage, subscribeMessages } from '@/lib/chat';
import { pushTrainerLocation } from '@/lib/realtime';
import { isBackendConfigured } from '@/lib/supabase';
import { notify } from '@/lib/confirm';
import { Badge, Button, Card, EmptyState, Txt } from '@/components/ui';
import type { Booking, Message } from '@/types/domain';
import { useLocale } from '@/context/locale';

export default function TrainerBookingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { locale, localeTag, isRTL, tr } = useLocale();
  const [booking, setBooking] = useState<Booking | undefined>();
  const [client, setClient] = useState<BookingCounterpart | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const myId = profile?.id ?? 'demo-trainer';

  const reload = useCallback(async () => {
    if (!id) return;
    const b = await getBooking(id);
    setBooking(b);
    if (b && isBackendConfigured) {
      setClient(await getBookingCounterpart(b.id));
    }
  }, [id]);

  useEffect(() => {
    reload().catch(() => setLoadError(tr('Could not load this booking.')));
    if (!id) return;
    listMessages(id).then(setMessages).catch(() => setLoadError(tr('Booking loaded, but chat is unavailable.')));
    const unsub = subscribeMessages(id, (msg) => {
      setMessages((cur) => {
        if (cur.some((x) => x.id === msg.id)) return cur;
        if (msg.sender_id === myId) {
          const idx = cur.findIndex((x) => x.id.startsWith('local-') && x.sender_id === myId && x.body === msg.body);
          if (idx !== -1) { const c = [...cur]; c[idx] = msg; return c; }
        }
        return [...cur, msg];
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    });
    return unsub;
  }, [id, myId, reload, tr]);

  // Broadcast live location to the client while the session is active.
  useEffect(() => {
    if (!isBackendConfigured || !id || !booking) return;
    const active = ['en_route', 'arriving', 'in_progress'].includes(booking.status);
    if (!active) return;
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 8000 },
        (pos) => { pushTrainerLocation(id, pos.coords.latitude, pos.coords.longitude); },
      );
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, [id, booking?.status]);

  async function advance() {
    if (!booking) return;
    const next = nextStatus(booking.status);
    if (!next) return;
    setBusy(true);
    try {
      await updateBookingStatus(booking.id, next);
      await reload();
    } catch (e: any) {
      notify(tr('Status not changed'), e?.message ?? tr('Please check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const body = draft.trim();
    if (!body || !id) return;
    setDraft('');
    const optimistic: Message = { id: `local-${Date.now()}`, booking_id: id, sender_id: myId, body, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      await sendMessage(id, myId, body);
    } catch {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      notify(tr('Message not sent'), tr('Check your connection and try again.'));
    }
  }

  if (!booking) {
    return <SafeAreaView style={styles.root}><View style={styles.center}>{loadError ? <EmptyState icon="alert-circle" title={tr('Booking unavailable')} subtitle={loadError} actionLabel={tr('Go back')} onAction={() => router.back()} /> : <Txt variant="body">{tr('Loading')}…</Txt>}</View></SafeAreaView>;
  }

  const label = advanceLabel(booking.status);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.textPrimary} />
        </Pressable>
        <Txt variant="sectionTitle">{client?.full_name ? `${tr('Session')} · ${client.full_name.split(' ')[0]}` : tr('Session')}</Txt>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 22, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          {/* Status */}
          <Card>
            <View style={[styles.statusHead, isRTL && styles.rtlRow]}>
              <Txt variant="cardTitle">{tr(STATUS_LABEL[booking.status])}</Txt>
              <Badge label={tr(booking.payment_status === 'simulation' ? 'DEMO · UNPAID' : booking.paid ? 'PAID' : 'UNPAID')} tone={booking.paid ? 'success' : 'neutral'} />
            </View>
            <View style={[styles.detailRow, isRTL && styles.rtlRow]}><Ionicons name="calendar" size={16} color={colors.textMuted} />
              <Txt variant="body">{booking.scheduled_at ? `${dayjs(booking.scheduled_at).locale(locale).format('dddd، D MMM')} · ${new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(new Date(booking.scheduled_at))}` : tr('Time TBD')}</Txt>
            </View>
            <View style={[styles.detailRow, isRTL && styles.rtlRow]}><Ionicons name={booking.format === 'virtual' ? 'videocam' : 'location'} size={16} color={colors.textMuted} />
              <Txt variant="body" style={{ flex: 1 }}>
                {booking.format === 'virtual' ? tr('Virtual session') : `${booking.address_line ?? ''}${booking.city ? '، ' + booking.city : ''}`}
              </Txt>
            </View>
            {booking.equipment_by_trainer && (
              <View style={[styles.detailRow, isRTL && styles.rtlRow]}><Ionicons name="bag" size={16} color={colors.textMuted} />
                <Txt variant="body" style={{ flex: 1 }}>{tr('Bring')}: {booking.equipment_items.join('، ') || tr('equipment')}</Txt>
              </View>
            )}
            <View style={[styles.detailRow, isRTL && styles.rtlRow]}><Ionicons name="cash" size={16} color={colors.textMuted} />
              <Txt variant="body">{tr(booking.paid ? 'Payout' : 'Estimated payout')} {formatMoney(booking.trainer_payout ?? 0)}</Txt>
            </View>
          </Card>

          {label && (
            <Button title={tr(label)} onPress={advance} loading={busy} icon={isRTL ? 'arrow-back' : 'arrow-forward'} style={{ marginTop: 14 }} />
          )}
          {booking.status === 'completed' && (
            <View style={[styles.doneNote, isRTL && styles.rtlRow]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Txt variant="caption" style={{ flex: 1 }}>{tr(booking.paid ? 'Session complete. This payout is eligible for settlement.' : 'Session complete. Demo bookings do not create a payout.')}</Txt>
            </View>
          )}

          {/* Chat */}
          <Txt variant="label" style={{ marginTop: 24, marginBottom: 4 }}>{tr('Chat with')} {client?.full_name?.split(' ')[0] ?? tr('client')}</Txt>
          <Txt variant="caption" style={{ marginBottom: 10 }}>
            {tr(config.paymentsEnabled ? 'On-platform sessions keep payment records, tier progress and support in one place.' : 'Demo sessions still count toward product testing and tier previews, but do not create payment protection.')}
          </Txt>
          <View style={{ gap: 8 }}>
            {messages.map((m) => {
              const mine = m.sender_id === myId;
              return (
                <View key={m.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Txt variant="body" color={mine ? colors.white : colors.textPrimary}>{m.body}</Txt>
                </View>
              );
            })}
            {messages.length === 0 && <Txt variant="caption">{tr('No messages yet. Say hi 👋')}</Txt>}
          </View>
        </ScrollView>

        <View style={[styles.inputBar, isRTL && styles.rtlRow]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={tr('Message your client…')}
            placeholderTextColor={colors.textDim}
            style={[styles.input, isRTL && styles.inputRTL]}
            onSubmitEditing={send}
          />
          <Pressable onPress={send} style={styles.sendBtn}><Ionicons name="arrow-up" size={20} color={colors.white} /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  statusHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  doneNote: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, backgroundColor: colors.successTint, borderRadius: radius.md, padding: 14 },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 22, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 12, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  inputRTL: { textAlign: 'right', writingDirection: 'rtl' },
});
