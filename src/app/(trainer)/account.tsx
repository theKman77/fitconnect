import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '@/theme';
import { formatMoney } from '@/lib/config';
import { useAuth } from '@/context/auth';
import { getMyTrainer, submitTrainerApplication } from '@/lib/trainer';
import { notify } from '@/lib/confirm';
import { Avatar, Card, Txt } from '@/components/ui';
import type { Trainer } from '@/types/domain';
import { useLocale } from '@/context/locale';

export default function TrainerAccount() {
  const router = useRouter();
  const { profile, updateProfile, signOut } = useAuth();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const { localeTag, isRTL, tr } = useLocale();

  useFocusEffect(useCallback(() => {
    getMyTrainer(profile).then(setTrainer);
  }, [profile]));

  async function switchToClient() {
    try {
      await updateProfile({ role: 'client' });
      router.replace('/(tabs)');
    } catch (e: any) {
      notify(tr('Could not switch views'), e?.message ?? tr('Please try again.'));
    }
  }

  async function submitApplication() {
    try {
      const updated = await submitTrainerApplication();
      setTrainer(updated);
      notify(tr('Application submitted'), tr('FitConnect can now review your trainer profile. You cannot self-verify the account.'));
    } catch (e: any) {
      notify(tr('Not ready to submit'), e?.message ?? tr('Complete your trainer profile first.'));
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Txt variant="screenTitle">{tr('Account')}</Txt></View>

        <View style={styles.section}>
          <Card>
            <View style={[styles.profile, isRTL && styles.rtlRow]}>
              <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={56} />
              <View style={{ flex: 1 }}>
                <Txt variant="cardTitle">{profile?.full_name ?? tr('Trainer')}</Txt>
                <Txt variant="caption" style={{ marginTop: 3 }}>
                  {trainer ? `${trainer.headline ?? tr('Trainer')} · ${isRTL ? 'ابتداءً من' : 'from'} ${formatMoney(trainer.base_price)}` : tr('Trainer')}
                </Txt>
              </View>
              {trainer?.verified && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Card padded={false}>
            <Row icon="pricetags" label={tr('Profile, pricing & video')}
              onPress={() => router.push('/trainer-edit' as any)} />
            <Row icon="shield-checkmark" label={tr('Application')}
              value={tr((trainer?.onboarding_status ?? 'draft').replace('_', ' '))}
              onPress={trainer?.onboarding_status === 'approved' || trainer?.onboarding_status === 'submitted' ? undefined : submitApplication} />
            <Row icon="time" label={tr('Availability')}
              value={tr(trainer?.available_now ? 'Online' : 'Offline')}
              onPress={() => router.push('/trainer-availability' as any)} />
            <Row icon="wallet" label={tr('Payouts')} value={tr('Needs Moyasar')}
              onPress={() => notify(tr('Payouts'), tr('Payouts to your IBAN switch on with live Moyasar payments. Your earnings are tracked on the Today tab meanwhile.'))} />
            <Row icon="extension-puzzle" label={tr('Integrations')} value={tr('4 ready')}
              onPress={() => router.push('/integrations' as any)} />
            <Row icon="star" label={tr('Reviews')} value={trainer ? `${new Intl.NumberFormat(localeTag, { maximumFractionDigits: 1 }).format(trainer.rating)} (${new Intl.NumberFormat(localeTag).format(trainer.review_count)})` : '—'}
              onPress={() => trainer && router.push(`/trainer/${trainer.id}`)} last />
          </Card>
        </View>

        <View style={styles.section}>
          <Card onPress={switchToClient}>
            <View style={[styles.switchRow, isRTL && styles.rtlRow]}>
              <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong">{tr('Switch to client view')}</Txt>
                <Txt variant="caption" style={{ marginTop: 2 }}>{tr('Book trainers as a client')}</Txt>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textDim} />
            </View>
          </Card>
        </View>

        <View style={[styles.section, { marginTop: 20 }]}>
          <Card onPress={async () => { await signOut(); router.replace('/(auth)/welcome'); }}>
            <View style={[styles.signout, isRTL && styles.rtlRow]}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Txt variant="bodyStrong" color={colors.danger}>{tr('Sign out')}</Txt>
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
  const { isRTL } = useLocale();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, isRTL && styles.rtlRow, !last && styles.rowBorder, pressed && onPress ? { opacity: 0.7 } : null]}>
      <Ionicons name={icon} size={19} color={colors.textMuted} />
      <Txt variant="bodyStrong" style={{ flex: 1 }}>{label}</Txt>
      {value && <Txt variant="caption" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }}>{value}</Txt>}
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textDim} />
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
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
});
