import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { becomeTrainer } from '@/lib/trainer';
import { confirm, notify } from '@/lib/confirm';
import { shareOnWhatsApp } from '@/lib/integrations';
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
        try {
          await becomeTrainer(profile);
          await refreshProfile();
          router.replace('/(trainer)' as Href);
        } catch (e: any) {
          notify('Trainer setup failed', e?.message ?? 'Please try again.');
        } finally {
          setBecoming(false);
        }
      },
    );
  }

  async function shareReferral() {
    const code = profile?.referral_code ?? 'FIT-FRIEND';
    const message = `Take a look at FitConnect — a Saudi trainer-booking marketplace in development. My invite code is ${code}.`;
    try {
      await Share.share({ message });
    } catch {
      // Web without the native share sheet: copy to clipboard instead.
      try {
        await (navigator as any)?.clipboard?.writeText(message);
        notify('Copied', 'Your invite message is on the clipboard — paste it anywhere.');
      } catch {
        notify('Your code', code);
      }
    }
  }

  async function savePreference(patch: { high_contrast?: boolean; large_text?: boolean }) {
    try {
      await updateProfile(patch);
    } catch (e: any) {
      notify('Preference not saved', e?.message ?? 'Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <Txt style={styles.headerKicker}>YOUR FITCONNECT</Txt>
          <Txt variant="screenTitle">Your space</Txt>
        </View>

        {/* Profile */}
        <View style={styles.section}>
          <Card onPress={() => router.push('/edit-profile')} style={styles.profileCard}>
            <View style={styles.profile}>
              <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={56} />
              <View style={{ flex: 1 }}>
                <Txt variant="cardTitle">{profile?.full_name ?? 'Your name'}</Txt>
                <Txt variant="caption" style={{ marginTop: 3 }}>{profile?.city ?? 'Saudi Arabia'} · FitConnect member</Txt>
              </View>
              <Txt variant="caption" color={colors.primary} style={{ marginRight: 4 }}>Edit</Txt>
              <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
            </View>
          </Card>
        </View>

        <Section title="Membership & bookings">
          <Row icon="card" label="Membership plans" value="Preview" onPress={() => router.push('/membership')} />
          <Row icon="heart" label="Favorite trainers" onPress={() => router.push('/favorites')} />
          <Row icon="time" label="Session history" onPress={() => router.push('/history')} />
          <Row icon="wallet" label="Payment methods" value="Not connected" onPress={() => router.push('/payment-methods')} />
        </Section>

        <Section title="You">
          <Row icon="stats-chart" label="Progress & measurements" onPress={() => router.push('/(tabs)/progress')} />
          <Row icon="extension-puzzle" label="Connected apps & integrations" value="View" onPress={() => router.push('/integrations' as any)} />
          <Row icon="gift" label="Share your FitConnect invite"
            value={profile?.referral_code ?? undefined} onPress={shareReferral} />
          <Row icon="logo-whatsapp" label="Invite via WhatsApp"
            onPress={() => shareOnWhatsApp(`Take a look at FitConnect — a Saudi trainer-booking marketplace in development. My invite code is ${profile?.referral_code ?? 'FIT-FRIEND'}.`)} />
        </Section>

        {/* Safety & accessibility */}
        <Section title="Safety & accessibility">
          <Row icon="alert-circle" label="Emergency contact"
            value={profile?.emergency_contact_name ? `${profile.emergency_contact_name}` : 'Add'}
            onPress={() => router.push('/edit-profile')} />
          <ToggleRow icon="contrast" label="High-contrast mode"
            value={!!profile?.high_contrast} onChange={(v) => savePreference({ high_contrast: v })} />
          <ToggleRow icon="text" label="Large text"
            value={!!profile?.large_text} onChange={(v) => savePreference({ large_text: v })} />
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
      <Txt style={styles.sectionTitle}>{title.toUpperCase()}</Txt>
      <Card padded={false}>{children}</Card>
    </View>
  );
}

function Row({ icon, label, value, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && onPress ? { opacity: 0.7 } : null]}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={colors.primary} /></View>
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
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={colors.primary} /></View>
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
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerKicker: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.2, color: colors.primary, marginBottom: 5 },
  section: { paddingHorizontal: 20, marginTop: 12 },
  sectionTitle: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.15, color: colors.textDim, marginBottom: 9, marginTop: 9 },
  profileCard: { backgroundColor: colors.primaryTint, borderColor: colors.primaryBorder },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  signout: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  becomeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  becomeIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
});
