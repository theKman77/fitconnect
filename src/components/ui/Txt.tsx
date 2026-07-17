import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { colors, typography } from '@/theme';
import { useAccessibility } from '@/context/accessibility';

type Variant = keyof typeof typography;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

/** High-contrast mode lifts each muted tone one step brighter. */
const CONTRAST_LIFT: Record<string, string> = {
  [colors.textFaint]: colors.textMuted,
  [colors.textDim]: colors.textSecondary,
  [colors.textMuted]: colors.textSecondary,
  [colors.textSecondary]: colors.textPrimary,
};

/**
 * Themed text. Applies the user's accessibility preferences globally:
 * large text scales every font size; high contrast brightens muted tones.
 */
export function Txt({ variant = 'body', color, center, style, ...rest }: Props) {
  const { largeText, highContrast } = useAccessibility();

  const flat = StyleSheet.flatten([
    typography[variant],
    color ? { color } : null,
    center ? styles.center : null,
    style,
  ]) as TextStyle;

  if (largeText && typeof flat.fontSize === 'number') {
    flat.fontSize = Math.round(flat.fontSize * 1.18);
    if (typeof flat.lineHeight === 'number') flat.lineHeight = Math.round(flat.lineHeight * 1.18);
  }
  if (highContrast && typeof flat.color === 'string' && CONTRAST_LIFT[flat.color]) {
    flat.color = CONTRAST_LIFT[flat.color];
  }

  return <Text {...rest} style={flat} />;
}

const styles = StyleSheet.create({ center: { textAlign: 'center' } });
