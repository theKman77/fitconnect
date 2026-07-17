import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, radius } from '@/theme';
import { Avatar, Button, Card, Txt } from '@/components/ui';
import { supabase, isBackendConfigured } from '@/lib/supabase';
import { getBooking } from '@/lib/bookings';
import { getTrainer } from '@/lib/api';
import { useAuth } from '@/context/auth';
import type { Booking, Trainer } from '@/types/domain';
import { useEffect } from 'react';

const TAGS = ['Punctual', 'Motivating', 'Knowledgeable', 'Great energy', 'Challenging', 'Patient'];

export default function Rate() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState<Booking | undefined>();
  const [trainer, setTrainer] = useState<Trainer | undefined>();

  useEffect(() => {
    if (!id) return;
    getBooking(id).then((b) => {
      setBooking(b);
      if (b) getTrainer(b.trainer_id).then(setTrainer);
    });
  }, [id]);

  const trainerName = trainer?.display_name.split(' ')[0] ?? 'your trainer';

  const toggleTag = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
  }

  async function submit() {
    setBusy(true);
    if (isBackendConfigured && id && profile) {
      await supabase.from('reviews').insert({
        booking_id: id,
        rater_id: profile.id,
        ratee_id: trainer?.profile_id ?? profile.id,
        direction: 'client_to_trainer',
        rating,
        comment: comment || null,
        tags,
      });
    } else {
      await new Promise((r) => setTimeout(r, 500));
    }
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 22, paddingBottom: 30 }}>
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.skip} hitSlop={10}>
          <Txt variant="caption">Skip</Txt>
        </Pressable>

        <View style={styles.head}>
          <Avatar uri={trainer?.avatar_url} name={trainer?.display_name ?? 'Trainer'} size={64} />
          <Txt variant="screenTitle" center style={{ marginTop: 14 }}>How was your session with {trainerName}?</Txt>
        </View>

        {/* Stars */}
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
              <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={40} color={colors.primary} />
            </Pressable>
          ))}
        </View>

        <Txt variant="label" style={{ marginBottom: 12, marginTop: 8 }}>What stood out?</Txt>
        <View style={styles.tags}>
          {TAGS.map((t) => (
            <Pressable key={t} onPress={() => toggleTag(t)} style={[styles.tag, tags.includes(t) && styles.tagOn]}>
              <Txt style={[styles.tagTxt, tags.includes(t) && { color: colors.white }]}>{t}</Txt>
            </Pressable>
          ))}
        </View>

        <View style={styles.commentWrap}>
          <TextInput
            placeholder="Add a comment (optional)…"
            placeholderTextColor={colors.textDim}
            value={comment}
            onChangeText={setComment}
            multiline
            style={styles.comment}
          />
        </View>

        {photo ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
            <Pressable style={styles.photoRemove} onPress={() => setPhoto(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={24} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.photoBtn} onPress={pickPhoto}>
            <Ionicons name="camera-outline" size={20} color={colors.primary} />
            <Txt variant="bodyStrong" color={colors.primary}>Add a progress photo</Txt>
          </Pressable>
        )}

        {/* Trainer rated you back */}
        <Card style={{ marginTop: 20 }}>
          <View style={styles.backRow}>
            <Ionicons name="star" size={15} color={colors.primary} />
            <Txt variant="caption">{trainerName} rated you ★ 5</Txt>
          </View>
          <Txt variant="body" style={{ marginTop: 6 }}>"Ready on time with space cleared. Great energy!"</Txt>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Submit rating" onPress={submit} disabled={rating === 0} loading={busy} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  skip: { alignSelf: 'flex-end' },
  head: { alignItems: 'center', marginTop: 8 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 26 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  tagOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagTxt: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary },
  commentWrap: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, marginTop: 18, minHeight: 90 },
  comment: { color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15, textAlignVertical: 'top' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, borderWidth: 1, borderColor: colors.primaryBorder, borderStyle: 'dashed', borderRadius: radius.lg, paddingVertical: 16 },
  photoWrap: { marginTop: 16, borderRadius: radius.lg, overflow: 'hidden' },
  photo: { width: '100%', height: 180 },
  photoRemove: { position: 'absolute', top: 10, right: 10 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footer: { padding: 22, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
});
