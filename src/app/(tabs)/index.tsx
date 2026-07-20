import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { useBooking } from '@/context/booking';
import { listTrainers, getTrainer } from '@/lib/api';
import { isBackendConfigured } from '@/lib/supabase';
import { listFavoriteIds, onFavoritesChange } from '@/lib/favorites';
import { listMyCoachNudges, respondToCoachNudge } from '@/lib/retention';
import { Avatar, Brand, TrainerRowSkeleton, Txt } from '@/components/ui';
import { TrainerCard } from '@/components/TrainerCard';
import type { CoachNudge, Trainer } from '@/types/domain';
import { useLocale } from '@/context/locale';

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { profile } = useAuth();
  const { start } = useBooking();
  const { isRTL, tr, t } = useLocale();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nudges, setNudges] = useState<CoachNudge[]>([]);

  useEffect(() => {
    listTrainers().then((rows) => { setTrainers(rows); setLoading(false); }).catch(() => { setError(t('home.loadError')); setLoading(false); });
    const load = () => listFavoriteIds(profile?.id ?? 'demo-client').then(setFavoriteIds);
    load();
    listMyCoachNudges(profile?.id ?? 'demo-client').then(setNudges).catch(() => {});
    return onFavoritesChange(load);
  }, [profile?.id, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setError(null);
      setTrainers(await listTrainers());
      setFavoriteIds(await listFavoriteIds(profile?.id ?? 'demo-client'));
      setNudges(await listMyCoachNudges(profile?.id ?? 'demo-client'));
    } catch {
      setError(t('home.refreshError'));
    } finally {
      setRefreshing(false);
    }
  }, [profile?.id, t]);

  const firstName = (profile?.full_name ?? t('home.there')).split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('home.morning') : hour < 18 ? t('home.afternoon') : t('home.evening');
  const rtlRow = isRTL ? styles.rtlRow : undefined;
  const favorite = trainers.find((t) => favoriteIds.includes(t.id)) ?? trainers[0];
  const coachNudge = nudges.find((item) => item.status === 'sent' || item.status === 'seen');
  const topRated = [...trainers].sort((a, b) => b.rating - a.rating).slice(0, wide ? 4 : 6);
  const open = (id: string) => router.push(`/trainer/${id}`);

  async function quickBook(trainerId?: string) {
    const target = trainerId ? trainers.find((trainer) => trainer.id === trainerId) : favorite;
    if (!target) return;
    try {
      const detail = await getTrainer(target.id);
      if (!detail) return;
      const plans = detail.session_types.filter((p) => p.active && p.kind !== 'subscription');
      start(detail, plans, plans.find((p) => p.popular) ?? plans[0]);
      router.push(`/booking/${favorite.id}`);
    } catch {
      setError(t('home.openError'));
    }
  }

  async function actOnNudge() {
    if (!coachNudge) return;
    await respondToCoachNudge(coachNudge.id, 'acted').catch(() => {});
    setNudges((current) => current.map((item) => item.id === coachNudge.id ? { ...item, status: 'acted' } : item));
    if (coachNudge.kind === 'rebook') await quickBook(coachNudge.trainer_id);
    else router.push((coachNudge.kind === 'celebrate' ? '/momentum' : '/(tabs)/progress') as any);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.page}>
          <View style={[styles.topbar, rtlRow]}>
            <Brand compact />
            <View style={styles.topbarActions}>
              <Pressable style={styles.iconButton} onPress={() => router.push('/history')}>
                <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
              </Pressable>
              <Pressable onPress={() => router.push('/(tabs)/account')}>
                <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={44} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.welcomeRow, rtlRow]}>
            <View style={{ flex: 1 }}>
              <Txt style={styles.kicker}>{greeting}، {firstName}</Txt>
              <Txt style={styles.headline}>{t('home.ready')}</Txt>
            </View>
            <Pressable style={styles.location} onPress={() => router.push('/edit-profile')}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Txt style={styles.locationText}>{profile?.city ?? t('home.setLocation')}</Txt>
            </Pressable>
          </View>

          <Pressable style={[styles.search, rtlRow]} onPress={() => router.push('/(tabs)/discover')}>
            <Ionicons name="search" size={19} color={colors.textMuted} />
            <Txt style={styles.searchText}>{t('home.search')}</Txt>
            <View style={styles.filterButton}><Ionicons name="options" size={17} color={colors.textPrimary} /></View>
          </Pressable>

          <View style={[styles.quickRow, rtlRow]}>
            <QuickAction icon="radio-outline" label={tr('Pulse Drops')} meta={tr('Open in 72h')} onPress={() => router.push('/slot-drops' as any)} featured />
            <QuickAction icon="calendar-outline" label={t('home.sessions')} meta={t('home.yourSchedule')} onPress={() => router.push('/history')} />
            <QuickAction icon="sparkles-outline" label={t('home.momentum')} meta={t('home.trackProgress')} onPress={() => router.push('/(tabs)/progress')} />
          </View>

          {error && <View style={[styles.error, rtlRow]}><Ionicons name="cloud-offline-outline" size={18} color={colors.danger} /><Txt variant="caption" style={{ flex: 1 }}>{error}</Txt></View>}
          {isBackendConfigured && trainers.length === 0 && !loading && <View style={[styles.error, rtlRow]}><Ionicons name="people-outline" size={18} color={colors.primary} /><Txt variant="caption">{t('home.noTrainers')}</Txt></View>}

          {coachNudge && (
            <Pressable style={styles.coachNudge} onPress={actOnNudge}>
              <LinearGradient colors={['#3A1A10', colors.surfaceElevated, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={[styles.coachNudgeTop, rtlRow]}>
                <View style={styles.coachNudgeIcon}><Ionicons name={coachNudge.kind === 'rebook' ? 'repeat' : coachNudge.kind === 'celebrate' ? 'trophy' : 'chatbubble-ellipses'} size={19} color={colors.white} /></View>
                <View style={{ flex: 1 }}><Txt style={styles.coachNudgeKicker}>{tr('FROM YOUR COACH')}</Txt><Txt style={styles.coachNudgeTitle}>{coachNudge.title}</Txt></View>
                <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={19} color={colors.primary} />
              </View>
              <Txt variant="body" style={{ marginTop: 9 }}>{coachNudge.body}</Txt>
              <Txt style={styles.coachNudgeAction}>{tr(coachNudge.kind === 'rebook' ? 'See available times' : coachNudge.kind === 'celebrate' ? 'Open my momentum' : 'Review my progress')}</Txt>
            </Pressable>
          )}

          {favorite && (
            <Pressable style={[styles.rebook, rtlRow]} onPress={() => open(favorite.id)}>
              <LinearGradient colors={[colors.surfaceHigh, colors.surface, '#16100E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={styles.rebookCopy}>
                <Txt style={styles.rebookEyebrow}>{t('home.rebook')}</Txt>
                <Txt style={styles.rebookTitle}>{favorite.display_name}</Txt>
                <Txt style={styles.rebookMeta}>{favorite.headline}</Txt>
              </View>
              <Pressable style={styles.rebookButton} onPress={() => quickBook()}>
                <Txt style={styles.rebookButtonText}>{t('home.book')}</Txt>
                <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={16} color={colors.white} />
              </Pressable>
            </Pressable>
          )}

          <View style={[styles.sectionHead, rtlRow]}>
            <View>
              <Txt style={styles.sectionKicker}>{t('home.curated')}</Txt>
              <Txt variant="sectionTitle">{t('home.topCoaches')}</Txt>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/discover')}><Txt style={styles.seeAll}>{t('home.explore')}</Txt></Pressable>
          </View>

          {wide ? (
            <View style={styles.coachGrid}>
              {topRated.map((trainer) => <TrainerCard key={trainer.id} trainer={trainer} onPress={() => open(trainer.id)} />)}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coachRail} style={styles.coachRailOuter}>
              {topRated.map((trainer) => <TrainerCard key={trainer.id} trainer={trainer} onPress={() => open(trainer.id)} />)}
            </ScrollView>
          )}

          <View style={[styles.sectionHead, rtlRow, { marginTop: 30 }]}>
            <View>
              <Txt style={styles.sectionKicker}>{t('home.moreMatches')}</Txt>
              <Txt variant="sectionTitle">{t('home.yourGoals')}</Txt>
            </View>
          </View>
          <View style={[styles.nearGrid, wide && styles.nearGridWide]}>
            {loading && trainers.length === 0 && (<><TrainerRowSkeleton /><TrainerRowSkeleton /><TrainerRowSkeleton /></>)}
            {trainers.map((trainer) => (
              <View key={trainer.id} style={wide ? styles.nearItemWide : undefined}>
                <TrainerCard trainer={trainer} variant="row" onPress={() => open(trainer.id)} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, meta, onPress, featured }: { icon: keyof typeof Ionicons.glyphMap; label: string; meta: string; onPress: () => void; featured?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, featured && styles.quickActionFeatured, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={[styles.quickIcon, featured && styles.quickIconFeatured]}><Ionicons name={icon} size={19} color={featured ? colors.white : colors.primary} /></View>
      <Txt style={styles.quickLabel}>{label}</Txt>
      <Txt style={styles.quickMeta} numberOfLines={1}>{meta}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  scroll: { paddingBottom: 32 },
  page: { width: '100%', maxWidth: 1160, alignSelf: 'center', paddingHorizontal: 20 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
  topbarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  welcomeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 30 },
  kicker: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  headline: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 36, letterSpacing: -1.3, color: colors.textPrimary, marginTop: 3 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.primaryTint },
  locationText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textSecondary },
  search: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 22, minHeight: 58, paddingLeft: 17, paddingRight: 8, borderRadius: radius.xl, backgroundColor: colors.surfaceElevated, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  searchText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  filterButton: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickAction: { flex: 1, minWidth: 0, padding: 13, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSubtle },
  quickActionFeatured: { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder },
  quickIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  quickIconFeatured: { backgroundColor: colors.primary },
  quickLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary },
  quickMeta: { fontFamily: fonts.regular, fontSize: 10, color: colors.textDim, marginTop: 3 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 13, borderRadius: radius.lg, backgroundColor: colors.surface },
  coachNudge: { overflow: 'hidden', marginTop: 18, padding: 16, borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.primaryBorder },
  coachNudgeTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  coachNudgeIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  coachNudgeKicker: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 1, color: colors.primary },
  coachNudgeTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary, marginTop: 3 },
  coachNudgeAction: { alignSelf: 'flex-start', fontFamily: fonts.bold, fontSize: 11, color: colors.primary, marginTop: 12 },
  rebook: { minHeight: 110, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 24, padding: 18, borderRadius: radius.xxl, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.primaryBorder },
  rebookCopy: { flex: 1 },
  rebookEyebrow: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.2, color: colors.primary },
  rebookTitle: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.4, color: colors.textPrimary, marginTop: 8 },
  rebookMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 3 },
  rebookButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, paddingVertical: 11, borderRadius: radius.pill, backgroundColor: colors.primary },
  rebookButtonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 32 },
  sectionKicker: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.2, color: colors.primary, marginBottom: 6 },
  seeAll: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary, paddingBottom: 2 },
  coachRailOuter: { marginHorizontal: -20 },
  coachRail: { gap: 13, paddingHorizontal: 20, paddingTop: 15, paddingBottom: 4 },
  coachGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 16 },
  nearGrid: { gap: 11, paddingTop: 15 },
  nearGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  nearItemWide: { width: '49%', flexGrow: 1 },
});
