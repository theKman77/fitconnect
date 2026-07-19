import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, radius } from '@/theme';
import { Button, Card, Txt } from '@/components/ui';
import { supabase, isBackendConfigured } from '@/lib/supabase';
import { getBooking, listMyBookings } from '@/lib/bookings';
import { uploadFile, extFor } from '@/lib/storage';
import { getTrainer } from '@/lib/api';
import { weeklyStreak, workoutsFromBookings } from '@/lib/progress';
import { useAuth } from '@/context/auth';
import type { Booking, Trainer } from '@/types/domain';

const TAGS = ['Punctual', 'Motivating', 'Knowledgeable', 'Great energy', 'Challenging', 'Patient'];
const MISSION_TARGET = 3;

export default function SessionCelebration() {
  const router = useRouter();
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const { profile } = useAuth();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState<Booking>();
  const [trainer, setTrainer] = useState<Trainer>();
  const [streak, setStreak] = useState(0);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const reveal = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const isPreview = preview === '1';

  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) {
        reveal.setValue(1);
        pulse.setValue(1);
        return;
      }
      animation = Animated.parallel([
        Animated.timing(reveal, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(180),
          Animated.spring(pulse, { toValue: 1, friction: 5, tension: 55, useNativeDriver: true }),
        ]),
      ]);
      animation.start();
    });
    return () => animation?.stop();
  }, [pulse, reveal]);

  useEffect(() => {
    if (isPreview) return;
    if (!id) return;
    getBooking(id)
      .then(async (value) => {
        setBooking(value);
        if (value) setTrainer(await getTrainer(value.trainer_id));
      })
      .catch(() => setError('Could not load this completed session.'));

    if (!profile && isBackendConfigured) return;
    const clientId = profile?.id ?? 'demo-client';
    listMyBookings(clientId).then((all) => {
      const completed = workoutsFromBookings(all);
      setStreak(weeklyStreak(completed.map((item) => item.scheduled_at ?? item.created_at)));
      setSessionsThisWeek(completed.filter((item) => {
        const value = new Date(item.scheduled_at ?? item.created_at);
        const now = new Date();
        const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
        return value >= start;
      }).length);
    }).catch(() => {});
  }, [id, isPreview, profile?.id]);

  const trainerName = trainer?.display_name.split(' ')[0] ?? 'your trainer';
  const missionProgress = Math.min(1, sessionsThisWeek / MISSION_TARGET);
  const toggleTag = (tag: string) => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
  }

  async function submit() {
    if (!isPreview && booking?.status !== 'completed') return setError('Ratings unlock only after the trainer completes the session.');
    setBusy(true);
    setError(null);
    try {
      if (!isPreview && isBackendConfigured && id && profile) {
        if (!trainer?.profile_id) throw new Error('Trainer account is unavailable.');
        const photoUrl = photo ? await uploadFile('progress', profile.id, photo, extFor(photo, 'image')) : null;
        const { error: insertError } = await supabase.from('reviews').insert({
          booking_id: id,
          rater_id: profile.id,
          ratee_id: trainer.profile_id,
          direction: 'client_to_trainer',
          rating,
          comment: comment.trim() || null,
          tags,
          photo_url: photoUrl,
        });
        if (insertError) throw insertError;
      } else await new Promise((resolve) => setTimeout(resolve, 450));
      router.replace('/(tabs)/progress');
    } catch (submitError: any) {
      setError(submitError?.message ?? 'Could not save your rating. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.replace('/(tabs)/progress')} style={styles.skip} hitSlop={10}><Txt variant="caption">Skip for now</Txt></Pressable>

        <Animated.View style={[styles.celebration, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
          <LinearGradient colors={['#35180F', colors.surfaceElevated, colors.surface]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroGlow} />
          <Animated.View style={[styles.winMark, { transform: [{ scale: pulse }] }]}>
            <View style={styles.winRing}><Ionicons name="checkmark" size={42} color={colors.white} /></View>
          </Animated.View>
          <Txt variant="monoTag" style={{ marginTop: 20 }}>SESSION COMPLETE</Txt>
          <Txt style={styles.heroTitle}>You showed up.</Txt>
          <Txt variant="body" center style={styles.heroCopy}>That session is now part of your progress—not another workout that disappears.</Txt>

          <View style={styles.impactRow}>
            <Impact value="+50" label="XP earned" icon="sparkles" />
            <View style={styles.impactDivider} />
            <Impact value={`${booking?.duration_min ?? 60}`} label="minutes" icon="time-outline" />
            <View style={styles.impactDivider} />
            <Impact value={`${streak}`} label="week streak" icon="flame-outline" />
          </View>
        </Animated.View>

        <View style={styles.missionCard}>
          <View style={styles.missionTop}>
            <View style={styles.missionIcon}><Ionicons name={missionProgress >= 1 ? 'trophy' : 'flag'} size={19} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Txt style={styles.missionEyebrow}>WEEKLY MISSION</Txt><Txt variant="bodyStrong">{missionProgress >= 1 ? 'Mission complete' : `${MISSION_TARGET - sessionsThisWeek} session${MISSION_TARGET - sessionsThisWeek === 1 ? '' : 's'} to your bonus`}</Txt></View>
            <Txt style={styles.missionCount}>{Math.min(sessionsThisWeek, MISSION_TARGET)}/{MISSION_TARGET}</Txt>
          </View>
          <View style={styles.missionTrack}><View style={[styles.missionFill, { width: `${Math.max(5, missionProgress * 100)}%` }]} /></View>
          <Txt variant="caption" style={{ marginTop: 8 }}>{missionProgress >= 1 ? '150 mission XP unlocked in your progress.' : 'Complete three sessions this week to unlock 150 bonus XP.'}</Txt>
        </View>

        <View style={styles.ratingHead}>
          <View style={{ flex: 1 }}><Txt variant="monoTag">CLOSE THE LOOP</Txt><Txt style={styles.sectionTitle}>How was {trainerName}?</Txt></View>
          {trainer?.avatar_url && <Image source={{ uri: trainer.avatar_url }} style={styles.trainerAvatar} contentFit="cover" />}
        </View>

        <View style={styles.stars} accessibilityLabel={`Rating ${rating} out of 5`}>
          {[1, 2, 3, 4, 5].map((number) => (
            <Pressable key={number} onPress={() => setRating(number)} hitSlop={6} accessibilityLabel={`${number} stars`}>
              <Ionicons name={number <= rating ? 'star' : 'star-outline'} size={39} color={colors.primary} />
            </Pressable>
          ))}
        </View>

        <Txt variant="label">What stood out?</Txt>
        <View style={styles.tags}>
          {TAGS.map((tag) => (
            <Pressable key={tag} onPress={() => toggleTag(tag)} style={[styles.tag, tags.includes(tag) && styles.tagOn]}>
              <Txt style={[styles.tagText, tags.includes(tag) && { color: colors.white }]}>{tag}</Txt>
            </Pressable>
          ))}
        </View>

        <View style={styles.commentWrap}>
          <TextInput placeholder="Help the next client know what to expect…" placeholderTextColor={colors.textDim} value={comment} onChangeText={setComment} multiline maxLength={500} style={styles.comment} />
          <Txt style={styles.characterCount}>{comment.length}/500</Txt>
        </View>

        {photo ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
            <Pressable style={styles.photoRemove} onPress={() => setPhoto(null)} hitSlop={8} accessibilityLabel="Remove progress photo"><Ionicons name="close-circle" size={26} color={colors.white} /></Pressable>
          </View>
        ) : (
          <Pressable style={styles.photoButton} onPress={pickPhoto}>
            <View style={styles.photoIcon}><Ionicons name="camera-outline" size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Txt variant="bodyStrong">Save a progress moment</Txt><Txt variant="caption" style={{ marginTop: 3 }}>Private by default and attached to your journey.</Txt></View>
            <Ionicons name="add" size={20} color={colors.primary} />
          </Pressable>
        )}

        {!isBackendConfigured && (
          <Card><View style={styles.coachNoteTop}><Ionicons name="chatbubble-ellipses" size={15} color={colors.primary} /><Txt variant="bodyStrong">A note from {trainerName}</Txt></View><Txt variant="body" style={{ marginTop: 8 }}>“Ready on time, focused, and strong through the final set. Great work.”</Txt></Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {error && <Txt variant="caption" color={colors.danger} center style={{ marginBottom: 9 }}>{error}</Txt>}
        <Button title={rating ? 'Save & see my progress' : 'Choose a rating'} icon="arrow-forward" onPress={submit} disabled={rating === 0 || (!isPreview && booking?.status !== 'completed')} loading={busy} />
      </View>
    </SafeAreaView>
  );
}

function Impact({ value, label, icon }: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return <View style={styles.impact}><Ionicons name={icon} size={15} color={colors.primary} /><Txt style={styles.impactValue}>{value}</Txt><Txt style={styles.impactLabel}>{label}</Txt></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 22, paddingBottom: 130, gap: 18 },
  skip: { alignSelf: 'flex-end', paddingVertical: 4 },
  celebration: { alignItems: 'center', overflow: 'hidden', borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.primaryBorder, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 },
  heroGlow: { position: 'absolute', top: -120, width: 270, height: 270, borderRadius: 135, backgroundColor: colors.primaryTintStrong },
  winMark: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,92,53,0.13)', borderWidth: 1, borderColor: colors.primaryBorder },
  winRing: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  heroTitle: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 39, letterSpacing: -1.4, color: colors.textPrimary, marginTop: 7 },
  heroCopy: { maxWidth: 390, marginTop: 8 },
  impactRow: { width: '100%', flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.border },
  impact: { flex: 1, alignItems: 'center' },
  impactValue: { fontFamily: fonts.extrabold, fontSize: 19, color: colors.textPrimary, marginTop: 5, fontVariant: ['tabular-nums'] },
  impactLabel: { fontFamily: fonts.medium, fontSize: 9, color: colors.textDim, marginTop: 2 },
  impactDivider: { width: 1, height: 35, backgroundColor: colors.border },
  missionCard: { borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, padding: 16 },
  missionTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  missionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  missionEyebrow: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 1.1, color: colors.primary, marginBottom: 4 },
  missionCount: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  missionTrack: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceHigh, overflow: 'hidden', marginTop: 14 },
  missionFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  ratingHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingTop: 4 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 25, lineHeight: 30, letterSpacing: -0.8, color: colors.textPrimary, marginTop: 6 },
  trainerAvatar: { width: 52, height: 52, borderRadius: 18 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  tag: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  tagOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary },
  commentWrap: { minHeight: 110, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 15 },
  comment: { minHeight: 70, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
  characterCount: { alignSelf: 'flex-end', fontFamily: fonts.mono, fontSize: 9, color: colors.textFaint },
  photoButton: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primaryBorder, padding: 15 },
  photoIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  photoWrap: { borderRadius: radius.xl, overflow: 'hidden' },
  photo: { width: '100%', height: 210 },
  photoRemove: { position: 'absolute', top: 10, right: 10 },
  coachNoteTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24, backgroundColor: 'rgba(17,19,24,0.98)', borderTopWidth: 1, borderTopColor: colors.border },
});
