import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, spacing } from '@/theme';
import { useAuth } from '@/context/auth';
import { useBooking } from '@/context/booking';
import { listTrainers, getTrainer } from '@/lib/api';
import { isBackendConfigured } from '@/lib/supabase';
import { listFavoriteIds, onFavoritesChange } from '@/lib/favorites';
import { Avatar, Badge, TrainerRowSkeleton, Txt } from '@/components/ui';
import { Segmented } from '@/components/ui/Segmented';
import { TrainerCard } from '@/components/TrainerCard';
import type { Trainer } from '@/types/domain';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const router = useRouter();
  const { profile } = useAuth();
  const { start } = useBooking();
  const [mode, setMode] = useState<'instant' | 'subscriptions'>('instant');
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    listTrainers().then((t) => { setTrainers(t); setLoading(false); });
    const load = () => listFavoriteIds(profile?.id ?? 'demo-client').then(setFavoriteIds);
    load();
    return onFavoritesChange(load);
  }, [profile?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setTrainers(await listTrainers());
      setFavoriteIds(await listFavoriteIds(profile?.id ?? 'demo-client'));
    } finally {
      setRefreshing(false);
    }
  }, [profile?.id]);

  const firstName = (profile?.full_name ?? 'there').split(' ')[0];
  const favorite = trainers.find((t) => favoriteIds.includes(t.id)) ?? trainers[0];
  const topRated = [...trainers].sort((a, b) => b.rating - a.rating).slice(0, 6);
  const subs = mode === 'subscriptions';
  const monthly = (t: Trainer) => Math.round(t.base_price * 5.4);

  const open = (id: string) => router.push(`/trainer/${id}`);

  async function quickBook() {
    if (!favorite) return;
    const detail = await getTrainer(favorite.id);
    if (!detail) return;
    const plans = detail.session_types;
    start(detail, plans, plans.find((p) => p.popular) ?? plans[0]);
    router.push(`/booking/${favorite.id}`);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Pressable style={styles.locRow} onPress={() => router.push('/edit-profile')} hitSlop={6}>
              <Ionicons name="location" size={13} color={colors.primary} />
              <Txt variant="mono" style={{ color: colors.textMuted }}>{profile?.city ?? 'Set your location'}</Txt>
            </Pressable>
            <Txt variant="screenTitle" style={{ marginTop: 2 }}>{greeting()}, {firstName}</Txt>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/account')}>
            <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={46} />
          </Pressable>
        </View>

        {/* Search */}
        <Pressable style={styles.search} onPress={() => router.push('/(tabs)/discover')}>
          <Ionicons name="search" size={18} color={colors.textDim} />
          <Txt variant="body" style={{ color: colors.textDim }}>Search trainers, specialties…</Txt>
        </Pressable>

        {/* Mode toggle */}
        <View style={styles.section}>
          <Segmented
            options={[{ key: 'instant', label: 'Book instantly' }, { key: 'subscriptions', label: 'Subscriptions' }]}
            value={mode}
            onChange={setMode}
          />
        </View>

        {/* Connected-but-empty database hint (owner-facing) */}
        {isBackendConfigured && trainers.length === 0 && (
          <View style={styles.section}>
            <View style={styles.emptyHint}>
              <Ionicons name="server" size={18} color={colors.primary} />
              <Txt variant="caption" style={{ flex: 1 }}>
                Backend connected, but no trainers in the database yet. Run
                supabase/migrations/0002_seed.sql in the Supabase SQL editor to load
                the showcase trainers.
              </Txt>
            </View>
          </View>
        )}

        {/* Favorite trainer */}
        {favorite && (
          <View style={styles.section}>
            <Txt variant="label" style={styles.eyebrow}>YOUR FAVORITE</Txt>
            <Pressable style={styles.favCard} onPress={() => open(favorite.id)}>
              <Avatar uri={favorite.avatar_url} name={favorite.display_name} size={54} />
              <View style={{ flex: 1 }}>
                <View style={styles.favTop}>
                  <Txt variant="cardTitle" numberOfLines={1}>{favorite.display_name}</Txt>
                  {favorite.verified && <Ionicons name="checkmark-circle" size={15} color={colors.primary} />}
                </View>
                {favorite.available_now && <Badge label="AVAILABLE NOW" tone="success" style={{ marginTop: 4 }} />}
              </View>
              <Pressable style={styles.quickBook} onPress={quickBook}>
                <Txt style={styles.quickBookTxt}>Quick book</Txt>
              </Pressable>
            </Pressable>
          </View>
        )}

        {/* Top rated */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Txt variant="sectionTitle">Top rated near you</Txt>
            <Pressable onPress={() => router.push('/(tabs)/discover')}>
              <Txt style={styles.seeAll}>See all</Txt>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 14, paddingHorizontal: 22, paddingTop: 14 }}
            style={{ marginHorizontal: -22 }}
          >
            {topRated.map((t) => (
              <TrainerCard
                key={t.id}
                trainer={t}
                variant="wide"
                onPress={() => open(t.id)}
                priceOverride={subs ? monthly(t) : undefined}
                periodLabel={subs ? '/mo' : '/ session'}
              />
            ))}
          </ScrollView>
        </View>

        {/* Near you list */}
        <View style={styles.section}>
          <Txt variant="sectionTitle" style={{ marginBottom: 14 }}>Trainers near you</Txt>
          <View style={{ gap: 12 }}>
            {loading && trainers.length === 0 && (<><TrainerRowSkeleton /><TrainerRowSkeleton /><TrainerRowSkeleton /></>)}
            {trainers.map((t) => (
              <TrainerCard
                key={t.id}
                trainer={t}
                variant="row"
                onPress={() => open(t.id)}
                priceOverride={subs ? monthly(t) : undefined}
                periodLabel={subs ? '/mo' : '/ session'}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 10,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  section: { paddingHorizontal: 22, marginTop: 22 },
  eyebrow: { color: colors.textDim, letterSpacing: 1, marginBottom: 10, fontFamily: fonts.monoBold, fontSize: 11 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  seeAll: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  favCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 14,
  },
  favTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickBook: {
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  quickBookTxt: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  emptyHint: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder,
    borderRadius: radius.lg, padding: 14,
  },
});
