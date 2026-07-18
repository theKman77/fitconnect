import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadow } from '@/theme';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padded?: boolean;
  selected?: boolean;
}

/** Standard surface card. Renders as a Pressable when `onPress` is provided. */
export function Card({ children, onPress, style, padded = true, selected }: Props) {
  const base = [styles.card, padded && styles.padded, style];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && styles.pressed]}>
        {children}
        {selected ? <View style={styles.selectedRing} pointerEvents="none" /> : null}
      </Pressable>
    );
  }
  return (
    <View style={base}>
      {children}
      {selected ? <View style={styles.selectedRing} pointerEvents="none" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.card,
  },
  padded: { padding: 18 },
  pressed: { opacity: 0.94, transform: [{ scale: 0.992 }] },
  selectedRing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.xl,
  },
});
