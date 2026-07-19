import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { confirm, notify } from '@/lib/confirm';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { getBooking } from '@/lib/bookings';
import { getTrainer } from '@/lib/api';
import { listMessages, sendMessage, subscribeMessages } from '@/lib/chat';
import { getTrainerLocation, subscribeBooking, subscribeTrainerLocation } from '@/lib/realtime';
import { isBackendConfigured } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { TrackMap } from '@/components/TrackMap';
import { Avatar, Button, Txt } from '@/components/ui';
import type { Booking, Message, Trainer } from '@/types/domain';

type Phase = 'confirmed' | 'en_route' | 'arriving';
const PHASES: { key: Phase; label: string }[] = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'en_route', label: 'En route' },
  { key: 'arriving', label: 'Arriving' },
];

function statusToPhase(status: Booking['status']): Phase {
  if (status === 'en_route') return 'en_route';
  if (status === 'arriving' || status === 'in_progress' || status === 'completed') return 'arriving';
  return 'confirmed';
}

export default function Track() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { locale, localeTag, isRTL, tr } = useLocale();
  const [booking, setBooking] = useState<Booking | undefined>();
  const [trainer, setTrainer] = useState<Trainer | undefined>();
  const [eta, setEta] = useState(6);
  const [phase, setPhase] = useState<Phase>('confirmed');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [trainerLoc, setTrainerLoc] = useState<{ lat: number; lng: number } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const myId = profile?.id ?? 'demo-client';

  const destination =
    booking?.lat != null && booking?.lng != null
      ? { lat: booking.lat, lng: booking.lng }
      : trainer?.lat != null && trainer?.lng != null
        ? { lat: trainer.lat, lng: trainer.lng }
        : null;

  useEffect(() => {
    if (!id) return;
    getBooking(id).then((b) => {
      setBooking(b);
      if (b) setPhase(statusToPhase(b.status));
      if (b) getTrainer(b.trainer_id).then(setTrainer);
    }).catch(() => setLoadError(tr('Could not load this session. Pull back and try again.')));
    // Load chat history, then subscribe to new messages in real time.
    listMessages(id).then((m) => {
      setMessages(m);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 60);
    }).catch(() => setLoadError(tr('The session loaded, but chat is temporarily unavailable.')));
    const unsub = subscribeMessages(id, (msg) => {
      setMessages((cur) => {
        if (cur.some((x) => x.id === msg.id)) return cur;
        // Reconcile our own optimistic message with the persisted row.
        if (msg.sender_id === myId) {
          const idx = cur.findIndex((x) => x.id.startsWith('local-') && x.sender_id === myId && x.body === msg.body);
          if (idx !== -1) {
            const copy = [...cur];
            copy[idx] = msg;
            return copy;
          }
        }
        return [...cur, msg];
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    });
    return unsub;
  }, [id, myId, tr]);

  // Live mode: reflect the trainer's real status changes as they happen.
  useEffect(() => {
    if (!isBackendConfigured || !id) return;
    return subscribeBooking(id, (b) => {
      setBooking(b);
      setPhase(statusToPhase(b.status));
    });
  }, [id]);

  // Live mode: follow the trainer's real position on the map.
  useEffect(() => {
    if (!isBackendConfigured || !id) return;
    getTrainerLocation(id).then((loc) => { if (loc) setTrainerLoc({ lat: loc.lat, lng: loc.lng }); }).catch(() => {});
    return subscribeTrainerLocation(id, (loc) => setTrainerLoc({ lat: loc.lat, lng: loc.lng }));
  }, [id]);

  // Demo mode: simulate the trainer approaching so the screen feels alive.
  useEffect(() => {
    if (isBackendConfigured) return;
    const t = setInterval(() => {
      setEta((e) => {
        const n = Math.max(0, e - 1);
        setPhase(n === 0 ? 'arriving' : n <= 5 ? 'en_route' : 'confirmed');
        return n;
      });
    }, 4000);
    return () => clearInterval(t);
  }, []);

  async function send() {
    const body = draft.trim();
    if (!body || !id) return;
    setDraft('');
    // In demo mode the store echoes back via the subscription; in live mode the
    // realtime INSERT event delivers our own row. Optimistically show it now.
    const optimistic: Message = {
      id: `local-${Date.now()}`, booking_id: id, sender_id: myId, body,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      await sendMessage(id, myId, body);
    } catch {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      notify(tr('Message not sent'), tr('Check your connection and try again.'));
    }
  }

  function onSos() {
    confirm(
      {
        title: tr('SOS — Emergency'),
        message: tr('This opens a phone call to Saudi emergency medical services (997). FitConnect does not automatically share your location in the web demo.'),
        confirmLabel: tr('Call 997'),
        destructive: true,
      },
      () => Linking.openURL('tel:997'),
    );
  }

  function onCall() {
    notify(tr('Call trainer'), tr('In-app calling connects through the live backend so numbers stay private. Use chat below for now.'));
  }

  const trainerName = trainer?.display_name.split(' ')[0] ?? tr('Your trainer');

  // Headline: real status in live mode, simulated ETA in demo mode.
  let headline: string;
  if (isBackendConfigured) {
    const s = booking?.status;
    headline = locale === 'ar'
      ? s === 'in_progress' ? `جلستك مع ${trainerName} جارية الآن`
        : s === 'arriving' ? `${trainerName} على وشك الوصول`
        : s === 'en_route' ? `${trainerName} في الطريق إليك`
        : s === 'completed' ? 'اكتملت الجلسة'
        : `أكد ${trainerName} جلستك`
      : s === 'in_progress' ? `Session with ${trainerName} in progress`
        : s === 'arriving' ? `${trainerName} is arriving`
        : s === 'en_route' ? `${trainerName} is on the way`
        : s === 'completed' ? 'Session complete'
        : `${trainerName} confirmed your session`;
  } else {
    headline = locale === 'ar'
      ? eta > 0 ? `${trainerName} على بُعد ${eta.toLocaleString(localeTag)} دقائق` : `وصل ${trainerName}`
      : eta > 0 ? `${trainerName} is ${eta} min away` : `${trainerName} has arrived`;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Live map */}
      <View style={styles.map}>
        <TrackMap trainer={trainerLoc} destination={destination} />
        <Pressable style={[styles.mapBack, isRTL && styles.mapBackRTL]} onPress={() => router.replace('/(tabs)')}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={colors.white} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} style={styles.sheet} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
        {/* Trainer status */}
        <View style={[styles.statusHead, isRTL && styles.rtlRow]}>
          <Avatar uri={trainer?.avatar_url} name={trainerName} size={48} />
          <View style={{ flex: 1 }}>
            <Txt variant="cardTitle">{headline}</Txt>
            <Txt variant="caption" style={{ marginTop: 2 }}>
              {booking?.format === 'virtual'
                ? tr('Video session starting soon')
                : locale === 'ar' ? `متجه إلى ${booking?.address_line ?? tr('your address')}` : `Heading to ${booking?.address_line ?? 'your address'}`}
            </Txt>
          </View>
          <Pressable style={styles.callBtn} onPress={onCall}><Ionicons name="call" size={18} color={colors.primary} /></Pressable>
        </View>
        {loadError && <Txt variant="caption" color={colors.danger} style={{ marginBottom: 10 }}>{loadError}</Txt>}

        {/* Phase stepper */}
        <View style={[styles.phases, isRTL && styles.rtlRow]}>
          {PHASES.map((p, i) => {
            const active = PHASES.findIndex((x) => x.key === phase) >= i;
            return (
              <View key={p.key} style={styles.phase}>
                <View style={[styles.dot, active && styles.dotOn]} />
                <Txt variant="caption" color={active ? colors.textPrimary : colors.textDim}>{tr(p.label)}</Txt>
              </View>
            );
          })}
        </View>

        {/* Safety */}
        <Txt variant="label" style={styles.groupLabel}>{tr('Safety')}</Txt>
        <View style={styles.safetyRow}>
          <Pressable style={[styles.shareBtn, isRTL && styles.rtlRow]} onPress={() => notify(tr('Native app required'), tr('Continuous location sharing needs the future iOS/Android build. It is not active in this web demo.'))}>
            <Ionicons name="location-outline" size={18} color={colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">{tr('Live safety sharing')}</Txt>
              <Txt variant="caption">{tr('Coming with the native app · not active on web')}</Txt>
            </View>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
        <Pressable style={[styles.sos, isRTL && styles.rtlRow]} onPress={onSos}>
          <Ionicons name="warning" size={18} color={colors.white} />
          <Txt style={styles.sosTxt}>{tr('SOS — Emergency')}</Txt>
        </Pressable>

        {/* Chat */}
        <Txt variant="label" style={styles.groupLabel}>{tr('Chat')}</Txt>
        <Txt variant="caption" style={{ marginBottom: 10 }}>
          {tr('Payments made outside FitConnect aren’t protected by no-show cover or support.')}
        </Txt>
        <View style={{ gap: 8 }}>
          {messages.length === 0 && <Txt variant="caption">{tr('No messages yet. Say hi 👋')}</Txt>}
          {messages.map((m) => {
            const mine = m.sender_id === myId;
            return (
              <View key={m.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Txt variant="body" color={mine ? colors.white : colors.textPrimary}>{m.body}</Txt>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputBar, isRTL && styles.rtlRow]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={tr('Message your trainer…')}
            placeholderTextColor={colors.textDim}
            style={[styles.input, isRTL && styles.inputRTL]}
            onSubmitEditing={send}
          />
          <Pressable onPress={send} style={styles.sendBtn}><Ionicons name="arrow-up" size={20} color={colors.white} /></Pressable>
        </View>
        <View style={styles.endWrap}>
          {booking?.status === 'completed' ? (
            <Button title={tr('Rate completed session')} variant="secondary" onPress={() => router.replace(`/session/${id}/rate`)} />
          ) : (
            <Txt variant="caption" center>{tr('Your trainer ends the session. Rating unlocks after completion.')}</Txt>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  map: { height: 220, justifyContent: 'center', alignItems: 'center' },
  mapBack: {
    position: 'absolute', top: 8, left: 18, width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(11,11,13,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  mapBackRTL: { left: undefined, right: 18 },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  inputRTL: { textAlign: 'right', writingDirection: 'rtl' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pinTrainer: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  dashes: { width: 80, height: 2, backgroundColor: colors.textFaint },
  pinHome: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  mapNote: { position: 'absolute', bottom: 10, left: 0, right: 0, color: colors.textFaint },
  sheet: { flex: 1, paddingHorizontal: 22, marginTop: 6 },
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center' },
  phases: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16 },
  phase: { alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.surfaceHigh },
  dotOn: { backgroundColor: colors.primary },
  groupLabel: { marginTop: 22, marginBottom: 10 },
  safetyRow: { gap: 10 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  sos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, backgroundColor: colors.dangerDeep, borderRadius: radius.lg, paddingVertical: 14 },
  sosTxt: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 22, paddingTop: 10 },
  input: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 12, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  endWrap: { padding: 22, paddingTop: 12 },
});
