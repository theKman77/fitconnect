import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { Txt } from './ui/Txt';
import { Badge } from './ui/Badge';
import type { Trainer } from '@/types/domain';

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

export function TrainerCard({ trainer, onPress, variant = 'wide', priceOverride, periodLabel = '/ session' }: Props) {
  const shownPrice = priceOverride ?? trainer.base_price;
  const rating = (
    <View style={styles.ratingRow}>
      <Ionicons name="star" size={13} color={colors.primary} />
      <Txt style={styles.rating}>{trainer.rating.toFixed(1)}</Txt>
      <Txt variant="caption"> ({trainer.review_count})</Txt>
    </View>
  );

  if (variant === 'row') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.rowThumb}>
          <Photo uri={trainer.photos[0] ?? trainer.avatar_url} height={88} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Txt variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>{trainer.display_name}</Txt>
            {trainer.verified && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
          </View>
          <Txt variant="caption" numberOfLines={1} style={{ marginTop: 3 }}>{trainer.headline}</Txt>
          <View style={styles.rowMeta}>
            {rating}
            <Txt style={styles.price}>{formatMoney(shownPrice)}<Txt variant="caption"> {periodLabel}</Txt></Txt>
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
          <Badge label="AVAILABLE" tone="success" style={styles.availBadge} />
        )}
        <View style={styles.photoRating}>{rating}</View>
      </View>
      <View style={styles.wideBody}>
        <View style={styles.rowTop}>
          <Txt variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>{trainer.display_name}</Txt>
          {trainer.verified && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
        </View>
        <Txt variant="caption" numberOfLines={1} style={{ marginTop: 3 }}>{trainer.headline}</Txt>
        <View style={styles.rowMeta}>
          <Txt style={styles.specialty}>{trainer.specialties[0] ?? 'Personal training'}</Txt>
          <Txt style={styles.price}>{formatMoney(shownPrice)}<Txt variant="caption"> {periodLabel}</Txt></Txt>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  availBadge: { position: 'absolute', top: 12, left: 12 },
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
