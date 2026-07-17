import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '@/theme';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  round?: boolean;
  style?: ViewStyle;
}

/** Pulsing placeholder block shown while content loads. */
export function Skeleton({ width = '100%', height = 16, round, style }: Props) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: round ? height / 2 : radius.sm, opacity: pulse },
        style,
      ]}
    />
  );
}

/** Skeleton shaped like a trainer row card. */
export function TrainerRowSkeleton() {
  return (
    <View style={styles.rowCard}>
      <Skeleton width={72} height={72} style={{ borderRadius: radius.md }} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="60%" height={15} />
        <Skeleton width="85%" height={11} />
        <Skeleton width="40%" height={11} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surfaceHigh },
  rowCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 10,
    alignItems: 'center',
  },
});
