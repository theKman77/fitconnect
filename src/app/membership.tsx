import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { colors, fonts, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { confirm, notify } from '@/lib/confirm';
import { useAuth } from '@/context/auth';
import { listTrainers } from '@/lib/api';
import { getMySubscription, setSubscriptionStatus } from '@/lib/subscriptions';
import { Badge, Button, Card, EmptyState, Txt } from '@/components/ui';
import type { Subscription, Trainer } from '@/types/domain';

const PERKS = [
  { icon: 'chatbubbles', label: 'Unlimited chat support' },
  { icon: 'pricetag', label: 'Discounted add-ons' },
  { icon: 'repeat', label: 'Free rescheduling' },
];

export default function Membership() {
  const router = useRouter();
  const { profile } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setSub(await getMySubscription(profile?.id ?? 'demo-client'));
      setTrainers(await listTrainers());
    } catch (e: any) {
      setError(e?.message ?? 'Could not load membership information.');
    } finally {
      setLoaded(true);
    }
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const trainerName = sub ? trainers.find((t) => t.id === sub.trainer_id)?.display_name ?? 'your trainer' : '';
  const paused = sub?.status === 'paused';

  async function setStatus(status: 'active' | 'paused' | 'cancelled') {
    if (!sub) return;
    try {
      await setSubscriptionStatus(sub.id, status);
      await load();
    } catch (e: any) {
      notify('Membership not changed', e?.message ?? 'Please try again.');
    }
  }

  function cancelPlan() {
    confirm(
      {
        title: 'Cancel membership?',
        message: 'You keep your remaining sessions until the end of the billing period.',
        confirmLabel: 'Cancel plan',
        destructive: true,
      },
      () => setStatus('cancelled'),
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
        {error && <Txt variant="caption" color={colors.danger} style={{ marginBottom: 12 }}>{error}</Txt>}
        {loaded && !sub && (
          <EmptyState
            icon="card"
            title="No membership yet"
            subtitle="Monthly plans are a preview until recurring payments and entitlement tracking are connected."
            actionLabel="Browse trainers"
            onAction={() => router.push('/(tabs)/discover')}
          />
        )}

        {sub && (
          <>
            {paused && (
              <View style={styles.pausedBanner}>
                <Ionicons name="pause-circle" size={18} color={colors.warning} />
                <Txt variant="caption" style={{ flex: 1 }}>Membership paused. Resume anytime to keep your streak.</Txt>
              </View>
            )}

            <Card>
              <View style={styles.planHead}>
                <View>
                  <Txt variant="cardTitle">{sub.plan_name ?? 'Membership'}</Txt>
                  <Txt variant="caption" style={{ marginTop: 2 }}>
                    with {trainerName}
                    {sub.current_period_end ? ` · renews ${dayjs(sub.current_period_end).format('MMM D')}` : ''}
                  </Txt>
                </View>
                <Badge label={paused ? 'PAUSED' : 'ACTIVE'} tone={paused ? 'neutral' : 'success'} />
              </View>
              {sub.price != null && (
                <View style={styles.priceRow}>
                  <Txt style={styles.price}>{formatMoney(sub.price)}</Txt>
                  <Txt variant="caption">/mo</Txt>
                </View>
              )}
              <View style={styles.progressWrap}>
                <View style={styles.progressHead}>
                  <Txt variant="caption">{sub.sessions_used} of {sub.sessions_included} sessions used</Txt>
                  <Txt variant="caption" color={colors.primary}>{Math.max(0, sub.sessions_included - sub.sessions_used)} left</Txt>
                </View>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${Math.min(100, (sub.sessions_used / Math.max(1, sub.sessions_included)) * 100)}%` }]} />
                </View>
              </View>
            </Card>

            {sub.loyalty_weeks > 0 && (
              <Card style={{ marginTop: 12 }}>
                <View style={styles.loyalty}>
                  <View style={styles.flame}><Txt style={{ fontSize: 22 }}>🔥</Txt></View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong">Loyalty streak · {sub.loyalty_weeks} weeks</Txt>
                    <Txt variant="caption" style={{ marginTop: 2 }}>1 more week unlocks a free nutrition consult.</Txt>
                  </View>
                </View>
              </Card>
            )}

            <Txt variant="label" style={{ marginTop: 22, marginBottom: 12 }}>Your perks</Txt>
            <Card padded={false}>
              {PERKS.map((p, i) => (
                <View key={p.label} style={[styles.perk, i < PERKS.length - 1 && styles.perkBorder]}>
                  <Ionicons name={p.icon as any} size={19} color={colors.primary} />
                  <Txt variant="bodyStrong" style={{ flex: 1 }}>{p.label}</Txt>
                </View>
              ))}
            </Card>

            <View style={{ marginTop: 24, gap: 10 }}>
              <Button
                title={paused ? 'Resume membership' : 'Pause membership'}
                variant="secondary"
                onPress={() => setStatus(paused ? 'active' : 'paused')}
              />
              <Button title="Cancel membership" variant="ghost" onPress={cancelPlan} />
            </View>
          </>
        )}
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
