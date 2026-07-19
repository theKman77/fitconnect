import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { Txt } from './ui/Txt';
import { Badge } from './ui/Badge';
import type { Trainer } from '@/types/domain';
import { useLocale } from '@/context/locale';

interface Props {
  trainer: Trainer;
  onPress: () => void;
  variant?: 'wide' | 'row';
  /** Override the displayed price (e.g. monthly plan price). */
  priceOverride?: number;
  /** Label after the price, defaults to "/ session". */
  periodLabel?: string;
}

function Photo({ uri, height }: { uri?: string | null; height: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ height }} contentFit="cover" transition={150} />;
  }
  return (
    <LinearGradient colors={[colors.surfaceHigh, colors.surfaceElevated]} style={{ height, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="fitness" size={28} color={colors.textFaint} />
    </LinearGradient>
  );
}

export function TrainerCard({ trainer, onPress, variant = 'wide', priceOverride, periodLabel }: Props) {
  const { localeTag, isRTL, t } = useLocale();
  const shownPrice = priceOverride ?? trainer.base_price;
  const shownPeriod = periodLabel ?? t('trainer.perSession');
  const rtlRow = isRTL ? styles.rtlRow : undefined;
  const rating = (
    <View style={[styles.ratingRow, rtlRow]}>
      <Ionicons name="star" size={13} color={colors.primary} />
      <Txt style={styles.rating}>{new Intl.NumberFormat(localeTag, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(trainer.rating)}</Txt>
      <Txt variant="caption"> ({new Intl.NumberFormat(localeTag).format(trainer.review_count)})</Txt>
    </View>
  );

  if (variant === 'row') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, rtlRow, pressed && styles.pressed]}>
        <View style={styles.rowThumb}>
          <Photo uri={trainer.photos[0] ?? trainer.avatar_url} height={88} />
        </View>
        <View style={styles.rowBody}>
          <View style={[styles.rowTop, rtlRow]}>
            <Txt variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>{trainer.display_name}</Txt>
            {trainer.verified && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
          </View>
          <Txt variant="caption" numberOfLines={1} style={{ marginTop: 3 }}>{trainer.headline}</Txt>
          <View style={[styles.rowMeta, rtlRow]}>
            {rating}
            <Txt style={styles.price}>{formatMoney(shownPrice)}<Txt variant="caption"> {shownPeriod}</Txt></Txt>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wide, pressed && styles.pressed]}>
      <View style={styles.photoWrap}>
        <Photo uri={trainer.photos[0] ?? trainer.avatar_url} height={174} />
        <LinearGradient colors={['transparent', 'rgba(8,9,11,0.88)']} style={styles.photoShade} />
        {trainer.available_now && (
          <Badge label={t('trainer.available')} tone="success" style={[styles.availBadge, isRTL && styles.availBadgeRTL]} />
        )}
        <View style={[styles.photoRating, isRTL && styles.photoRatingRTL]}>{rating}</View>
      </View>
      <View style={styles.wideBody}>
        <View style={[styles.rowTop, rtlRow]}>
          <Txt variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>{trainer.display_name}</Txt>
          {trainer.verified && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
        </View>
        <Txt variant="caption" numberOfLines={1} style={{ marginTop: 3 }}>{trainer.headline}</Txt>
        <View style={[styles.rowMeta, rtlRow]}>
          <Txt style={styles.specialty}>{trainer.specialties[0] ?? t('trainer.personalTraining')}</Txt>
          <Txt style={styles.price}>{formatMoney(shownPrice)}<Txt variant="caption"> {shownPeriod}</Txt></Txt>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  pressed: { opacity: 0.94, transform: [{ scale: 0.988 }] },
  wide: {
    width: 248,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  photoWrap: { position: 'relative' },
  photoShade: { ...StyleSheet.absoluteFillObject, top: '45%' },
  photoRating: { position: 'absolute', left: 13, bottom: 11 },
  photoRatingRTL: { left: undefined, right: 13 },
  availBadge: { position: 'absolute', top: 12, left: 12 },
  availBadgeRTL: { left: undefined, right: 12 },
  wideBody: { padding: 15, paddingBottom: 16 },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 9, flexWrap: 'wrap' },
  miniChip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  miniChipTxt: { fontFamily: fonts.medium, fontSize: 10, color: colors.textMuted },
  rowMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13, gap: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary },
  price: { fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  specialty: { flex: 1, fontFamily: fonts.medium, fontSize: 10, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.7 },
  row: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    borderRadius: radius.xxl,
    padding: 9,
  },
  rowThumb: { width: 88, height: 88, borderRadius: radius.lg, overflow: 'hidden' },
  rowBody: { flex: 1, justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
