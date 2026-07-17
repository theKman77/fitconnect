import { StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/theme';
import { Txt } from './Txt';

type Tone = 'brand' | 'success' | 'neutral' | 'danger';

interface Props {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  brand: { bg: colors.primaryTint, fg: colors.primary, border: colors.primaryBorder },
  success: { bg: colors.successTint, fg: colors.success, border: 'rgba(59,209,111,0.3)' },
  neutral: { bg: colors.surfaceElevated, fg: colors.textMuted, border: colors.border },
  danger: { bg: colors.dangerTint, fg: colors.danger, border: 'rgba(230,40,40,0.35)' },
};

/** Small status pill: verified badge, "Available now", "Peak", etc. */
export function Badge({ label, tone = 'neutral', icon, style }: Props) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      {icon && <Ionicons name={icon} size={11} color={t.fg} style={{ marginRight: 4 }} />}
      <Txt style={[styles.label, { color: t.fg }]}>{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.6 },
});
