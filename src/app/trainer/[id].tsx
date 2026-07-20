import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { colors, fonts, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { getTrainer } from '@/lib/api';
import { listAvailability } from '@/lib/trainer';
import { isFavorite, toggleFavorite } from '@/lib/favorites';
import { useAuth } from '@/context/auth';
import { useBooking } from '@/context/booking';
import { Badge, Button, Card, EmptyState, TrainerProfileSkeleton, Txt } from '@/components/ui';
import { VideoPlayerModal } from '@/components/VideoPlayerModal';
import { useLocale } from '@/context/locale';
import { localizeDomain } from '@/lib/localize-domain';
import type { AvailabilitySlot, SessionType, TrainerDetail } from '@/types/domain';

type Tab = 'plans' | 'times' | 'reviews';

export default function TrainerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { start, update } = useBooking();
  const { profile } = useAuth();
  const { locale, localeTag, isRTL, t, tr } = useLocale();
  const [trainer, setTrainer] = useState<TrainerDetail>();
  const [selected, setSelected] = useState<SessionType>();
  const [fav, setFav] = useState(false);
  const [tab, setTab] = useState<Tab>('plans');
  const [showVideo, setShowVideo] = useState(false);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoadError(null);
    getTrainer(id)
      .then(async (value) => {
        if (!value) throw new Error(t('profile.notFound'));
        setTrainer(value);
        const bookable = value.session_types.filter((session) => session.active && session.kind !== 'subscription');
        setSelected(bookable.find((session) => session.popular) ?? bookable[0]);
        setAvailability(await listAvailability(value).catch(() => []));
      })
      .catch(() => setLoadError(t('profile.loadError')));
    isFavorite(profile?.id ?? 'demo-client', id).then(setFav).catch(() => {});
  }, [id, profile?.id, t]);

  async function onToggleFavorite() {
    if (!id) return;
    if (!profile) return router.push('/(auth)/sign-in');
    setFav(await toggleFavorite(profile.id, id));
  }

  function requireAccount() {
    if (profile) return true;
    router.push({ pathname: '/(auth)/sign-in', params: { mode: 'up' } });
    return false;
  }

  function bookOn(date?: Date) {
    if (!trainer || !requireAccount()) return;
    start(trainer, trainer.session_types, selected);
    if (date) update({ scheduledAt: date });
    router.push(`/booking/${trainer.id}`);
  }

  if (!trainer) {
    return (
      <SafeAreaView style={styles.root}>
        {loadError
          ? <View style={styles.center}><EmptyState icon="alert-circle" title={t('profile.unavailable')} subtitle={loadError} actionLabel={t('profile.goBack')} onAction={() => router.back()} /></View>
          : <TrainerProfileSkeleton />}
      </SafeAreaView>
    );
  }

  const firstName = trainer.display_name.split(' ')[0];
  const image = trainer.photos[0] ?? trainer.avatar_url;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          {image
            ? <Image source={{ uri: image.replace('/300', '/900') }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} />
            : <LinearGradient colors={[colors.surfaceHigh, colors.surface]} style={StyleSheet.absoluteFill} />}
          <LinearGradient colors={['rgba(8,9,11,0.08)', 'rgba(8,9,11,0.18)', colors.bg]} locations={[0, 0.46, 1]} style={StyleSheet.absoluteFill} />

          <View style={[styles.heroTop, isRTL && styles.rtlRow]}>
            <IconButton icon={isRTL ? 'chevron-forward' : 'chevron-back'} label={t('profile.goBack')} onPress={() => router.back()} />
            <IconButton icon={fav ? 'heart' : 'heart-outline'} label={fav ? t('profile.removeFavorite') : t('profile.addFavorite')} tint={fav ? colors.primary : colors.white} onPress={onToggleFavorite} />
          </View>

          <View style={styles.heroIdentity}>
            <View style={[styles.badgeRow, isRTL && styles.rtlWrap]}>
              {trainer.verified && <Badge label={t('profile.verified')} tone="brand" icon="checkmark-circle" />}
              {trainer.available_now && <Badge label={t('profile.availableToday')} tone="success" />}
            </View>
            <Txt style={styles.name}>{trainer.display_name}</Txt>
            <Txt style={styles.headline}>{localizeDomain(trainer.headline, locale)}</Txt>
          </View>
        </View>

        <View style={[styles.proofStrip, isRTL && styles.rtlRow]}>
          <Metric value={new Intl.NumberFormat(localeTag, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(trainer.rating)} label={`${new Intl.NumberFormat(localeTag).format(trainer.review_count)} ${t('profile.reviews')}`} icon="star" />
          <View style={styles.metricDivider} />
          <Metric value={new Intl.NumberFormat(localeTag).format(trainer.years_experience)} label={t('profile.yearsCoaching')} icon="ribbon-outline" />
          <View style={styles.metricDivider} />
          <Metric value={locale === 'ar' && (trainer.city ?? 'Riyadh') === 'Riyadh' ? 'الرياض' : trainer.city ?? 'Riyadh'} label={t('profile.localCoach')} icon="location-outline" compact />
        </View>

        <View style={styles.section}>
          <View style={[styles.sectionHead, isRTL && styles.rtlRow]}>
            <View style={{ flex: 1 }}>
              <Txt variant="monoTag">{t('profile.kicker')}</Txt>
              <Txt style={styles.sectionTitle}>{t('profile.whyTrain')} {firstName}{isRTL ? '؟' : '?'}</Txt>
            </View>
            {trainer.video_intro_url && (
              <Pressable onPress={() => setShowVideo(true)} style={styles.playButton}>
                <Ionicons name="play" size={17} color={colors.white} />
              </Pressable>
            )}
          </View>
          {trainer.bio && <Txt variant="body" style={styles.bio}>{localizeDomain(trainer.bio, locale)}</Txt>}
          <View style={[styles.specialties, isRTL && styles.rtlWrap]}>
            {trainer.specialties.map((specialty) => <View key={specialty} style={styles.spec}><Txt style={styles.specText}>{localizeDomain(specialty, locale)}</Txt></View>)}
          </View>
          {trainer.socials && Object.keys(trainer.socials).length > 0 && (
            <View style={[styles.socials, isRTL && styles.rtlWrap]}>
              {trainer.socials.instagram && <SocialButton icon="logo-instagram" handle={trainer.socials.instagram} base="https://instagram.com/" />}
              {trainer.socials.tiktok && <SocialButton icon="logo-tiktok" handle={trainer.socials.tiktok} base="https://tiktok.com/@" />}
              {trainer.socials.x && <SocialButton icon="logo-twitter" handle={trainer.socials.x} base="https://x.com/" />}
              {trainer.socials.youtube && <SocialButton icon="logo-youtube" handle={trainer.socials.youtube} base="https://youtube.com/@" />}
            </View>
          )}
        </View>

        <View style={[styles.promiseCard, isRTL && styles.rtlRow]}>
          <View style={styles.promiseIcon}><Ionicons name="shield-checkmark" size={22} color={colors.success} /></View>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong">{t('profile.protected')}</Txt>
            <Txt variant="caption" style={{ marginTop: 4 }}>{t('profile.protectedCopy')}</Txt>
          </View>
        </View>

        <View style={[styles.tabs, isRTL && styles.rtlRow]}>
          {([{ key: 'plans', label: t('profile.plans') }, { key: 'times', label: t('profile.openTimes') }, { key: 'reviews', label: t('profile.reviews') }] as const).map((item) => (
            <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, tab === item.key && styles.tabOn]}>
              <Txt style={[styles.tabText, tab === item.key && styles.tabTextOn]}>{item.label}</Txt>
            </Pressable>
          ))}
        </View>

        <View style={styles.tabBody}>
          {tab === 'plans' && trainer.session_types.map((session) => {
            const disabled = session.kind === 'subscription' || !session.active;
            const isSelected = !disabled && selected?.id === session.id;
            return (
              <Pressable
                key={session.id}
                onPress={disabled ? undefined : () => setSelected(session)}
                style={[styles.plan, isRTL && styles.rtlRow, isSelected && styles.planOn, disabled && styles.disabled]}
              >
                <View style={[styles.radio, isSelected && styles.radioOn]}>{isSelected && <View style={styles.radioDot} />}</View>
                <View style={{ flex: 1 }}>
                  <View style={[styles.planNameRow, isRTL && styles.rtlWrap]}>
                    <Txt variant="bodyStrong">{localizeDomain(session.name, locale)}</Txt>
                    {disabled ? <Badge label={t('profile.soon')} tone="neutral" /> : session.popular && <Badge label={t('profile.bestFit')} tone="brand" />}
                  </View>
                  <Txt variant="caption" style={{ marginTop: 4 }}>{localizeDomain(session.description, locale)}</Txt>
                </View>
                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Txt style={styles.planPrice}>{formatMoney(session.price)}</Txt>
                  <Txt variant="caption">{session.billing_period === 'mo' ? t('profile.monthly') : t('profile.total')}</Txt>
                </View>
              </Pressable>
            );
          })}

          {tab === 'times' && (
            <View style={styles.slotList}>
              {availability.length === 0
                ? <Card><EmptyState icon="calendar-outline" title={t('profile.noOpenings')} subtitle={tr('Join a private waitlist and see matching Pulse Drops without sharing your identity with the trainer.')} actionLabel={tr('Tune my waitlist')} onAction={() => router.push(`/waitlist/${trainer.id}` as any)} /></Card>
                : availability.slice(0, 12).map((slot) => (
                  <Pressable key={slot.id} disabled={slot.booked} onPress={() => bookOn(new Date(slot.starts_at))} style={[styles.opening, isRTL && styles.rtlRow, slot.booked && styles.disabled]}>
                    <View style={styles.dateTile}>
                      <Txt style={styles.dateDay}>{dayjs(slot.starts_at).locale(locale).format('DD')}</Txt>
                      <Txt style={styles.dateMonth}>{dayjs(slot.starts_at).locale(locale).format('MMM').toUpperCase()}</Txt>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt variant="bodyStrong">{dayjs(slot.starts_at).locale(locale).format('dddd')}</Txt>
                      <Txt variant="caption" style={{ marginTop: 3 }}>{new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(new Date(slot.starts_at))} · {new Intl.NumberFormat(localeTag).format(dayjs(slot.ends_at).diff(dayjs(slot.starts_at), 'minute'))} {t('profile.minutes')}</Txt>
                    </View>
                    {slot.booked ? <Badge label={t('profile.booked')} tone="neutral" /> : <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={18} color={colors.primary} />}
                  </Pressable>
                ))}
            </View>
          )}

          {tab === 'reviews' && (
            trainer.reviews.length === 0
              ? <Card><EmptyState icon="chatbubble-ellipses-outline" title={t('profile.noReviews')} subtitle={t('profile.noReviewsCopy')} /></Card>
              : trainer.reviews.map((review) => (
                <Card key={review.id} style={{ marginBottom: 12 }}>
                  <View style={[styles.reviewTop, isRTL && styles.rtlRow]}>
                    <View style={styles.reviewStars}>{Array.from({ length: 5 }).map((_, index) => <Ionicons key={index} name="star" size={13} color={index < review.rating ? colors.primary : colors.surfaceHigh} />)}</View>
                    <Badge label={t('profile.verifiedSession')} tone="neutral" icon="checkmark-circle" />
                  </View>
                  {review.comment && <Txt variant="body" style={{ marginTop: 12 }}>“{review.comment}”</Txt>}
                </Card>
              ))
          )}
        </View>
      </ScrollView>

      {trainer.video_intro_url && <VideoPlayerModal visible={showVideo} uri={trainer.video_intro_url} onClose={() => setShowVideo(false)} />}

      <View style={[styles.cta, isRTL && styles.rtlRow]}>
        <View>
          <Txt variant="caption">{selected?.kind === 'pack' ? t('profile.selectedPack') : t('profile.perSession')}</Txt>
          <Txt style={styles.ctaPrice}>{formatMoney(selected?.price ?? trainer.base_price)}</Txt>
        </View>
        <Button title={selected ? `${t('profile.trainWith')} ${firstName}` : t('profile.selectPlan')} onPress={() => bookOn()} disabled={!selected} fullWidth={false} style={[styles.ctaButton, isRTL && { marginLeft: 0, marginRight: 16 }]} />
      </View>
    </SafeAreaView>
  );
}

