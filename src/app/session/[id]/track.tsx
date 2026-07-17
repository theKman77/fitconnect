import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { getBooking } from '@/lib/bookings';
import { getTrainer } from '@/lib/api';
import { listMessages, sendMessage, subscribeMessages } from '@/lib/chat';
import { subscribeBooking } from '@/lib/realtime';
import { isBackendConfigured } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { Avatar, Badge, Button, Txt } from '@/components/ui';
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
  const [booking, setBooking] = useState<Booking | undefined>();
  const [trainer, setTrainer] = useState<Trainer | undefined>();
  const [eta, setEta] = useState(6);
  const [phase, setPhase] = useState<Phase>('confirmed');
  const [sharing, setSharing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const myId = profile?.id ?? 'demo-client';

  useEffect(() => {
    if (!id) return;
    getBooking(id).then((b) => {
      setBooking(b);
      if (b) getTrainer(b.trainer_id).then(setTrainer);
    });
    // Load chat history, then subscribe to new messages in real time.
    listMessages(id).then((m) => {
      setMessages(m);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 60);
    });
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
  }, [id, myId]);

  // Live mode: reflect the trainer's real status changes as they happen.
  useEffect(() => {
    if (!isBackendConfigured || !id) return;
    return subscribeBooking(id, (b) => {
      setBooking(b);
      setPhase(statusToPhase(b.status));
    });
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

  function send() {
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
    sendMessage(id, myId, body);
  }

  function onSos() {
    Alert.alert(
      'SOS — Emergency',
      'This will call emergency services (911) and share your live location with your emergency contact.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
      ],
    );
  }

  function onCall() {
    Alert.alert(
      'Call trainer',
      'In-app calling connects through the live backend so numbers stay private. Use chat below for now.',
    );
  }

  const trainerName = trainer?.display_name.split(' ')[0] ?? 'Your trainer';

  // Headline: real status in live mode, simulated ETA in demo mode.
  let headline: string;
  if (isBackendConfigured) {
    const s = booking?.status;
    headline =
      s === 'in_progress' ? `Session with ${trainerName} in progress`
      : s === 'arriving' ? `${trainerName} is arriving`
      : s === 'en_route' ? `${trainerName} is on the way`
      : s === 'completed' ? `Session complete`
      : `${trainerName} confirmed your session`;
  } else {
    headline = eta > 0 ? `${trainerName} is ${eta} min away` : `${trainerName} has arrived`;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Map area (placeholder until the native-maps dev-client build) */}
      <View style={styles.map}>
        <LinearGradient colors={['#14231C', '#101013']} style={StyleSheet.absoluteFill} />
        <Pressable style={styles.mapBack} onPress={() => router.replace('/(tabs)')}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <View style={styles.route}>
          <View style={styles.pinTrainer}><Ionicons name="car" size={16} color={colors.white} /></View>
          <View style={styles.dashes} />
          <View style={styles.pinHome}><Ionicons name="home" size={14} color={colors.white} /></View>
        </View>
        <Txt variant="caption" center style={styles.mapNote}>Live map enables with the dev-client build</Txt>
      </View>

      <ScrollView ref={scrollRef} style={styles.sheet} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
        {/* Trainer status */}
        <View style={styles.statusHead}>
          <Avatar uri={trainer?.avatar_url} name={trainerName} size={48} />
          <View style={{ flex: 1 }}>
            <Txt variant="cardTitle">{headline}</Txt>
            <Txt variant="caption" style={{ marginTop: 2 }}>
              {booking?.format === 'virtual' ? 'Video session starting soon' : `Heading to ${booking?.address_line ?? 'your address'}`}
            </Txt>
          </View>
          <Pressable style={styles.callBtn} onPress={onCall}><Ionicons name="call" size={18} color={colors.primary} /></Pressable>
        </View>

        {/* Phase stepper */}
        <View style={styles.phases}>
          {PHASES.map((p, i) => {
            const active = PHASES.findIndex((x) => x.key === phase) >= i;
            return (
              <View key={p.key} style={styles.phase}>
                <View style={[styles.dot, active && styles.dotOn]} />
                <Txt variant="caption" color={active ? colors.textPrimary : colors.textDim}>{p.label}</Txt>
              </View>
            );
          })}
        </View>

        {/* Safety */}
        <Txt variant="label" style={styles.groupLabel}>Safety</Txt>
        <View style={styles.safetyRow}>
          <Pressable style={styles.shareBtn} onPress={() => setSharing((s) => !s)}>
            <Ionicons name={sharing ? 'location' : 'location-outline'} size={18} color={sharing ? colors.success : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">Share live location</Txt>
              <Txt variant="caption">With {profile?.emergency_contact_name ?? 'your emergency contact'}</Txt>
            </View>
            {sharing && <Badge label="ON" tone="success" />}
          </Pressable>
        </View>
        <Pressable style={styles.sos} onPress={onSos}>
          <Ionicons name="warning" size={18} color={colors.white} />
          <Txt style={styles.sosTxt}>SOS — Emergency</Txt>
        </Pressable>

        {/* Chat */}
        <Txt variant="label" style={styles.groupLabel}>Chat</Txt>
        <View style={{ gap: 8 }}>
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
        <View style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message your trainer…"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            onSubmitEditing={send}
          />
          <Pressable onPress={send} style={styles.sendBtn}><Ionicons name="arrow-up" size={20} color={colors.white} /></Pressable>
        </View>
        <View style={styles.endWrap}>
          <Button title="End session & rate" variant="secondary" onPress={() => router.replace(`/session/${id}/rate`)} />
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
