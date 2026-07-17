import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { useAuth } from '@/context/auth';
import { getMyTrainer } from '@/lib/trainer';
import { notify } from '@/lib/confirm';
import { Avatar, Card, Txt } from '@/components/ui';
import type { Trainer } from '@/types/domain';

export default function TrainerAccount() {
  const router = useRouter();
  const { profile, updateProfile, signOut } = useAuth();
  const [trainer, setTrainer] = useState<Trainer | null>(null);

  useFocusEffect(useCallback(() => {
    getMyTrainer(profile).then(setTrainer);
  }, [profile]));

  async function switchToClient() {
    await updateProfile({ role: 'client' });
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Txt variant="screenTitle">Account</Txt></View>

        <View style={styles.section}>
          <Card>
            <View style={styles.profile}>
              <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={56} />
              <View style={{ flex: 1 }}>
                <Txt variant="cardTitle">{profile?.full_name ?? 'Trainer'}</Txt>
                <Txt variant="caption" style={{ marginTop: 3 }}>
                  {trainer ? `${trainer.headline ?? 'Trainer'} · from ${formatMoney(trainer.base_price)}` : 'Trainer'}
                </Txt>
              </View>
              {trainer?.verified && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Card padded={false}>
            <Row icon="pricetags" label="Profile, pricing & video"
              onPress={() => router.push('/trainer-edit' as any)} />
            <Row icon="time" label="Availability"
              value={trainer?.available_now ? 'Online' : 'Offline'}
              onPress={() => router.push('/(trainer)' as any)} />
            <Row icon="wallet" label="Payouts" value="Needs Moyasar"
              onPress={() => notify('Payouts', 'Payouts to your IBAN switch on with live Moyasar payments. Your earnings are tracked on the Today tab meanwhile.')} />
            <Row icon="star" label="Reviews" value={trainer ? `${trainer.rating.toFixed(1)} (${trainer.review_count})` : '—'}
              onPress={() => trainer && router.push(`/trainer/${trainer.id}`)} last />
          </Card>
        </View>

        <View style={styles.section}>
          <Card onPress={switchToClient}>
            <View style={styles.switchRow}>
              <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong">Switch to client view</Txt>
                <Txt variant="caption" style={{ marginTop: 2 }}>Book trainers as a client</Txt>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </View>
          </Card>
        </View>

        <View style={[styles.section, { marginTop: 20 }]}>
          <Card onPress={async () => { await signOut(); router.replace('/(auth)/welcome'); }}>
            <View style={styles.signout}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Txt variant="bodyStrong" color={colors.danger}>Sign out</Txt>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value, last, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; last?: boolean; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && onPress ? { opacity: 0.7 } : null]}>
      <Ionicons name={icon} size={19} color={colors.textMuted} />
      <Txt variant="bodyStrong" style={{ flex: 1 }}>{label}</Txt>
      {value && <Txt variant="caption" style={{ marginRight: 6 }}>{value}</Txt>}
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 4 },
  section: { paddingHorizontal: 22, marginTop: 12 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  signout: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
});
