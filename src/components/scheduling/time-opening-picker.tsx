import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/theme';
import { Txt } from '@/components/ui/Txt';
import { useLocale } from '@/context/locale';

export interface TimeOpening {
  key: string;
  label: string;
  hour: number;
  minute?: number;
  active?: boolean;
  disabled?: boolean;
  busy?: boolean;
  peak?: boolean;
}

interface Props {
  options: TimeOpening[];
  onPress: (option: TimeOpening) => void;
  multiple?: boolean;
  emptyMessage?: string;
}

const PERIODS = [
  { key: 'morning', labelKey: 'schedule.morning', hintKey: 'schedule.morningHint', icon: 'sunny-outline', match: (hour: number) => hour < 12 },
  { key: 'afternoon', labelKey: 'schedule.afternoon', hintKey: 'schedule.afternoonHint', icon: 'partly-sunny-outline', match: (hour: number) => hour >= 12 && hour < 17 },
  { key: 'evening', labelKey: 'schedule.evening', hintKey: 'schedule.eveningHint', icon: 'moon-outline', match: (hour: number) => hour >= 17 },
] as const;

/** Grouped time openings with roomy two-column targets and explicit states. */
export function TimeOpeningPicker({ options, onPress, multiple = false, emptyMessage = 'No openings on this day.' }: Props) {
  const { localeTag, isRTL, t } = useLocale();
  if (options.length === 0) {
    return <View style={styles.empty}><Ionicons name="time-outline" size={20} color={colors.textFaint} /><Txt variant="caption">{emptyMessage === 'No openings on this day.' ? t('schedule.empty') : emptyMessage}</Txt></View>;
  }

  return (
    <View style={styles.periods}>
      {PERIODS.map((period) => {
        const periodOptions = options.filter((option) => period.match(option.hour));
        if (!periodOptions.length) return null;
        return (
          <View key={period.key} style={styles.period}>
            <View style={[styles.periodHead, isRTL && Platform.OS !== 'web' && { flexDirection: 'row-reverse' }]}>
              <View style={styles.periodIcon}><Ionicons name={period.icon} size={15} color={colors.primary} /></View>
              <Txt style={styles.periodLabel}>{t(period.labelKey)}</Txt>
              <Txt style={styles.periodHint}>{t(period.hintKey)}</Txt>
            </View>
            <View style={[styles.grid, isRTL && Platform.OS !== 'web' && { flexDirection: 'row-reverse' }]}>
              {periodOptions.map((option) => {
                const displayTime = new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' })
                  .format(new Date(2020, 0, 1, option.hour, option.minute ?? 0));
                return (
                <Pressable
                  key={option.key}
                  disabled={option.disabled || option.busy}
                  onPress={() => onPress(option)}
                  accessibilityLabel={displayTime}
                  accessibilityState={{ selected: option.active, disabled: option.disabled || option.busy }}
                  style={({ pressed }) => [styles.option, isRTL && Platform.OS !== 'web' && { flexDirection: 'row-reverse' }, option.active && styles.optionActive, (option.disabled || option.busy) && styles.optionDisabled, pressed && styles.pressed]}
                >
                  <View style={[styles.selection, option.active && styles.selectionActive]}>
                    {option.active && <Ionicons name={multiple ? 'checkmark' : 'ellipse'} size={multiple ? 13 : 8} color={colors.primary} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt style={[styles.time, option.active && styles.timeActive]}>{displayTime}</Txt>
                    <Txt style={[styles.meta, option.active && styles.metaActive]}>{option.busy ? t('schedule.saving') : option.disabled ? t('schedule.unavailable') : option.peak ? t('schedule.popular') : t('schedule.available')}</Txt>
                  </View>
                  {option.peak && !option.disabled && <Ionicons name="trending-up" size={14} color={option.active ? colors.primary : colors.warm} />}
                </Pressable>
              );})}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  periods: { gap: 17 },
  period: { gap: 9 },
  periodHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  periodIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  periodLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.textPrimary },
  periodHint: { flex: 1, textAlign: 'right', fontFamily: fonts.regular, fontSize: 9, color: colors.textDim },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  option: { width: '48%', flexGrow: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
  optionActive: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
  optionDisabled: { opacity: 0.34 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  selection: { width: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.textFaint },
  selectionActive: { backgroundColor: colors.white, borderColor: colors.white },
  time: { fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  timeActive: { color: colors.textPrimary },
  meta: { fontFamily: fonts.medium, fontSize: 8, color: colors.textDim, marginTop: 3 },
  metaActive: { color: colors.primaryLight },
  empty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 86, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
});
