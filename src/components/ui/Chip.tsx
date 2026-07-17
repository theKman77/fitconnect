import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, fonts, radius } from '@/theme';
import { Txt } from './Txt';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

/** Selectable pill used for goals, injuries, filters, tags. */
export function Chip({ label, selected, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.unselected, style]}
    >
      <Txt
        style={[
          styles.label,
          { color: selected ? colors.white : colors.textSecondary },
        ]}
      >
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  unselected: { backgroundColor: colors.surface, borderColor: colors.border },
  label: { fontFamily: fonts.semibold, fontSize: 14 },
});
