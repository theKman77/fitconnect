import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ar';
import { colors, fonts, radius } from '@/theme';
import { Txt } from '@/components/ui/Txt';
import { useLocale } from '@/context/locale';

interface Props {
  selected: Dayjs;
  onSelect: (date: Dayjs) => void;
  countForDate?: (date: Dayjs) => number;
  disabledForDate?: (date: Dayjs) => boolean;
  rangeDays?: number;
  maxDaysAhead?: number;
}

/** A paged, two-week grid used everywhere a session date is chosen. */
export function DateRangePicker({
  selected,
  onSelect,
  countForDate,
  disabledForDate,
  rangeDays = 14,
  maxDaysAhead = 56,
}: Props) {
  const { locale, isRTL, t } = useLocale();
  const today = dayjs().startOf('day');
  const selectedOffset = Math.max(0, selected.startOf('day').diff(today, 'day'));
  const selectedPage = Math.floor(selectedOffset / rangeDays);
  const lastPage = Math.max(0, Math.floor((maxDaysAhead - 1) / rangeDays));
  const [pageIndex, setPageIndex] = useState(() => Math.min(lastPage, selectedPage));
  const pageStart = today.add(pageIndex * rangeDays, 'day');

  useEffect(() => {
    setPageIndex(Math.min(lastPage, selectedPage));
  }, [lastPage, selectedPage]);

  // Paging is independent from selection so users can move past a fully booked
  // fortnight and inspect later openings without selecting a disabled date.
  const move = (direction: -1 | 1) => {
    setPageIndex((current) => Math.max(0, Math.min(lastPage, current + direction)));
  };

  const dates = Array.from({ length: rangeDays }, (_, index) => pageStart.add(index, 'day'));
  const rangeEnd = dates[dates.length - 1];
  const selectedVisible = !selected.startOf('day').isBefore(pageStart) && !selected.startOf('day').isAfter(rangeEnd);
  const localizedStart = pageStart.locale(locale);
  const localizedEnd = rangeEnd.locale(locale);
  const rangeLabel = pageStart.isSame(rangeEnd, 'month')
    ? `${localizedStart.format('MMMM D')} - ${localizedEnd.format('D, YYYY')}`
    : `${localizedStart.format('MMM D')} - ${localizedEnd.format('MMM D, YYYY')}`;

  return (
    <View style={styles.shell}>
      <View style={[styles.header, isRTL && Platform.OS !== 'web' && { flexDirection: 'row-reverse' }]}>
        <View style={{ flex: 1 }}>
          <Txt style={styles.selectedLabel}>{selectedVisible ? selected.locale(locale).format('dddd، D MMMM') : t('schedule.chooseDate')}</Txt>
          <Txt style={styles.rangeLabel}>{rangeLabel}</Txt>
        </View>
        <View style={[styles.pager, isRTL && Platform.OS !== 'web' && { flexDirection: 'row-reverse' }]}>
          <PagerButton icon={isRTL ? 'chevron-forward' : 'chevron-back'} disabled={pageIndex === 0} label={t('schedule.previous')} onPress={() => move(-1)} />
          <PagerButton icon={isRTL ? 'chevron-back' : 'chevron-forward'} disabled={pageIndex >= lastPage} label={t('schedule.next')} onPress={() => move(1)} />
        </View>
      </View>

      <View style={[styles.grid, isRTL && Platform.OS !== 'web' && { flexDirection: 'row-reverse' }]}>
        {dates.map((date) => {
          const active = date.isSame(selected, 'day');
          const disabled = !!disabledForDate?.(date);
          const count = countForDate?.(date) ?? 0;
          const todayCell = date.isSame(today, 'day');
          return (
            <Pressable
              key={date.format('YYYY-MM-DD')}
              disabled={disabled}
              onPress={() => onSelect(date)}
              accessibilityLabel={`${date.locale(locale).format('dddd، D MMMM')}${count ? `, ${count}` : ''}`}
              accessibilityState={{ selected: active, disabled }}
              style={({ pressed }) => [styles.day, active && styles.dayActive, disabled && styles.dayDisabled, pressed && !disabled && styles.pressed]}
            >
              <Txt style={[styles.weekday, active && styles.activeText]}>{date.locale(locale).format('dd').toUpperCase()}</Txt>
              <Txt style={[styles.number, active && styles.activeText]}>{date.format('D')}</Txt>
              {count > 0
                ? <View style={[styles.count, active && styles.countActive]}><Txt style={[styles.countText, active && { color: colors.primary }]}>{count}</Txt></View>
                : <View style={[styles.dot, todayCell && styles.dotToday, active && styles.dotActive]} />}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.legend, isRTL && Platform.OS !== 'web' && { flexDirection: 'row-reverse' }]}>
        <View style={styles.legendItem}><View style={styles.legendDot} /><Txt style={styles.legendText}>{t('schedule.openingsLegend')}</Txt></View>
        <Txt style={styles.legendText}>{t('schedule.moreDates')}</Txt>
      </View>
    </View>
  );
}

function PagerButton({ icon, disabled, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; disabled: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} accessibilityLabel={label} onPress={onPress} style={[styles.pagerButton, disabled && { opacity: 0.3 }]}>
      <Ionicons name={icon} size={18} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { padding: 15, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14 },
  selectedLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  rangeLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textDim, marginTop: 3 },
  pager: { flexDirection: 'row', gap: 7 },
  pagerButton: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: { width: '13%', minHeight: 67, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: radius.md, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderSubtle },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayDisabled: { opacity: 0.28 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  weekday: { fontFamily: fonts.monoBold, fontSize: 8, color: colors.textDim },
  number: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  activeText: { color: colors.white },
  count: { minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTintStrong },
  countActive: { backgroundColor: colors.white },
  countText: { fontFamily: fonts.bold, fontSize: 8, color: colors.primaryLight, fontVariant: ['tabular-nums'] },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textFaint },
  dotToday: { backgroundColor: colors.primary },
  dotActive: { backgroundColor: colors.white },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 11 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  legendText: { fontFamily: fonts.medium, fontSize: 8, color: colors.textDim },
});
