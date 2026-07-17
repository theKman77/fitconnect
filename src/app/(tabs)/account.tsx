import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { becomeTrainer } from '@/lib/trainer';
import { confirm } from '@/lib/confirm';
import { Avatar, Card, Txt } from '@/components/ui';

export default function Account() {
  const router = useRouter();
  const { profile, updateProfile, refreshProfile, signOut } = useAuth();
  const [becoming, setBecoming] = useState(false);

  function onBecomeTrainer() {
    confirm(
      {
        title: 'Become a trainer',
        message: 'Set up a trainer profile so clients can book you. You can switch back to client view anytime.',
      },
      async () => {
        if (!profile) return;
        setBecoming(true);
        await becomeTrainer(profile);
        await updateProfile({ role: 'trainer' });
        await refreshProfile();
        setBecoming(false);
        router.replace('/(trainer)' as Href);
      },
    );
  }

  async function shareReferral() {
    const code = profile?.referral_code ?? 'FIT-FRIEND';
    await Share.share({
      message: `Join me on FitConnect — book great personal trainers on demand. Use my code ${code} and we both get a free session credit!`,
    });
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}><Txt variant="screenTitle">Account</Txt></View>

        {/* Profile */}
        <View style={styles.section}>
          <Card onPress={() => router.push('/edit-profile')}>
            <View style={styles.profile}>
              <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={56} />
              <View style={{ flex: 1 }}>
                <Txt variant="cardTitle">{profile?.full_name ?? 'Your name'}</Txt>
                <Txt variant="caption" style={{ marginTop: 3 }}>Member since 2025 · Pro plan</Txt>
              </View>
              <Txt variant="caption" color={colors.primary} style={{ marginRight: 4 }}>Edit</Txt>
              <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
            </View>
          </Card>
        </View>

        <Section title="Membership & bookings">
          <Row icon="card" label="Manage subscription" onPress={() => router.push('/membership')} />
          <Row icon="heart" label="Favorite trainers" onPress={() => router.push('/favorites')} />
          <Row icon="time" label="Session history" onPress={() => router.push('/history')} />
          <Row icon="wallet" label="Payment methods" value="•••• 4242" onPress={() => router.push('/payment-methods')} />
        </Section>

        <Section title="You">
          <Row icon="stats-chart" label="Progress & measurements" onPress={() => router.push('/(tabs)/progress')} />
          <Row icon="gift" label="Invite a friend — you both get a session credit"
            value={profile?.referral_code ?? undefined} onPress={shareReferral} />
        </Section>

        {/* Safety & accessibility */}
        <Section title="Safety & accessibility">
          <Row icon="alert-circle" label="Emergency contact"
            value={profile?.emergency_contact_name ? `${profile.emergency_contact_name}` : 'Add'}
            onPress={() => router.push('/edit-profile')} />
          <ToggleRow icon="contrast" label="High-contrast mode"
            value={!!profile?.high_contrast} onChange={(v) => updateProfile({ high_contrast: v })} />
          <ToggleRow icon="text" label="Large text"
            value={!!profile?.large_text} onChange={(v) => updateProfile({ large_text: v })} />
        </Section>

        {/* Become a trainer */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <Card onPress={onBecomeTrainer}>
            <View style={styles.becomeRow}>
              <View style={styles.becomeIcon}><Ionicons name="barbell" size={20} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong">{becoming ? 'Setting up…' : 'Become a trainer'}</Txt>
                <Txt variant="caption" style={{ marginTop: 2 }}>Offer sessions and earn on FitConnect</Txt>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </View>
          </Card>
        </View>

        <View style={[styles.section, { marginTop: 12 }]}>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Txt variant="label" style={{ marginBottom: 10, marginTop: 6 }}>{title}</Txt>
      <Card padded={false}>{children}</Card>
    </View>
  );
}

function Row({ icon, label, value, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && onPress ? { opacity: 0.7 } : null]}>
      <Ionicons name={icon} size={19} color={colors.textMuted} />
      <Txt variant="bodyStrong" style={{ flex: 1 }}>{label}</Txt>
      {value && <Txt variant="caption" style={{ marginRight: 6 }}>{value}</Txt>}
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
    </Pressable>
  );
}

function ToggleRow({ icon, label, value, onChange }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={19} color={colors.textMuted} />
      <Txt variant="bodyStrong" style={{ flex: 1 }}>{label}</Txt>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceHigh, true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 4 },
  section: { paddingHorizontal: 22, marginTop: 12 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  signout: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  becomeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  becomeIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
});
