import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '@/theme';

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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  padded: { padding: 16 },
  pressed: { opacity: 0.9 },
  selectedRing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.lg,
  },
});