function IconButton({ icon, label, onPress, tint }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; tint?: string }) {
  return <Pressable accessibilityLabel={label} onPress={onPress} style={styles.iconButton}><Ionicons name={icon} size={20} color={tint ?? colors.white} /></Pressable>;
}

function Metric({ value, label, icon, compact }: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap; compact?: boolean }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricValueRow}><Ionicons name={icon} size={14} color={colors.primary} /><Txt style={[styles.metricValue, compact && { fontSize: 14 }]} numberOfLines={1}>{value}</Txt></View>
      <Txt style={styles.metricLabel}>{label}</Txt>
    </View>
  );
}

function SocialButton({ icon, handle, base }: { icon: keyof typeof Ionicons.glyphMap; handle: string; base: string }) {
  const clean = handle.replace(/^@/, '').trim();
  return (
    <Pressable onPress={() => Linking.openURL(`${base}${encodeURIComponent(clean)}`)} style={styles.socialButton}>
      <Ionicons name={icon} size={15} color={colors.textSecondary} />
      <Txt style={styles.socialText}>@{clean}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 132 },
  hero: { height: 390, justifyContent: 'space-between', overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8 },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,9,11,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  heroIdentity: { paddingHorizontal: 22, paddingBottom: 22 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  name: { fontFamily: fonts.extrabold, fontSize: 35, lineHeight: 39, letterSpacing: -1.4, color: colors.textPrimary },
  headline: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary, marginTop: 5 },
  proofStrip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 22, marginTop: 4, paddingVertical: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.xl },
  metric: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
  metricValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  metricValue: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary },
  metricLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.textDim, marginTop: 3 },
  metricDivider: { width: 1, height: 30, backgroundColor: colors.border },
  section: { paddingHorizontal: 22, marginTop: 28 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 23, lineHeight: 28, letterSpacing: -0.7, color: colors.textPrimary, marginTop: 7 },
  playButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  bio: { marginTop: 14 },
  specialties: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  spec: { backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  specText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primaryLight },
  socials: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  socialButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  socialText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textSecondary },
  promiseCard: { flexDirection: 'row', alignItems: 'center', gap: 13, marginHorizontal: 22, marginTop: 24, padding: 16, backgroundColor: colors.successTint, borderWidth: 1, borderColor: 'rgba(59,209,111,0.2)', borderRadius: radius.xl },
  promiseIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(59,209,111,0.12)', alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', marginHorizontal: 22, marginTop: 28, padding: 4, backgroundColor: colors.surface, borderRadius: radius.lg },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  tabOn: { backgroundColor: colors.surfaceHigh },
  tabText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textDim },
  tabTextOn: { color: colors.textPrimary },
  tabBody: { paddingHorizontal: 22, marginTop: 14 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 94, padding: 16, marginBottom: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.xl },
  planOn: { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder },
  disabled: { opacity: 0.44 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.textFaint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  planNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  planPrice: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.textPrimary },
  slotList: { gap: 10 },
  opening: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.xl },
  dateTile: { width: 52, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint, borderRadius: radius.md },
  dateDay: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.textPrimary },
  dateMonth: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 0.7, color: colors.primary },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 28, backgroundColor: 'rgba(17,19,24,0.98)', borderTopWidth: 1, borderTopColor: colors.border },
  ctaPrice: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.textPrimary },
  ctaButton: { flex: 1, marginLeft: 16 },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  rtlWrap: { direction: 'ltr', flexDirection: 'row-reverse' },
});
