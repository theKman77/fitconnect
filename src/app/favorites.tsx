import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { useAuth } from '@/context/auth';
import { listTrainers } from '@/lib/api';
import { listFavoriteIds, onFavoritesChange } from '@/lib/favorites';
import { EmptyState, Txt } from '@/components/ui';
import { TrainerCard } from '@/components/TrainerCard';
import type { Trainer } from '@/types/domain';
import { useLocale } from '@/context/locale';

export default function Favorites() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isRTL, tr } = useLocale();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTrainers().then(setTrainers).catch(() => setError(tr('Could not load favorite trainers.'))).finally(() => setLoaded(true));
    const load = () => listFavoriteIds(profile?.id ?? 'demo-client').then(setIds).catch(() => setError(tr('Could not load favorites.')));
    load();
    return onFavoritesChange(load);
  }, [profile?.id, tr]);

  const favorites = trainers.filter((t) => ids.includes(t.id));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.textPrimary} />
        </Pressable>
        <Txt variant="sectionTitle">{tr('Favorite trainers')}</Txt>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 22, gap: 12 }} showsVerticalScrollIndicator={false}>
        {favorites.map((t) => (
          <TrainerCard key={t.id} trainer={t} variant="row" onPress={() => router.push(`/trainer/${t.id}`)} />
        ))}
        {loaded && favorites.length === 0 && <EmptyState icon={error ? 'cloud-offline-outline' : 'heart-outline'} title={error ? tr('Favorites unavailable') : tr('No favorites yet')} subtitle={error ?? tr("Tap the heart on a trainer's profile to save them here.")} actionLabel={!error ? tr('Discover trainers') : undefined} onAction={!error ? () => router.push('/(tabs)/discover') : undefined} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
});
