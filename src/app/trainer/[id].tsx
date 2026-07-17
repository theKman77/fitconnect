import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { getTrainer } from '@/lib/api';
import { isFavorite, toggleFavorite } from '@/lib/favorites';
import { useAuth } from '@/context/auth';
import { useBooking } from '@/context/booking';
import { Avatar, Badge, Button, Card, Txt } from '@/components/ui';
import type { SessionType, TrainerDetail } from '@/types/domain';

export default function TrainerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { start } = useBooking();
  const { profile } = useAuth();
  const [trainer, setTrainer] = useState<TrainerDetail | undefined>();
  const [selected, setSelected] = useState<SessionType | undefined>();
  const [fav, setFav] = useState(false);
  const [tab, setTab] = useState<'pricing' | 'availability' | 'reviews'>('pricing');

  useEffect(() => {
    if (id) {
      getTrainer(id).then((t) => {
        setTrainer(t);
        setSelected(t?.session_types.find((s) => s.popular) ?? t?.session_types[0]);
      });
      isFavorite(profile?.id ?? 'demo-client', id).then(setFav);
    }
  }, [id, profile?.id]);

  async function onToggleFavorite() {
    if (!id) return;
    setFav(await toggleFavorite(profile?.id ?? 'demo-client', id));
  }

  if (!trainer) {
    return <SafeAreaView style={styles.root}><View style={styles.center}><Txt variant="body">Loading…</Txt></View></SafeAreaView>;
  }

  function book() {
    if (!trainer) return;
    start(trainer, trainer.session_types, selected);
    router.push(`/booking/${trainer.id}`);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero / video intro */}
        <View style={styles.hero}>
          {trainer.photos[0] ? (
            <Image source={{ uri: trainer.photos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient colors={[colors.surfaceHigh, colors.surface]} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient colors={['rgba(11,11,13,0.2)', colors.bg]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroTop}>
            <IconBtn icon="chevron-back" onPress={() => router.back()} />
            <IconBtn icon={fav ? 'heart' : 'heart-outline'} tint={fav ? colors.primary : colors.white} onPress={onToggleFavorite} />
          </View>
          <View style={styles.videoTag}>
            <Ionicons name="play" size={12} color={colors.white} />
            <Txt style={styles.videoTagTxt}>VIDEO INTRO · 0:45</Txt>
          </View>
        </View>

        {/* Identity */}
        <View style={styles.identity}>
          <Avatar uri={trainer.avatar_url} name={trainer.display_name} size={64} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Txt variant="sectionTitle">{trainer.display_name}</Txt>
              {trainer.verified && <Badge label="VERIFIED" tone="brand" icon="checkmark-circle" />}
            </View>
            <Txt variant="caption" style={{ marginTop: 2 }}>{trainer.headline}</Txt>
            <View style={styles.metaRow}>
              <Ionicons name="star" size={14} color={colors.primary} />
              <Txt style={styles.metaStrong}>{trainer.rating.toFixed(1)}</Txt>
              <Txt variant="caption">({trainer.review_count})</Txt>
              <Txt variant="caption">· {trainer.years_experience} yrs · {trainer.city}</Txt>
            </View>
          </View>
        </View>

        {trainer.bio && <Txt variant="body" style={styles.bio}>{trainer.bio}</Txt>}

        <View style={styles.specialties}>
          {trainer.specialties.map((s) => (
            <View key={s} style={styles.spec}><Txt style={styles.specTxt}>{s}</Txt></View>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['pricing', 'availability', 'reviews'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={styles.tab}>
              <Txt style={[styles.tabTxt, tab === t && styles.tabTxtActive]}>
                {t === 'pricing' ? 'Session types & pricing' : t === 'availability' ? 'Availability' : 'Reviews'}
              </Txt>
              {tab === t && <View style={styles.tabUnderline} />}
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: 22, marginTop: 18 }}>
          {tab === 'pricing' && trainer.session_types.map((s) => (
            <Card key={s.id} onPress={() => setSelected(s)} selected={selected?.id === s.id} style={{ marginBottom: 12 }}>
              <View style={styles.planRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.planNameRow}>
                    <Txt variant="bodyStrong">{s.name}</Txt>
                    {s.popular && <Badge label="POPULAR" tone="brand" />}
                  </View>
                  <Txt variant="caption" style={{ marginTop: 3 }}>{s.description}</Txt>
                </View>
                <Txt style={styles.planPrice}>
                  {formatMoney(s.price)}
                  <Txt variant="caption">{s.billing_period === 'mo' ? '/mo' : ''}</Txt>
                </Txt>
              </View>
            </Card>
          ))}

          {tab === 'availability' && (
            <Card>
              <Txt variant="body">Next available: today from 4:00 PM. Tap "Book a session" to pick a slot.</Txt>
            </Card>
          )}

          {tab === 'reviews' && (
            trainer.reviews.length === 0 ? (
              <Card><Txt variant="body">No reviews yet.</Txt></Card>
            ) : trainer.reviews.map((r) => (
              <Card key={r.id} style={{ marginBottom: 12 }}>
                <View style={styles.reviewStars}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons key={i} name="star" size={13} color={i < r.rating ? colors.primary : colors.surfaceHigh} />
                  ))}
                </View>
                {r.comment && <Txt variant="body" style={{ marginTop: 8 }}>"{r.comment}"</Txt>}
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.cta}>
        <View>
          <Txt variant="caption">FROM</Txt>
          <Txt style={styles.ctaPrice}>{formatMoney(selected?.price ?? trainer.base_price)}</Txt>
        </View>
        <Button title="Book a session" onPress={book} fullWidth={false} style={{ flex: 1, marginLeft: 16 }} />
      </View>
    </SafeAreaView>
  );
}

function IconBtn({ icon, onPress, tint }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; tint?: string }) {
  return (
    <Pressable onPress={onPress} style={styles.iconBtn}>
      <Ionicons name={icon} size={20} color={tint ?? colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 280, justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(11,11,13,0.55)',
  },
  videoTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    margin: 18, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill,
    backgroundColor: 'rgba(11,11,13,0.55)',
  },
  videoTagTxt: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1, color: colors.white },
  identity: { flexDirection: 'row', gap: 14, paddingHorizontal: 22, marginTop: -20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaStrong: { fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary },
  bio: { paddingHorizontal: 22, marginTop: 16 },
  specialties: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 22, marginTop: 16 },
  spec: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  specTxt: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },
  tabs: { flexDirection: 'row', gap: 18, paddingHorizontal: 22, marginTop: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingBottom: 12 },
  tabTxt: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textDim },
  tabTxtActive: { color: colors.textPrimary },
  tabUnderline: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: colors.primary },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planPrice: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary },
  reviewStars: { flexDirection: 'row', gap: 2 },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 14, paddingBottom: 30,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  ctaPrice: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.textPrimary },
});
