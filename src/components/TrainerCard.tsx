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
          <Photo uri={trainer.photos[0] ?? trainer.avatar_url} height={72} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Txt variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>{trainer.display_name}</Txt>
            {trainer.verified && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
          </View>
          <Txt variant="caption" numberOfLines={1}>{trainer.headline}</Txt>
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
      <View>
        <Photo uri={trainer.photos[0] ?? trainer.avatar_url} height={148} />
        {trainer.available_now && (
          <Badge label="AVAILABLE NOW" tone="success" style={styles.availBadge} />
        )}
      </View>
      <View style={styles.wideBody}>
        <View style={styles.rowTop}>
          <Txt variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>{trainer.display_name}</Txt>
          {trainer.verified && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
        </View>
        <Txt variant="caption" numberOfLines={1}>{trainer.headline}</Txt>
        <View style={styles.chipRow}>
          {trainer.specialties.slice(0, 2).map((s) => (
            <View key={s} style={styles.miniChip}><Txt style={styles.miniChipTxt}>{s}</Txt></View>
          ))}
        </View>
        <View style={styles.rowMeta}>
          {rating}
          <Txt style={styles.price}>{formatMoney(shownPrice)}<Txt variant="caption"> {periodLabel}</Txt></Txt>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },
  wide: {
    width: 216,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    overflow: 'hidden',
  },
  availBadge: { position: 'absolute', top: 10, left: 10 },
  wideBody: { padding: 13, paddingBottom: 14 },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 9, flexWrap: 'wrap' },
  miniChip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  miniChipTxt: { fontFamily: fonts.medium, fontSize: 10, color: colors.textMuted },
  rowMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary },
  price: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 10,
  },
  rowThumb: { width: 72, height: 72, borderRadius: radius.md, overflow: 'hidden' },
  rowBody: { flex: 1, justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
