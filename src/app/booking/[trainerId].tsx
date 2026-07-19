import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { colors, fonts, radius } from '@/theme';
import { config, formatMoney } from '@/lib/config';
import { useBooking } from '@/context/booking';
import { useAuth } from '@/context/auth';
import { cancelBooking, createBooking } from '@/lib/bookings';
import { listAvailability } from '@/lib/trainer';
import { payForBooking } from '@/lib/payments';
import { Badge, Button, Card, Txt } from '@/components/ui';
import { Segmented } from '@/components/ui/Segmented';
import { DateRangePicker } from '@/components/scheduling/date-range-picker';
import { TimeOpeningPicker, type TimeOpening } from '@/components/scheduling/time-opening-picker';
import type { AvailabilitySlot } from '@/types/domain';
import { useLocale } from '@/context/locale';
import { localizeDomain } from '@/lib/localize-domain';

const STEP_KEYS = ['booking.planStep', 'booking.detailsStep', 'booking.whenStep', 'booking.reviewStep'] as const;
const EQUIPMENT = ['Resistance bands', 'Yoga mat', 'Dumbbells', 'Kettlebell', 'Jump rope'];
const ARABIC_EQUIPMENT: Record<string, string> = {
  'Resistance bands': 'أشرطة مقاومة',
  'Yoga mat': 'حصيرة تمارين',
  Dumbbells: 'أوزان يدوية',
  Kettlebell: 'كرة حديدية',
  'Jump rope': 'حبل قفز',
};
const TIME_SLOTS = [
  { label: '7:00 AM', hour: 7, minute: 0, peak: false }, { label: '9:00 AM', hour: 9, minute: 0, peak: false },
  { label: '12:00 PM', hour: 12, minute: 0, peak: false }, { label: '3:00 PM', hour: 15, minute: 0, peak: false },
  { label: '6:00 PM', hour: 18, minute: 0, peak: true }, { label: '7:30 PM', hour: 19, minute: 30, peak: true },
];
export default function BookingFlow() {
  const router = useRouter();
  const { profile } = useAuth();
  const { draft, update, price } = useBooking();
  const { locale, localeTag, isRTL, t } = useLocale();
  const steps = STEP_KEYS.map(t);
  const [step, setStep] = useState(0);
  const [slot, setSlot] = useState<string | null>(() => draft.scheduledAt ? dayjs(draft.scheduledAt).format('h:mm A') : null);
  const [paying, setPaying] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);

  const trainer = draft.trainer;

  useEffect(() => {
    if (!trainer) return;
    listAvailability(trainer).then(setAvailability).catch(() => setPayError(t('booking.availabilityError')));
  }, [trainer?.id, t]);

  if (!trainer) {
    return <SafeAreaView style={styles.root}><View style={styles.center}><Txt>{t('booking.startProfile')}</Txt></View></SafeAreaView>;
  }

  const canNext =
    step === 0 ? !!draft.sessionType && draft.sessionType.kind !== 'subscription' :
    step === 2 ? !!draft.scheduledAt && !!slot && (draft.format === 'virtual' || (!!draft.addressLine.trim() && !!draft.city.trim())) :
    true;
  const nextHint = step === 0 && !draft.sessionType
    ? t('booking.choosePlanHint')
    : step === 2 && (!draft.scheduledAt || !slot)
      ? t('booking.chooseTimeHint')
      : step === 2 && draft.format !== 'virtual' && (!draft.addressLine.trim() || !draft.city.trim())
        ? t('booking.addressHint')
        : null;
  const firstOpening = availability.find((opening) => !opening.booked);
  const selectedDate = draft.scheduledAt
    ? dayjs(draft.scheduledAt).startOf('day')
    : firstOpening
      ? dayjs(firstOpening.starts_at).startOf('day')
      : dayjs().startOf('day');
  const publishedForDay = availability.filter((opening) => dayjs(opening.starts_at).isSame(selectedDate, 'day'));
  const timeOptions: TimeOpening[] = availability.length > 0
    ? publishedForDay.map((opening) => {
        const openingTime = dayjs(opening.starts_at);
        return {
          key: opening.id,
          label: openingTime.format('h:mm A'),
          hour: openingTime.hour(),
          minute: openingTime.minute(),
          active: !!draft.scheduledAt && openingTime.isSame(dayjs(draft.scheduledAt), 'minute'),
          disabled: opening.booked,
          peak: opening.is_peak,
        };
      })
    : TIME_SLOTS.map((option) => {
        const openingTime = selectedDate.hour(option.hour).minute(option.minute).second(0);
        return {
          key: option.label,
          label: option.label,
          hour: option.hour,
          minute: option.minute,
          active: slot === option.label,
          disabled: openingTime.isBefore(dayjs().add(30, 'minute')),
          peak: option.peak,
        };
      });

  async function next() {
    if (step < steps.length - 1) return setStep(step + 1);
    // Final: create booking + pay
    setPaying(true);
    setPayError(null);
    try {
      const booking = await createBooking(draft, price, profile?.id ?? 'demo-client');
      const res = await payForBooking(booking.id);
      if (res.ok) {
        router.replace({ pathname: '/booking/confirmation', params: { bookingId: booking.id, simulated: res.simulated ? '1' : '0' } });
      } else if (!res.cancelled) {
        setPayError(res.error ?? t('booking.paymentError'));
        await cancelBooking(booking.id).catch(() => {});
      } else {
        await cancelBooking(booking.id).catch(() => {});
      }
    } catch (e: any) {
      setPayError(e?.message ?? t('booking.createError'));
    } finally {
      setPaying(false);
    }
  }

  function toggleEquip(item: string) {
    const has = draft.equipmentItems.includes(item);
    update({ equipmentItems: has ? draft.equipmentItems.filter((i) => i !== item) : [...draft.equipmentItems, item] });
  }

  function pickDate(d: dayjs.Dayjs) {
    // Preserve the chosen time slot (if any) on the new date.
    const cur = draft.scheduledAt ? dayjs(draft.scheduledAt) : null;
    const next = d.hour(cur?.hour() ?? 0).minute(cur?.minute() ?? 0).second(0);
    if (availability.length > 0) setSlot(null);
    update({ scheduledAt: next.toDate() });
  }

  function pickSlot(s: (typeof TIME_SLOTS)[number]) {
    setSlot(s.label);
    const base = draft.scheduledAt ? dayjs(draft.scheduledAt) : dayjs();
    update({ isPeak: s.peak, scheduledAt: base.hour(s.hour).minute(s.minute).second(0).toDate() });
  }

  function pickPublishedSlot(s: AvailabilitySlot) {
    setSlot(dayjs(s.starts_at).format('h:mm A'));
    const start = dayjs(s.starts_at);
    update({ isPeak: s.is_peak, scheduledAt: start.toDate() });
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Booking context + progress */}
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Pressable onPress={() => (step === 0 ? router.back() : setStep(step - 1))} hitSlop={10} style={styles.backButton} accessibilityLabel={t('booking.previous')}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt variant="monoTag">{t('booking.with')}</Txt>
          <Txt variant="bodyStrong" numberOfLines={1} style={{ marginTop: 2 }}>{trainer.display_name}</Txt>
        </View>
        <View style={styles.stepBubble}><Txt style={styles.stepBubbleText}>{new Intl.NumberFormat(localeTag).format(step + 1)}/{new Intl.NumberFormat(localeTag).format(steps.length)}</Txt></View>
      </View>
      <View style={styles.track}>
        {steps.map((label, index) => (
          <View key={label} style={[styles.trackSegment, index <= step && styles.trackSegmentOn]} />
        ))}
      </View>
      <Txt variant="mono" style={styles.stepLabel}>{steps[step].toUpperCase()}</Txt>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {step === 0 && (
          <>
            <Txt variant="screenTitle">{t('booking.howTrain')}</Txt>
            <View style={{ marginTop: 18 }}>
              <Segmented
                options={[{ key: 'in_person', label: t('booking.inPerson') }, { key: 'virtual', label: t('booking.virtual') }]}
                value={draft.format}
                onChange={(v) => update({ format: v })}
              />
            </View>
            <Txt variant="sectionTitle" style={{ marginTop: 26, marginBottom: 12 }}>{t('booking.choosePlan')}</Txt>
            {draft.plans.map((s) => (
              <Card key={s.id} onPress={s.kind === 'subscription' ? undefined : () => update({ sessionType: s })} selected={s.kind !== 'subscription' && draft.sessionType?.id === s.id} style={{ marginBottom: 12, opacity: s.kind === 'subscription' ? 0.6 : 1 }}>
                <View style={[styles.planRow, isRTL && styles.rtlRow]}>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.planNameRow, isRTL && styles.rtlWrap]}>
                      <Txt variant="bodyStrong">{localizeDomain(s.name, locale)}</Txt>
                      {s.kind === 'subscription' ? <Badge label={t('booking.comingSoon')} tone="neutral" /> : s.popular && <Badge label={t('booking.popular')} tone="brand" />}
                    </View>
                    <Txt variant="caption" style={{ marginTop: 3 }}>{localizeDomain(s.description, locale)}</Txt>
                  </View>
                  <Txt style={styles.planPrice}>{formatMoney(s.price)}<Txt variant="caption">{s.billing_period === 'mo' ? t('booking.month') : ''}</Txt></Txt>
                </View>
              </Card>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Txt variant="screenTitle">{t('booking.sessionDetails')}</Txt>

            <Txt variant="label" style={styles.groupLabel}>{t('booking.whoTraining')}</Txt>
            <Segmented
              options={[{ key: 'solo', label: t('booking.justMe') }, { key: 'friend', label: t('booking.groupSoon') }]}
              value="solo"
              onChange={() => update({ isSplit: false, friendEmail: '' })}
            />
            <Txt variant="caption" style={{ marginTop: 8 }}>{t('booking.soloCopy')}</Txt>

            <Txt variant="label" style={styles.groupLabel}>{t('booking.equipment')}</Txt>
            <Card>
              <View style={[styles.toggleRow, isRTL && styles.rtlRow]}>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">{t('booking.trainerBrings')}</Txt>
                  <Txt variant="caption" style={{ marginTop: 2 }}>{t('booking.ownGearHint')}</Txt>
                </View>
                <Switch
                  value={draft.equipmentByTrainer}
                  onValueChange={(v) => update({ equipmentByTrainer: v })}
                  trackColor={{ false: colors.surfaceHigh, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
            </Card>
            {draft.equipmentByTrainer ? (
              <>
                <Txt variant="caption" style={{ marginTop: 14, marginBottom: 10 }}>{t('booking.whatBring')}</Txt>
                <View style={[styles.equipWrap, isRTL && styles.rtlWrap]}>
                  {EQUIPMENT.map((item) => (
                    <Pressable key={item} onPress={() => toggleEquip(item)}
                      style={[styles.equipChip, draft.equipmentItems.includes(item) && styles.equipChipOn]}>
                      <Txt style={[styles.equipTxt, draft.equipmentItems.includes(item) && { color: colors.white }]}>{locale === 'ar' ? ARABIC_EQUIPMENT[item] ?? item : item}</Txt>
                    </Pressable>
                  ))}
                </View>
                <View style={[styles.feeNote, isRTL && styles.rtlRow]}>
                  <Txt variant="caption">{t('booking.equipmentFee')}</Txt>
                  <Txt variant="bodyStrong" color={colors.primary}>+{formatMoney(price.equipmentFee)}</Txt>
                </View>
              </>
            ) : (
              <Txt variant="caption" style={{ marginTop: 12 }}>
                {t('booking.ownEquipment')}
              </Txt>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <Txt variant="screenTitle">{t('booking.whenWhere')}</Txt>

            <Txt variant="label" style={styles.groupLabel}>{draft.format === 'virtual' ? t('booking.videoSession') : t('booking.address')}</Txt>
            {draft.format === 'virtual' ? (
              <Card>
                <Txt variant="body">
                  {t('booking.videoCopy')}
                </Txt>
              </Card>
            ) : editingAddress ? (
              <Card>
                <TextInput
                  value={draft.addressLine}
                  onChangeText={(t) => update({ addressLine: t })}
                  placeholder={t('booking.street')}
                  placeholderTextColor={colors.textDim}
                  style={[styles.addrInput, isRTL && styles.inputRTL]}
                  autoFocus
                />
                <TextInput
                  value={draft.city}
                  onChangeText={(t) => update({ city: t })}
                  placeholder={t('booking.cityDistrict')}
                  placeholderTextColor={colors.textDim}
                  style={[styles.addrInput, { marginTop: 8 }, isRTL && styles.inputRTL]}
                />
                <Pressable onPress={() => setEditingAddress(false)} style={{ marginTop: 12, alignSelf: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Txt variant="bodyStrong" color={colors.primary}>{t('booking.done')}</Txt>
                </Pressable>
              </Card>
            ) : (
              <Card onPress={() => setEditingAddress(true)}>
                <View style={[styles.addrRow, isRTL && styles.rtlRow]}>
                  <Ionicons name="location" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong">{draft.addressLine}</Txt>
                    <Txt variant="caption">{draft.city}</Txt>
                  </View>
                  <Txt variant="caption" color={colors.primary}>{t('booking.change')}</Txt>
                </View>
              </Card>
            )}

            <Txt variant="label" style={styles.groupLabel}>{t('booking.chooseDate')}</Txt>
            <DateRangePicker
              selected={selectedDate}
              onSelect={pickDate}
              maxDaysAhead={56}
              countForDate={(date) => availability.filter((opening) => !opening.booked && dayjs(opening.starts_at).isSame(date, 'day')).length}
              disabledForDate={availability.length > 0
                ? (date) => !availability.some((opening) => !opening.booked && dayjs(opening.starts_at).isSame(date, 'day'))
                : undefined}
            />

            <View style={[styles.timeSectionHead, isRTL && styles.rtlRow]}>
              <View style={{ flex: 1 }}>
                <Txt variant="label">{t('booking.chooseTime')}</Txt>
                <Txt variant="caption" style={{ marginTop: 3 }}>{selectedDate.locale(locale).format('dddd، D MMMM')}</Txt>
              </View>
              <Badge label={`${new Intl.NumberFormat(localeTag).format(timeOptions.filter((option) => !option.disabled).length)} ${t('booking.open')}`} tone="brand" />
            </View>
            <TimeOpeningPicker
              options={timeOptions}
              onPress={(option) => {
                if (availability.length > 0) {
                  const published = publishedForDay.find((opening) => opening.id === option.key);
                  if (published) pickPublishedSlot(published);
                  return;
                }
                const fallback = TIME_SLOTS.find((opening) => opening.label === option.key);
                if (fallback) pickSlot(fallback);
              }}
              emptyMessage={t('booking.noOpenings')}
            />
            {draft.isPeak && (
              <View style={[styles.peakNote, isRTL && styles.rtlRow]}>
                <Ionicons name="trending-up" size={16} color={colors.primary} />
                <Txt variant="caption" style={{ flex: 1 }}>{t('booking.peakCopy')}</Txt>
              </View>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Txt variant="screenTitle">{t('booking.reviewPay')}</Txt>
            <Card style={{ marginTop: 18 }}>
              <SummaryRow label={t('booking.trainer')} value={trainer.display_name} isRTL={isRTL} />
              <SummaryRow label={t('booking.plan')} value={draft.sessionType ? localizeDomain(draft.sessionType.name, locale) : '—'} isRTL={isRTL} />
              <SummaryRow label={t('booking.format')} value={draft.format === 'virtual' ? t('booking.virtual') : t('booking.inPerson')} isRTL={isRTL} />
              <SummaryRow label={t('booking.when')} value={draft.scheduledAt ? `${dayjs(draft.scheduledAt).locale(locale).format('ddd، D MMM')} · ${new Intl.DateTimeFormat(localeTag, { hour: 'numeric', minute: '2-digit' }).format(draft.scheduledAt)}` : '—'} isRTL={isRTL} />
              {draft.isSplit && <SummaryRow label={t('booking.group')} value={t('booking.splitTwo')} isRTL={isRTL} />}
            </Card>

            <Card style={{ marginTop: 12 }}>
              <PriceRow label={t('booking.session')} value={formatMoney(price.base)} isRTL={isRTL} />
              {price.equipmentFee > 0 && <PriceRow label={t('booking.equipmentFee')} value={formatMoney(price.equipmentFee)} isRTL={isRTL} />}
              {price.peakSurge > 0 && <PriceRow label={t('booking.peakDemand')} value={formatMoney(price.peakSurge)} isRTL={isRTL} />}
              <PriceRow label={t('booking.serviceFee')} value={formatMoney(price.serviceFee)} isRTL={isRTL} />
              <View style={styles.divider} />
              {draft.isSplit
                ? <PriceRow label={t('booking.yourShare')} value={formatMoney(price.amountDue)} bold isRTL={isRTL} />
                : <PriceRow label={t('booking.total')} value={formatMoney(price.total)} bold isRTL={isRTL} />}
            </Card>

            <Card style={{ marginTop: 12 }}>
              <View style={[styles.addrRow, isRTL && styles.rtlRow]}>
                <View style={styles.visa}><Ionicons name={config.paymentsEnabled ? 'card' : 'flask'} size={17} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">{config.paymentsEnabled ? t('booking.secureCheckoutTitle') : t('booking.demoTitle')}</Txt>
                  <Txt variant="caption" style={{ marginTop: 2 }}>{config.paymentsEnabled ? t('booking.secureCheckoutCopy') : t('booking.demoCopy')}</Txt>
                </View>
              </View>
            </Card>

            <View style={[styles.protection, isRTL && styles.rtlRow]}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <Txt variant="caption" style={{ flex: 1 }}>
                {t('booking.protection')}
              </Txt>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {payError && step === steps.length - 1 && (
          <View style={[styles.errorRow, isRTL && styles.rtlRow]}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Txt variant="caption" color={colors.danger} style={{ flex: 1 }}>{payError}</Txt>
          </View>
        )}
        {nextHint && <Txt variant="caption" style={styles.nextHint}>{nextHint}</Txt>}
        <View style={[styles.footerRow, isRTL && styles.rtlRow]}>
          <View>
            <Txt variant="caption">{step === steps.length - 1 ? t('booking.dueToday') : t('booking.estimatedTotal')}</Txt>
            <Txt style={styles.footerPrice}>{formatMoney(price.amountDue)}</Txt>
          </View>
          <Button
            title={step < steps.length - 1 ? t('booking.continue') : config.paymentsEnabled ? t('booking.secureCheckout') : t('booking.reserve')}
            onPress={next}
            disabled={!canNext}
            loading={paying}
            fullWidth={false}
            style={styles.footerButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, isRTL }: { label: string; value: string; isRTL?: boolean }) {
  return (
    <View style={[styles.summaryRow, isRTL && styles.rtlRow]}>
      <Txt variant="caption">{label}</Txt>
      <Txt variant="bodyStrong">{value}</Txt>
    </View>
  );
}
function PriceRow({ label, value, bold, isRTL }: { label: string; value: string; bold?: boolean; isRTL?: boolean }) {
  return (
    <View style={[styles.priceRow, isRTL && styles.rtlRow]}>
      <Txt variant={bold ? 'bodyStrong' : 'body'}>{label}</Txt>
      <Txt variant={bold ? 'cardTitle' : 'bodyStrong'}>{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingTop: 8 },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  stepBubble: { minWidth: 42, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9, backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder },
  stepBubbleText: { fontFamily: fonts.monoBold, fontSize: 10, color: colors.primaryLight },
  track: { flexDirection: 'row', gap: 6, paddingHorizontal: 22, marginTop: 17 },
  trackSegment: { flex: 1, height: 4, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)' },
  trackSegmentOn: { backgroundColor: colors.primary },
  stepLabel: { paddingHorizontal: 22, marginTop: 10, color: colors.textDim },
  body: { flex: 1, paddingHorizontal: 22, marginTop: 14 },
  groupLabel: { marginTop: 24, marginBottom: 10 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planPrice: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary },
  inputWrap: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingHorizontal: 15, marginTop: 12,
  },
  input: { color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 14 },
  addrInput: {
    color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  equipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  equipChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10 },
  equipChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  equipTxt: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary },
  feeNote: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26, marginBottom: 12 },
  peakNote: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16,
    backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primaryBorder,
    borderRadius: radius.md, padding: 14,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  visa: { backgroundColor: '#1434CB', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4 },
  visaTxt: { fontFamily: fonts.extrabold, fontSize: 11, color: colors.white, letterSpacing: 1 },
  protection: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, paddingHorizontal: 4 },
  footer: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: 'rgba(17,19,24,0.98)' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  footerPrice: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.textPrimary, marginTop: 1 },
  footerButton: { flex: 1 },
  nextHint: { color: colors.warning, marginBottom: 9 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  rtlWrap: { direction: 'ltr', flexDirection: 'row-reverse' },
  inputRTL: { textAlign: 'right', writingDirection: 'rtl' },
});
