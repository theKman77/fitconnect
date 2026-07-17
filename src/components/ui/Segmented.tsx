import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radius } from '@/theme';
import { Txt } from './Txt';

interface Props<T extends string> {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}

/** Pill segmented control (e.g. Book instantly / Subscriptions). */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.track}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.seg, active && styles.segActive]}
          >
            <Txt style={[styles.label, { color: active ? colors.white : colors.textMuted }]}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 4,
  },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.md },
  segActive: { backgroundColor: colors.primary },
  label: { fontFamily: fonts.semibold, fontSize: 14 },
});
