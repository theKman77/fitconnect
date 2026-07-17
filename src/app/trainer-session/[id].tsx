import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import * as Location from 'expo-location';
import { colors, fonts, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { useAuth } from '@/context/auth';
import { getBooking, updateBookingStatus } from '@/lib/bookings';
import { advanceLabel, nextStatus, STATUS_LABEL } from '@/lib/trainer';
import { listMessages, sendMessage, subscribeMessages } from '@/lib/chat';
import { pushTrainerLocation } from '@/lib/realtime';
import { supabase, isBackendConfigured } from '@/lib/supabase';
import { Badge, Button, Card, Txt } from '@/components/ui';
import type { Booking, Message, Profile } from '@/types/domain';

export default function TrainerBookingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [booking, setBooking] = useState<Booking | undefined>();
  const [client, setClient] = useState<Pick<Profile, 'full_name' | 'avatar_url'> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const myId = profile?.id ?? 'demo-trainer';

  const reload = useCallback(async () => {
    if (!id) return;
    const b = await getBooking(id);
    setBooking(b);
    if (b && isBackendConfigured) {
      const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', b.client_id).maybeSingle();
      if (data) setClient(data);
    }
  }, [id]);

  useEffect(() => {
    reload();
    if (!id) return;
    listMessages(id).then(setMessages);
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
  }, [id, myId, reload]);

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
    await updateBookingStatus(booking.id, next);
    await reload();
    setBusy(false);
  }

  function send() {
    const body = draft.trim();
    if (!body || !id) return;
    setDraft('');
    const optimistic: Message = { id: `local-${Date.now()}`, booking_id: id, sender_id: myId, body, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    sendMessage(id, myId, body);
  }

  if (!booking) {
    return <SafeAreaView style={styles.root}><View style={styles.center}><Txt variant="body">Loading…</Txt></View></SafeAreaView>;
  }

  const label = advanceLabel(booking.status);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Txt variant="sectionTitle">{client?.full_name ? `Session · ${client.full_name.split(' ')[0]}` : 'Session'}</Txt>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 22, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          {/* Status */}
          <Card>
            <View style={styles.statusHead}>
              <Txt variant="cardTitle">{STATUS_LABEL[booking.status]}</Txt>
              <Badge label={booking.paid ? 'PAID' : 'UNPAID'} tone={booking.paid ? 'success' : 'neutral'} />
            </View>
            <View style={styles.detailRow}><Ionicons name="calendar" size={16} color={colors.textMuted} />
              <Txt variant="body">{booking.scheduled_at ? dayjs(booking.scheduled_at).format('dddd, MMM D · h:mm A') : 'Time TBD'}</Txt>
            </View>
            <View style={styles.detailRow}><Ionicons name={booking.format === 'virtual' ? 'videocam' : 'location'} size={16} color={colors.textMuted} />
              <Txt variant="body" style={{ flex: 1 }}>
                {booking.format === 'virtual' ? 'Virtual session' : `${booking.address_line ?? ''}${booking.city ? ', ' + booking.city : ''}`}
              </Txt>
            </View>
            {booking.equipment_by_trainer && (
              <View style={styles.detailRow}><Ionicons name="bag" size={16} color={colors.textMuted} />
                <Txt variant="body" style={{ flex: 1 }}>Bring: {booking.equipment_items.join(', ') || 'equipment'}</Txt>
              </View>
            )}
            <View style={styles.detailRow}><Ionicons name="cash" size={16} color={colors.textMuted} />
              <Txt variant="body">You earn {formatMoney(booking.total - booking.service_fee)}</Txt>
            </View>
          </Card>

          {label && (
            <Button title={label} onPress={advance} loading={busy} icon="arrow-forward" style={{ marginTop: 14 }} />
          )}
          {booking.status === 'completed' && (
            <View style={styles.doneNote}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Txt variant="caption" style={{ flex: 1 }}>Session complete. Payout is on the way.</Txt>
            </View>
          )}

          {/* Chat */}
          <Txt variant="label" style={{ marginTop: 24, marginBottom: 4 }}>Chat with {client?.full_name?.split(' ')[0] ?? 'client'}</Txt>
          <Txt variant="caption" style={{ marginBottom: 10 }}>
            Keep bookings on FitConnect — off-app sessions aren’t payment-protected and don’t count toward your tier.
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
            {messages.length === 0 && <Txt variant="caption">No messages yet. Say hi 👋</Txt>}
          </View>
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message your client…"
            placeholderTextColor={colors.textDim}
            style={styles.input}
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
});
