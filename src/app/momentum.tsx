import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { Button, Card, EmptyState, InputSheet, Skeleton, Txt } from '@/components/ui';
import { colors, fonts, radius } from '@/theme';
import {
  getChallengeLeaderboard,
  joinChallenge,
  leaveChallenge,
  listChallenges,
  listMyChallengeMemberships,
} from '@/lib/retention';
import type { Challenge, ChallengeLeaderboardEntry, ChallengeMembership } from '@/types/domain';
import { confirm } from '@/lib/confirm';

export default function MomentumCircles() {
  const router = useRouter();
  const { profile } = useAuth();
  const { locale, localeTag, isRTL, tr } = useLocale();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [memberships, setMemberships] = useState<ChallengeMembership[]>([]);
  const [leaderboards, setLeaderboards] = useState<Record<string, ChallengeLeaderboardEntry[]>>({});
  const [joining, setJoining] = useState<Challenge | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientId = profile?.id ?? 'demo-client';
  const rtlRow = isRTL ? styles.rtlRow : undefined;

  const load = useCallback(async () => {
    try {
      setError(null);
      const next = await listChallenges(!profile);
      setChallenges(next);
      setMemberships(await listMyChallengeMemberships(clientId));
    } catch (value: any) {
      setError(value?.message ?? tr('Momentum is temporarily unavailable.'));
    } finally {
      setLoaded(true);
    }
  }, [clientId, profile, tr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const defaultAlias = (() => {
    const parts = (profile?.full_name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return locale === 'ar' ? 'رياضي FitConnect' : 'FitConnect Athlete';
    return `${parts[0]}${parts[1] ? ` ${parts[1][0]}.` : ''}`;
  })();

  async function join(alias: string) {
    if (!joining) return;
    if (!profile) {
      setJoining(null);
      router.push('/(auth)/sign-in?mode=up');
      return;
    }
    await joinChallenge(joining.id, clientId, alias);
    setJoining(null);
    await load();
  }

  async function toggleLeaderboard(challenge: Challenge) {
    if (leaderboards[challenge.id]) {
      setLeaderboards((current) => { const next = { ...current }; delete next[challenge.id]; return next; });
      return;
    }
    const rows = await getChallengeLeaderboard(challenge.id, clientId);
    setLeaderboards((current) => ({ ...current, [challenge.id]: rows }));
  }

  function confirmLeave(challenge: Challenge) {
    confirm({ title: tr('Leave this challenge?'), message: tr('Your current challenge progress and alias will be removed. Completed-session history is not affected.'), confirmLabel: tr('Leave challenge'), destructive: true }, async () => {
      await leaveChallenge(challenge.id, clientId);
      await load();
    });
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={[styles.header, rtlRow]}>
          <Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={() => router.back()} style={styles.back}><Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={21} color={colors.textPrimary} /></Pressable>
          <View style={{ flex: 1 }}><Txt variant="monoTag">{tr('MOMENTUM CIRCLES')}</Txt><Txt style={styles.title}>{tr('Train together. Keep your privacy.')}</Txt></View>
        </View>

        <View style={styles.hero}>
          <LinearGradient colors={['#3A1A10', '#1C1515', colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.heroGlow} />
          <View style={[styles.heroMark, rtlRow]}><Ionicons name="people" size={21} color={colors.white} /><Txt style={styles.heroMarkText}>{tr('SMALL CIRCLES · VERIFIED EFFORT')}</Txt></View>
          <Txt style={styles.heroTitle}>{tr('Accountability without the awkwardness.')}</Txt>
          <Txt variant="body" style={styles.heroCopy}>{tr('Only completed FitConnect sessions move the score. Weight, photos, location, and health details never appear on a leaderboard.')}</Txt>
          <View style={[styles.trustRow, rtlRow]}>
            <Trust icon="shield-checkmark" text={tr('Aliases, not full names')} />
            <Trust icon="checkmark-circle" text={tr('Verified sessions only')} />
          </View>
        </View>

        {error && <Card><EmptyState icon="cloud-offline-outline" title={tr('Momentum unavailable')} subtitle={error} actionLabel={tr('Try again')} onAction={load} /></Card>}
        {!loaded && <><Skeleton height={190} style={{ borderRadius: radius.xl }} /><Skeleton height={190} style={{ borderRadius: radius.xl }} /></>}

        {loaded && (
          <>
            <View style={[styles.sectionHead, rtlRow]}><View><Txt variant="monoTag">{tr('THIS SEASON')}</Txt><Txt style={styles.sectionTitle}>{tr('Choose your kind of motivation')}</Txt></View><Txt variant="caption">{new Intl.NumberFormat(localeTag).format(challenges.length)} {tr('open')}</Txt></View>
            {challenges.map((challenge) => {
              const membership = memberships.find((item) => item.challenge_id === challenge.id);
              const progress = membership?.progress ?? 0;
              const pct = Math.min(1, progress / challenge.target);
              const rows = leaderboards[challenge.id];
              const title = locale === 'ar' ? challenge.title_ar : challenge.title;
              const description = locale === 'ar' ? challenge.description_ar : challenge.description;
              const days = Math.max(0, dayjs(challenge.ends_at).diff(dayjs(), 'day'));
              return (
                <View key={challenge.id} style={[styles.challenge, membership && styles.challengeJoined]}>
                  <View style={[styles.challengeTop, rtlRow]}>
                    <View style={[styles.challengeIcon, challenge.kind === 'circle' && styles.challengeIconCircle]}><Ionicons name={challenge.kind === 'circle' ? 'people' : 'flash'} size={20} color={colors.primary} /></View>
                    <View style={{ flex: 1 }}><Txt style={styles.challengeKind}>{tr(challenge.kind === 'circle' ? 'MOMENTUM CIRCLE' : 'PERSONAL MISSION')}</Txt><Txt style={styles.challengeTitle}>{title}</Txt></View>
                    <View style={styles.xp}><Ionicons name="sparkles" size={11} color={colors.warm} /><Txt style={styles.xpText}>{new Intl.NumberFormat(localeTag).format(challenge.reward_xp)} XP</Txt></View>
                  </View>
                  <Txt variant="body" style={{ marginTop: 12 }}>{description}</Txt>
                  <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(3, pct * 100)}%` }]} /></View>
                  <View style={[styles.progressMeta, rtlRow]}>
                    <Txt style={styles.progressText}>{new Intl.NumberFormat(localeTag).format(progress)} / {new Intl.NumberFormat(localeTag).format(challenge.target)} {tr('verified sessions')}</Txt>
                    <Txt variant="caption">{new Intl.NumberFormat(localeTag).format(days)} {tr('days left')}</Txt>
                  </View>
                  {membership ? (
                    <View style={[styles.joinedActions, rtlRow]}>
                      {challenge.kind === 'circle' ? <Pressable accessibilityRole="button" accessibilityLabel={tr(rows ? 'Hide circle' : 'View circle')} style={styles.rankButton} onPress={() => toggleLeaderboard(challenge)}><Ionicons name="podium-outline" size={17} color={colors.primary} /><Txt style={styles.rankText}>{tr(rows ? 'Hide circle' : 'View circle')}</Txt></Pressable> : <View style={styles.verified}><Ionicons name="checkmark-circle" size={15} color={colors.success} /><Txt style={styles.verifiedText}>{tr('Private verified mission')}</Txt></View>}
                      <Pressable accessibilityRole="button" accessibilityLabel={tr('Leave challenge')} onPress={() => confirmLeave(challenge)} hitSlop={8}><Txt variant="caption">{tr('Leave')}</Txt></Pressable>
                    </View>
                  ) : (
                    <Button title={profile ? tr('Join with an alias') : tr('Create an account to join')} icon={isRTL ? 'arrow-back' : 'arrow-forward'} onPress={() => profile ? setJoining(challenge) : router.push('/(auth)/sign-in?mode=up')} style={{ marginTop: 16 }} />
                  )}
                  {rows && (
                    <View style={styles.leaderboard}>
                      <View style={[styles.leaderboardHead, rtlRow]}><Txt variant="monoTag">{tr('CIRCLE STANDINGS')}</Txt><Txt variant="caption">{tr('No body metrics')}</Txt></View>
                      {rows.map((row) => (
                        <View key={`${challenge.id}-${row.position}`} style={[styles.rankRow, row.is_me && styles.rankRowMe, rtlRow]}>
                          <Txt style={styles.position}>{new Intl.NumberFormat(localeTag).format(row.position)}</Txt>
                          <View style={{ flex: 1 }}><Txt variant="bodyStrong">{row.display_alias}</Txt><Txt variant="caption">{new Intl.NumberFormat(localeTag).format(row.progress)} {tr('sessions')}</Txt></View>
                          {row.is_me && <Txt style={styles.you}>{tr('YOU')}</Txt>}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.principle}>
              <Ionicons name="heart" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}><Txt variant="bodyStrong">{tr('Designed for consistency, not shame')}</Txt><Txt variant="caption" style={{ marginTop: 4 }}>{tr('No calorie contests, weight rankings, public failure states, or open group chat. Your trainer can encourage you; your health details stay private.')}</Txt></View>
            </View>
          </>
        )}
      </ScrollView>

      <InputSheet
        visible={!!joining}
        title={tr('Choose your circle alias')}
        fields={[{ key: 'alias', label: tr('Visible to this circle'), placeholder: defaultAlias, initial: defaultAlias, maxLength: 30 }]}
        submitLabel={tr('Join Momentum Circle')}
        onSubmit={(values) => join(values.alias)}
        onClose={() => setJoining(null)}
      />
    </SafeAreaView>
  );
}

function Trust({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.trust}><Ionicons name={icon} size={14} color={colors.success} /><Txt style={styles.trustText}>{text}</Txt></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, paddingBottom: 40, gap: 14 },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  title: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -1, color: colors.textPrimary, marginTop: 5 },
  hero: { overflow: 'hidden', borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.primaryBorder, padding: 20 },
  heroGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -130, right: -45, backgroundColor: colors.primaryTintStrong },
  heroMark: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.primary },
  heroMarkText: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 0.8, color: colors.white },
  heroTitle: { maxWidth: 500, fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 34, letterSpacing: -1.1, color: colors.textPrimary, marginTop: 20 },
  heroCopy: { maxWidth: 540, marginTop: 9 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.05)' },
  trustText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.textSecondary },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 10 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 27, letterSpacing: -0.7, color: colors.textPrimary, marginTop: 5 },
  challenge: { borderRadius: radius.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 17 },
  challengeJoined: { borderColor: colors.primaryBorder, backgroundColor: colors.surfaceElevated },
  challengeTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  challengeIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  challengeIconCircle: { backgroundColor: colors.primaryTintStrong },
  challengeKind: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 1, color: colors.primary },
  challengeTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary, marginTop: 3 },
  xp: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,179,107,0.1)' },
  xpText: { fontFamily: fonts.monoBold, fontSize: 8, color: colors.warm },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceHigh, overflow: 'hidden', marginTop: 17 },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  progressText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  joinedActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  rankButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.primaryTint },
  rankText: { fontFamily: fonts.bold, fontSize: 11, color: colors.primary },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedText: { fontFamily: fonts.bold, fontSize: 10, color: colors.success },
  leaderboard: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 7 },
  leaderboardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.lg },
  rankRowMe: { backgroundColor: colors.primaryTint },
  position: { width: 22, fontFamily: fonts.extrabold, fontSize: 15, color: colors.textMuted, textAlign: 'center', fontVariant: ['tabular-nums'] },
  you: { fontFamily: fonts.monoBold, fontSize: 8, color: colors.primary },
  principle: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
});
