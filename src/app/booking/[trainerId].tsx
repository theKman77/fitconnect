import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { colors, fonts, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { useBooking } from '@/context/booking';
import { useAuth } from '@/context/auth';
import { createBooking } from '@/lib/bookings';
import { payForBooking } from '@/lib/payments';
import { Badge, Button, Card, Txt } from '@/components/ui';
import { Segmented } from '@/components/ui/Segmented';

const STEPS = ['Plan', 'Details', 'When & where', 'Review & pay'];
const EQUIPMENT = ['Resistance bands', 'Yoga mat', 'Dumbbells', 'Kettlebell', 'Jump rope'];
const TIME_SLOTS = [
  { label: '7:00 AM', hour: 7, minute: 0, peak: false }, { label: '9:00 AM', hour: 9, minute: 0, peak: false },
  { label: '12:00 PM', hour: 12, minute: 0, peak: false }, { label: '3:00 PM', hour: 15, minute: 0, peak: false },
  { label: '6:00 PM', hour: 18, minute: 0, peak: true }, { label: '7:30 PM', hour: 19, minute: 30, peak: true },
];
/** Next 14 days for the cross-platform date strip (native picker breaks on web). */
const DATES = Array.from({ length: 14 }).map((_, i) => dayjs().add(i, 'day'));

export default function BookingFlow() {
  const router = useRouter();
  const { profile } = useAuth();
  const { draft, update, price } = useBooking();
  const [step, setStep] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const trainer = draft.trainer;
  if (!trainer) {
    return <SafeAreaView style={styles.root}><View style={styles.center}><Txt>Start from a trainer profile.</Txt></View></SafeAreaView>;
  }

  const canNext =
    step === 0 ? !!draft.sessionType :
    step === 2 ? !!draft.scheduledAt && !!slot :
    true;

  async function next() {
    if (step < STEPS.length - 1) return setStep(step + 1);
    // Final: create booking + pay
    setPaying(true);
    setPayError(null);
    try {
      const booking = await createBooking(draft, price, profile?.id ?? 'demo-client');
      const res = await payForBooking(booking.id, price.amountDue);
      if (res.ok) {
        router.replace({ pathname: '/booking/confirmation', params: { bookingId: booking.id } });
      } else if (!res.cancelled) {
        setPayError(res.error ?? 'Payment failed. Please try again.');
      }
    } catch (e: any) {
      setPayError(e?.message ?? 'Something went wrong creating your booking.');
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
    update({ scheduledAt: next.toDate() });
  }

  function pickSlot(s: (typeof TIME_SLOTS)[number]) {
    setSlot(s.label);
    const base = draft.scheduledAt ? dayjs(draft.scheduledAt) : dayjs();
    update({ isPeak: s.peak, scheduledAt: base.hour(s.hour).minute(s.minute).second(0).toDate() });
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header + progress */}
      <View style={styles.header}>
        <Pressable onPress={() => (step === 0 ? router.back() : setStep(step - 1))} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.track}><View style={[styles.fill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} /></View>
      </View>
      <Txt variant="mono" style={styles.stepLabel}>STEP {step + 1} OF {STEPS.length} · {STEPS[step].toUpperCase()}</Txt>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {step === 0 && (
          <>
            <Txt variant="screenTitle">How do you want to train?</Txt>
            <View style={{ marginTop: 18 }}>
              <Segmented
                options={[{ key: 'in_person', label: 'In person' }, { key: 'virtual', label: 'Virtual' }]}
                value={draft.format}
                onChange={(v) => update({ format: v })}
              />
            </View>
            <Txt variant="sectionTitle" style={{ marginTop: 26, marginBottom: 12 }}>Choose a plan</Txt>
            {draft.plans.map((s) => (
              <Card key={s.id} onPress={() => update({ sessionType: s })} selected={draft.sessionType?.id === s.id} style={{ marginBottom: 12 }}>
                <View style={styles.planRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.planNameRow}>
                      <Txt variant="bodyStrong">{s.name}</Txt>
                      {s.popular && <Badge label="POPULAR" tone="brand" />}
                    </View>
                    <Txt variant="caption" style={{ marginTop: 3 }}>{s.description}</Txt>
                  </View>
                  <Txt style={styles.planPrice}>{formatMoney(s.price)}<Txt variant="caption">{s.billing_period === 'mo' ? '/mo' : ''}</Txt></Txt>
                </View>
              </Card>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Txt variant="screenTitle">Session details</Txt>

            <Txt variant="label" style={styles.groupLabel}>Who is training</Txt>
            <Segmented
              options={[{ key: 'solo', label: 'Just me' }, { key: 'friend', label: 'With a friend' }]}
              value={draft.isSplit ? 'friend' : 'solo'}
              onChange={(v) => update({ isSplit: v === 'friend' })}
            />
            {draft.isSplit && (
              <>
                <View style={styles.inputWrap}>
                  <TextInput
                    placeholder="Friend's email for the invite"
                    placeholderTextColor={colors.textDim}
                    value={draft.friendEmail}
                    onChangeText={(t) => update({ friendEmail: t })}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                </View>
                <Txt variant="caption" style={{ marginTop: 8 }}>
                  You'll each pay half at checkout. Your friend gets an invite link after booking.
                </Txt>
              </>
            )}

            <Txt variant="label" style={styles.groupLabel}>Equipment</Txt>
            <Card>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">Trainer brings equipment</Txt>
                  <Txt variant="caption" style={{ marginTop: 2 }}>Turn off if you have your own gear</Txt>
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
                <Txt variant="caption" style={{ marginTop: 14, marginBottom: 10 }}>What should they bring?</Txt>
                <View style={styles.equipWrap}>
                  {EQUIPMENT.map((item) => (
                    <Pressable key={item} onPress={() => toggleEquip(item)}
                      style={[styles.equipChip, draft.equipmentItems.includes(item) && styles.equipChipOn]}>
                      <Txt style={[styles.equipTxt, draft.equipmentItems.includes(item) && { color: colors.white }]}>{item}</Txt>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.feeNote}>
                  <Txt variant="caption">Equipment delivery fee</Txt>
                  <Txt variant="bodyStrong" color={colors.primary}>+{formatMoney(price.equipmentFee)}</Txt>
                </View>
              </>
            ) : (
              <Txt variant="caption" style={{ marginTop: 12 }}>
                You'll provide your own equipment. Your trainer will send a short prep list before the session.
              </Txt>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <Txt variant="screenTitle">When & where</Txt>

            <Txt variant="label" style={styles.groupLabel}>{draft.format === 'virtual' ? 'Video session' : 'Address'}</Txt>
            {draft.format === 'virtual' ? (
              <Card>
                <Txt variant="body">
                  A private video link will be sent to you and your trainer 15 minutes before the session starts.
                </Txt>
              </Card>
            ) : editingAddress ? (
              <Card>
                <TextInput
                  value={draft.addressLine}
                  onChangeText={(t) => update({ addressLine: t })}
                  placeholder="Street, building, apartment"
                  placeholderTextColor={colors.textDim}
                  style={styles.addrInput}
                  autoFocus
                />
                <TextInput
                  value={draft.city}
                  onChangeText={(t) => update({ city: t })}
                  placeholder="City & district"
                  placeholderTextColor={colors.textDim}
                  style={[styles.addrInput, { marginTop: 8 }]}
                />
                <Pressable onPress={() => setEditingAddress(false)} style={{ marginTop: 12, alignSelf: 'flex-end' }}>
                  <Txt variant="bodyStrong" color={colors.primary}>Done</Txt>
                </Pressable>
              </Card>
            ) : (
              <Card onPress={() => setEditingAddress(true)}>
                <View style={styles.addrRow}>
                  <Ionicons name="location" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong">{draft.addressLine}</Txt>
                    <Txt variant="caption">{draft.city}</Txt>
                  </View>
                  <Txt variant="caption" color={colors.primary}>Change</Txt>
                </View>
              </Card>
            )}

            <Txt variant="label" style={styles.groupLabel}>Date</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 22 }} style={{ marginHorizontal: -22 }}>
              {DATES.map((d) => {
                const on = draft.scheduledAt ? dayjs(draft.scheduledAt).isSame(d, 'day') : false;
                return (
                  <Pressable key={d.format('YYYY-MM-DD')} onPress={() => pickDate(d)}
                    style={[styles.dateChip, on && styles.dateChipOn]}>
                    <Txt style={[styles.dateDow, on && { color: colors.primary }]}>
                      {d.isSame(dayjs(), 'day') ? 'TODAY' : d.format('ddd').toUpperCase()}
                    </Txt>
                    <Txt style={[styles.dateNum, on && { color: colors.textPrimary }]}>{d.format('D')}</Txt>
                    <Txt style={[styles.dateMon, on && { color: colors.textSecondary }]}>{d.format('MMM')}</Txt>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Txt variant="label" style={styles.groupLabel}>Time</Txt>
            <View style={styles.equipWrap}>
              {TIME_SLOTS.map((s) => (
                <Pressable key={s.label} onPress={() => pickSlot(s)}
                  style={[styles.slot, slot === s.label && styles.slotOn]}>
                  <Txt style={[styles.equipTxt, slot === s.label && { color: colors.white }]}>{s.label}</Txt>
                  {s.peak && <Badge label="PEAK" tone="brand" style={{ marginTop: 4 }} />}
                </Pressable>
              ))}
            </View>
            {draft.isPeak && (
              <View style={styles.peakNote}>
                <Ionicons name="trending-up" size={16} color={colors.primary} />
                <Txt variant="caption" style={{ flex: 1 }}>Evenings are busy. Pick a morning slot to skip the +20% surge.</Txt>
              </View>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Txt variant="screenTitle">Review & pay</Txt>
            <Card style={{ marginTop: 18 }}>
              <SummaryRow label="Trainer" value={trainer.display_name} />
              <SummaryRow label="Plan" value={draft.sessionType?.name ?? '—'} />
              <SummaryRow label="Format" value={draft.format === 'virtual' ? 'Virtual' : 'In person'} />
              <SummaryRow label="When" value={draft.scheduledAt ? `${dayjs(draft.scheduledAt).format('ddd, MMM D')} · ${slot}` : '—'} />
              {draft.isSplit && <SummaryRow label="Group" value="Split 2 ways" />}
            </Card>

            <Card style={{ marginTop: 12 }}>
              <PriceRow label="Session" value={formatMoney(price.base)} />
              {price.equipmentFee > 0 && <PriceRow label="Equipment delivery" value={formatMoney(price.equipmentFee)} />}
              {price.peakSurge > 0 && <PriceRow label="Peak demand +20%" value={formatMoney(price.peakSurge)} />}
              <PriceRow label="Service fee" value={formatMoney(price.serviceFee)} />
              <View style={styles.divider} />
              {draft.isSplit
                ? <PriceRow label="Your share (split 2 ways)" value={formatMoney(price.amountDue)} bold />
                : <PriceRow label="Total" value={formatMoney(price.total)} bold />}
            </Card>

            <Card style={{ marginTop: 12 }}>
              <View style={styles.addrRow}>
                <View style={styles.visa}><Txt style={styles.visaTxt}>VISA</Txt></View>
                <Txt variant="bodyStrong" style={{ flex: 1 }}>•••• 4242</Txt>
                <Txt variant="caption" color={colors.primary}>Change</Txt>
              </View>
            </Card>

            <View style={styles.protection}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <Txt variant="caption" style={{ flex: 1 }}>
                Free cancellation up to 4h before. No-show protection auto-rebooks you with a backup trainer.
              </Txt>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {payError && step === STEPS.length - 1 && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Txt variant="caption" color={colors.danger} style={{ flex: 1 }}>{payError}</Txt>
          </View>
        )}
        <Button
          title={step < STEPS.length - 1 ? 'Continue' : `Pay ${formatMoney(price.amountDue)}`}
          onPress={next}
          disabled={!canNext}
          loading={paying}
        />
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Txt variant="caption">{label}</Txt>
      <Txt variant="bodyStrong">{value}</Txt>
    </View>
  );
}
function PriceRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.priceRow}>
      <Txt variant={bold ? 'bodyStrong' : 'body'}>{label}</Txt>
      <Txt variant={bold ? 'cardTitle' : 'bodyStrong'}>{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingTop: 8 },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  stepLabel: { paddingHorizontal: 22, marginTop: 12, color: colors.textDim },
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
  slot: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', minWidth: 96,
  },
  slotOn: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  dateChip: {
    width: 64, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 2,
  },
  dateChipOn: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  dateDow: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.8, color: colors.textDim },
  dateNum: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.textMuted },
  dateMon: { fontFamily: fonts.medium, fontSize: 10, color: colors.textDim },
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
  footer: { padding: 22, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
});
