import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { Badge, Button, Card, Txt } from '@/components/ui';

const PERKS = [
  { icon: 'chatbubbles', label: 'Unlimited chat support' },
  { icon: 'pricetag', label: 'Discounted add-ons' },
  { icon: 'repeat', label: 'Free rescheduling' },
];

export default function Membership() {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [plan, setPlan] = useState<'pro' | 'elite'>('pro');
  const [cancelled, setCancelled] = useState(false);
  const used = 5;
  const total = plan === 'elite' ? 12 : 8;
  const price = plan === 'elite' ? 2199 : 1512;

  function upgrade() {
    if (plan === 'elite') return;
    Alert.alert(
      'Upgrade to Elite',
      `Elite: 12 sessions/month, priority booking, and a monthly progress review — ${formatMoney(2199)}/mo. Billing switches on with the live payment provider; in demo this just previews the plan.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => setPlan('elite') },
      ],
    );
  }

  function cancelPlan() {
    Alert.alert(
      'Cancel membership?',
      'You keep your remaining sessions until the end of the billing period. Your loyalty streak will reset.',
      [
        { text: 'Keep membership', style: 'cancel' },
        { text: 'Cancel plan', style: 'destructive', onPress: () => setCancelled(true) },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Txt variant="sectionTitle">Membership</Txt>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 22, paddingBottom: 30 }}>
        {paused && (
          <View style={styles.pausedBanner}>
            <Ionicons name="pause-circle" size={18} color={colors.warning} />
            <Txt variant="caption" style={{ flex: 1 }}>Membership paused. Resume anytime to keep your streak.</Txt>
          </View>
        )}

        {/* Plan card */}
        <Card>
          <View style={styles.planHead}>
            <View>
              <Txt variant="cardTitle">{plan === 'elite' ? 'Elite plan' : 'Pro plan'}</Txt>
              <Txt variant="caption" style={{ marginTop: 2 }}>
                with Maya Okafor · {cancelled ? 'ends Aug 3' : 'renews Aug 3'}
              </Txt>
            </View>
            <Badge
              label={cancelled ? 'ENDING' : paused ? 'PAUSED' : 'ACTIVE'}
              tone={cancelled ? 'danger' : paused ? 'neutral' : 'success'}
            />
          </View>
          <View style={styles.priceRow}>
            <Txt style={styles.price}>{formatMoney(price)}</Txt>
            <Txt variant="caption">/mo</Txt>
          </View>

          {/* Sessions progress */}
          <View style={styles.progressWrap}>
            <View style={styles.progressHead}>
              <Txt variant="caption">{used} of {total} sessions used</Txt>
              <Txt variant="caption" color={colors.primary}>{total - used} left</Txt>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${(used / total) * 100}%` }]} />
            </View>
          </View>
        </Card>

        {/* Loyalty */}
        <Card style={{ marginTop: 12 }}>
          <View style={styles.loyalty}>
            <View style={styles.flame}><Txt style={{ fontSize: 22 }}>🔥</Txt></View>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">Loyalty streak · 5 weeks</Txt>
              <Txt variant="caption" style={{ marginTop: 2 }}>1 more week unlocks a free nutrition consult.</Txt>
            </View>
          </View>
        </Card>

        {/* Perks */}
        <Txt variant="label" style={{ marginTop: 22, marginBottom: 12 }}>Your perks</Txt>
        <Card padded={false}>
          {PERKS.map((p, i) => (
            <View key={p.label} style={[styles.perk, i < PERKS.length - 1 && styles.perkBorder]}>
              <Ionicons name={p.icon as any} size={19} color={colors.primary} />
              <Txt variant="bodyStrong" style={{ flex: 1 }}>{p.label}</Txt>
            </View>
          ))}
        </Card>

        {/* Actions */}
        <View style={{ marginTop: 24, gap: 10 }}>
          {cancelled ? (
            <Button title="Reactivate membership" onPress={() => setCancelled(false)} />
          ) : (
            <>
              {plan === 'pro' && <Button title="Upgrade to Elite" onPress={upgrade} />}
              <Button
                title={paused ? 'Resume membership' : 'Pause membership'}
                variant="secondary"
                onPress={() => setPaused((p) => !p)}
              />
              <Button title="Cancel membership" variant="ghost" onPress={cancelPlan} />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  pausedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
    backgroundColor: 'rgba(255,154,95,0.1)', borderWidth: 1, borderColor: 'rgba(255,154,95,0.3)',
    borderRadius: radius.md, padding: 14,
  },
  planHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 14 },
  price: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.textPrimary },
  progressWrap: { marginTop: 20 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  loyalty: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flame: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  perkBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
