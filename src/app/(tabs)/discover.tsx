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
const LANGUAGES = ['Arabic', 'English', 'Urdu', 'Hindi'];
const GOALS = [
  { label: 'Get stronger', terms: ['strength', 'muscle'], icon: 'barbell-outline' },
  { label: 'Move better', terms: ['mobility', 'yoga', 'pilates'], icon: 'body-outline' },
  { label: 'Lose weight', terms: ['weight', 'hiit', 'cardio'], icon: 'flame-outline' },
  { label: 'Learn boxing', terms: ['boxing', 'combat'], icon: 'flash-outline' },
] as const;

export default function Discover() {
  const router = useRouter();
  const [all, setAll] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [goal, setGoal] = useState<string | undefined>();
  const [availableNow, setAvailableNow] = useState(false);
  const [minRating, setMinRating] = useState<number | undefined>();
  const [gender, setGender] = useState<string | undefined>();
  const [language, setLanguage] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listTrainers()
      .then(setAll)
      .catch(() => setError('Could not load trainers. Check your connection.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const results = useMemo(() => {
    const filter: TrainerFilter = { query, availableNow, minRating, gender, language };
    const selectedGoal = GOALS.find((item) => item.label === goal);
    return all.filter((t) => {
      const hay = `${t.display_name} ${t.headline ?? ''} ${t.specialties.join(' ')}`.toLowerCase();
      if (filter.query && !hay.includes(filter.query.toLowerCase())) return false;
      if (selectedGoal && !selectedGoal.terms.some((term) => hay.includes(term))) return false;
      if (filter.availableNow && !t.available_now) return false;
      if (filter.minRating && t.rating < filter.minRating) return false;
      if (filter.gender && t.gender !== filter.gender) return false;
      if (filter.language && !t.languages.includes(filter.language)) return false;
      return true;
    });
  }, [all, query, goal, availableNow, minRating, gender, language]);

  const toggle = <T,>(cur: T | undefined, val: T, set: (v: T | undefined) => void) =>
    set(cur === val ? undefined : val);
  const activeFilters = Number(availableNow) + Number(!!minRating) + Number(!!gender) + Number(!!language);
  const clearAll = () => {
    setQuery(''); setGoal(undefined); setAvailableNow(false);
    setMinRating(undefined); setGender(undefined); setLanguage(undefined);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Txt variant="monoTag">TRAIN ON YOUR TERMS</Txt>
            <Txt style={styles.title}>Find your person.</Txt>
          </View>
          <View style={styles.cityPill}>
            <Ionicons name="location" size={13} color={colors.primary} />
            <Txt style={styles.cityText}>Riyadh</Txt>
          </View>
        </View>
        <Txt variant="body" style={styles.intro}>Choose a goal, then compare real coaches by fit—not just price.</Txt>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalRail} contentContainerStyle={styles.goalContent}>
          {GOALS.map((item) => {
            const selected = item.label === goal;
            return (
              <Pressable
                key={item.label}
                onPress={() => setGoal(selected ? undefined : item.label)}
                style={({ pressed }) => [styles.goalCard, selected && styles.goalCardOn, pressed && styles.pressed]}
              >
                <View style={[styles.goalIcon, selected && styles.goalIconOn]}>
                  <Ionicons name={item.icon} size={20} color={selected ? colors.white : colors.primary} />
                </View>
                <Txt style={[styles.goalText, selected && { color: colors.textPrimary }]}>{item.label}</Txt>
                <Ionicons name="arrow-forward" size={14} color={selected ? colors.primary : colors.textFaint} />
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.toolRow}>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.textDim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Trainer, specialty, or skill"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={colors.textDim} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => setShowFilters((value) => !value)}
            style={[styles.filterButton, (showFilters || activeFilters > 0) && styles.filterButtonOn]}
            accessibilityLabel="Show trainer filters"
          >
            <Ionicons name="options-outline" size={19} color={showFilters || activeFilters ? colors.white : colors.textSecondary} />
            {activeFilters > 0 && <View style={styles.filterCount}><Txt style={styles.filterCountText}>{activeFilters}</Txt></View>}
          </Pressable>
        </View>

        <View style={styles.quickRow}>
          <Pressable onPress={() => setAvailableNow((value) => !value)} style={[styles.nowPill, availableNow && styles.nowPillOn]}>
            <View style={[styles.liveDot, availableNow && { backgroundColor: colors.white }]} />
            <Txt style={[styles.nowText, availableNow && { color: colors.white }]}>Available now</Txt>
          </Pressable>
          {(goal || activeFilters > 0 || query) && <Pressable onPress={clearAll}><Txt style={styles.clearText}>Clear all</Txt></Pressable>}
        </View>

        {showFilters && (
          <View style={styles.filterPanel}>
            <View style={styles.filterPanelTop}>
              <Txt variant="sectionTitle">Refine the match</Txt>
              <Pressable onPress={() => setShowFilters(false)} hitSlop={8}><Ionicons name="close" size={20} color={colors.textMuted} /></Pressable>
            </View>
            <FilterGroup title="Minimum rating">
              {RATINGS.map((r) => <Chip key={r} label={`${r}+`} selected={minRating === r} onPress={() => toggle(minRating, r, setMinRating)} />)}
            </FilterGroup>
            <FilterGroup title="Trainer gender">
              {GENDERS.map((g) => <Chip key={g} label={g} selected={gender === g} onPress={() => toggle(gender, g, setGender)} />)}
            </FilterGroup>
            <FilterGroup title="Session language">
              {LANGUAGES.map((l) => <Chip key={l} label={l} selected={language === l} onPress={() => toggle(language, l, setLanguage)} />)}
            </FilterGroup>
          </View>
        )}

        <View style={styles.resultsHead}>
          <View>
            <Txt variant="sectionTitle">Recommended matches</Txt>
            <Txt variant="caption" style={{ marginTop: 3 }}>{results.length} trainer{results.length === 1 ? '' : 's'} ready to help</Txt>
          </View>
          <View style={styles.qualityPill}><Ionicons name="shield-checkmark" size={13} color={colors.success} /><Txt style={styles.qualityText}>VETTED</Txt></View>
        </View>

        <View style={styles.results}>
          {loading && all.length === 0 && (<><TrainerRowSkeleton /><TrainerRowSkeleton /><TrainerRowSkeleton /></>)}
          {results.map((t) => <TrainerCard key={t.id} trainer={t} variant="row" onPress={() => router.push(`/trainer/${t.id}`)} />)}
          {!loading && results.length === 0 && (
            <EmptyState
              icon={error ? 'cloud-offline-outline' : 'search'}
              title={error ? 'Trainers unavailable' : 'No exact match yet'}
              subtitle={error ?? 'Widen your filters and we will show the closest available coaches.'}
              actionLabel={error ? 'Try again' : 'Reset search'}
              onAction={error ? load : clearAll}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.filterGroup}><Txt variant="label" style={{ marginBottom: 10 }}>{title}</Txt><View style={styles.chipWrap}>{children}</View></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 34 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, paddingTop: 14, gap: 12 },
  title: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 38, letterSpacing: -1.5, color: colors.textPrimary, marginTop: 7 },
  intro: { paddingHorizontal: 22, maxWidth: 520, marginTop: 8 },
  cityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7 },
  cityText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textPrimary },
  goalRail: { marginTop: 22 },
  goalContent: { paddingHorizontal: 22, gap: 10 },
  goalCard: { width: 144, minHeight: 126, justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.xl, padding: 15 },
  goalCardOn: { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder },
  goalIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  goalIconOn: { backgroundColor: colors.primary },
  goalText: { fontFamily: fonts.bold, fontSize: 14, color: colors.textSecondary, marginTop: 13 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  toolRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 22, marginTop: 24 },
  search: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 15 },
  input: { flex: 1, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 14, paddingVertical: 13 },
  filterButton: { width: 50, height: 50, borderRadius: radius.lg, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  filterButtonOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterCount: { position: 'absolute', right: -4, top: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterCountText: { fontFamily: fonts.bold, fontSize: 10, color: colors.bg },
  quickRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginTop: 10 },
  nowPill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radius.pill, backgroundColor: colors.successTint, borderWidth: 1, borderColor: 'rgba(59,209,111,0.2)', paddingHorizontal: 12, paddingVertical: 8 },
  nowPillOn: { backgroundColor: colors.success, borderColor: colors.success },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  nowText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.successLight },
  clearText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  filterPanel: { marginHorizontal: 22, marginTop: 8, padding: 18, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterPanelTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  filterGroup: { marginBottom: 16 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resultsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 22, marginTop: 28, marginBottom: 13 },
  qualityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.successTint, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 6 },
  qualityText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.7, color: colors.successLight },
  results: { paddingHorizontal: 22, gap: 12 },
});
