import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { listTrainers, TrainerFilter } from '@/lib/api';
import { Chip, EmptyState, TrainerRowSkeleton, Txt } from '@/components/ui';
import { TrainerCard } from '@/components/TrainerCard';
import type { Trainer } from '@/types/domain';

const RATINGS = [4.5, 4.7, 4.9];
const GENDERS = ['Female', 'Male'];
const LANGUAGES = ['English', 'Spanish', 'Arabic', 'Mandarin'];

export default function Discover() {
  const router = useRouter();
  const [all, setAll] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [availableNow, setAvailableNow] = useState(false);
  const [minRating, setMinRating] = useState<number | undefined>();
  const [gender, setGender] = useState<string | undefined>();
  const [language, setLanguage] = useState<string | undefined>();

  useEffect(() => {
    listTrainers().then((t) => { setAll(t); setLoading(false); });
  }, []);

  const results = useMemo(() => {
    const filter: TrainerFilter = { query, availableNow, minRating, gender, language };
    return all.filter((t) => {
      if (query) {
        const hay = `${t.display_name} ${t.headline ?? ''} ${t.specialties.join(' ')}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      if (availableNow && !t.available_now) return false;
      if (minRating && t.rating < minRating) return false;
      if (gender && t.gender !== gender) return false;
      if (language && !t.languages.includes(language)) return false;
      return true;
    });
  }, [all, query, availableNow, minRating, gender, language]);

  const toggle = <T,>(cur: T | undefined, val: T, set: (v: T | undefined) => void) =>
    set(cur === val ? undefined : val);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Txt variant="screenTitle">Discover</Txt>
      </View>
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textDim} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search trainers, specialties…"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Filters */}
        <View style={styles.filters}>
          <FilterGroup title="Session type">
            <Chip label="Available now" selected={availableNow} onPress={() => setAvailableNow(!availableNow)} />
          </FilterGroup>
          <FilterGroup title="Minimum rating">
            {RATINGS.map((r) => (
              <Chip key={r} label={`${r}+`} selected={minRating === r} onPress={() => toggle(minRating, r, setMinRating)} />
            ))}
          </FilterGroup>
          <FilterGroup title="Gender">
            {GENDERS.map((g) => (
              <Chip key={g} label={g} selected={gender === g} onPress={() => toggle(gender, g, setGender)} />
            ))}
          </FilterGroup>
          <FilterGroup title="Language">
            {LANGUAGES.map((l) => (
              <Chip key={l} label={l} selected={language === l} onPress={() => toggle(language, l, setLanguage)} />
            ))}
          </FilterGroup>
        </View>

        <View style={styles.countRow}>
          <Txt variant="mono" style={{ color: colors.textMuted }}>
            {results.length} TRAINER{results.length === 1 ? '' : 'S'} AVAILABLE
          </Txt>
        </View>

        <View style={{ paddingHorizontal: 22, gap: 12 }}>
          {loading && all.length === 0 && (<><TrainerRowSkeleton /><TrainerRowSkeleton /><TrainerRowSkeleton /><TrainerRowSkeleton /></>)}
          {results.map((t) => (
            <TrainerCard key={t.id} trainer={t} variant="row" onPress={() => router.push(`/trainer/${t.id}`)} />
          ))}
          {!loading && results.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="search" size={28} color={colors.textFaint} />
              <Txt variant="body" center style={{ marginTop: 10 }}>No trainers match those filters yet.</Txt>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Txt variant="label" style={{ marginBottom: 10 }}>{title}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 22, paddingTop: 12 },
  searchWrap: { paddingHorizontal: 22, paddingVertical: 14 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingHorizontal: 15,
  },
  input: { flex: 1, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 13 },
  filters: { paddingHorizontal: 22, paddingTop: 4 },
  countRow: { paddingHorizontal: 22, paddingVertical: 12 },
  empty: { alignItems: 'center', paddingVertical: 40 },
});
