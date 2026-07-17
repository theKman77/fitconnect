import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { useAuth } from '@/context/auth';
import { listTrainers } from '@/lib/api';
import { listFavoriteIds, onFavoritesChange } from '@/lib/favorites';
import { Txt } from '@/components/ui';
import { TrainerCard } from '@/components/TrainerCard';
import type { Trainer } from '@/types/domain';

export default function Favorites() {
  const router = useRouter();
  const { profile } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    listTrainers().then(setTrainers);
    const load = () => listFavoriteIds(profile?.id ?? 'demo-client').then(setIds);
    load();
    return onFavoritesChange(load);
  }, [profile?.id]);

  const favorites = trainers.filter((t) => ids.includes(t.id));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Txt variant="sectionTitle">Favorite trainers</Txt>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 22, gap: 12 }} showsVerticalScrollIndicator={false}>
        {favorites.map((t) => (
          <TrainerCard key={t.id} trainer={t} variant="row" onPress={() => router.push(`/trainer/${t.id}`)} />
        ))}
        {favorites.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={32} color={colors.textFaint} />
            <Txt variant="body" center style={{ marginTop: 12 }}>
              No favorites yet. Tap the heart on a trainer's profile to save them here.
            </Txt>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
});
