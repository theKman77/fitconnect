import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/theme';
import { Txt } from './Txt';
import { useLocale } from '@/context/locale';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title, onPress, variant = 'primary', disabled, loading, icon, fullWidth = true, style,
}: Props) {
  const { isRTL } = useLocale();
  const isPrimary = variant === 'primary';
  const content = (
    <View style={[styles.row, isRTL && { flexDirection: 'row-reverse' }]}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.textPrimary} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={isPrimary ? colors.white : textColor(variant)}
              style={[
                isRTL ? { marginLeft: 8 } : { marginRight: 8 },
                isRTL && (icon === 'arrow-forward' || icon === 'chevron-forward') ? { transform: [{ scaleX: -1 }] } : null,
              ]}
            />
          )}
          <Txt style={[styles.label, { color: isPrimary ? colors.white : textColor(variant) }]}>
            {title}
          </Txt>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[colors.primaryLight, colors.primary, colors.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

function textColor(v: Variant): string {
  if (v === 'danger') return colors.danger;
  if (v === 'ghost') return colors.textMuted;
  return colors.textPrimary;
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.primary,
  },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontFamily: fonts.bold, fontSize: 15, letterSpacing: -0.1 },
  secondary: { backgroundColor: colors.surfaceElevated, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.dangerTint, borderWidth: 1, borderColor: colors.danger },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
});
