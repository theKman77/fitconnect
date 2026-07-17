import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { Txt } from './Txt';
import { Button } from './Button';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Standard empty/error state with an optional call-to-action. */
export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Txt variant="cardTitle" center style={{ marginTop: 14 }}>{title}</Txt>
      {subtitle && <Txt variant="caption" center style={{ marginTop: 6, maxWidth: 260 }}>{subtitle}</Txt>}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} fullWidth={false} style={styles.btn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 24 },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  btn: { marginTop: 18, paddingHorizontal: 24, height: 46 },
});
