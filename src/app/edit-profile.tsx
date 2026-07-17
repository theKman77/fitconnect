import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { Avatar, Button, Txt } from '@/components/ui';

export default function EditProfile() {
  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [ecName, setEcName] = useState(profile?.emergency_contact_name ?? '');
  const [ecPhone, setEcPhone] = useState(profile?.emergency_contact_phone ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await updateProfile({
      full_name: name,
      city,
      phone: phone || null,
      emergency_contact_name: ecName || null,
      emergency_contact_phone: ecPhone || null,
    });
    setSaving(false);
    router.back();
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Txt variant="sectionTitle">Edit profile</Txt>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 22 }} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarWrap}>
            <Avatar uri={profile?.avatar_url} name={name} size={84} />
          </View>

          <Txt variant="label" style={styles.label}>Full name</Txt>
          <Field value={name} onChangeText={setName} placeholder="Your name" />

          <Txt variant="label" style={styles.label}>City</Txt>
          <Field value={city} onChangeText={setCity} placeholder="e.g. Riyadh" />

          <Txt variant="label" style={styles.label}>Phone</Txt>
          <Field value={phone} onChangeText={setPhone} placeholder="+966 5x xxx xxxx" keyboardType="phone-pad" />

          <Txt variant="sectionTitle" style={{ marginTop: 28, marginBottom: 4 }}>Emergency contact</Txt>
          <Txt variant="caption" style={{ marginBottom: 10 }}>
            Shared with your trainer only if you trigger SOS during a session.
          </Txt>

          <Txt variant="label" style={styles.label}>Contact name</Txt>
          <Field value={ecName} onChangeText={setEcName} placeholder="e.g. Sam" />

          <Txt variant="label" style={styles.label}>Contact phone</Txt>
          <Field value={ecPhone} onChangeText={setEcPhone} placeholder="+966 5x xxx xxxx" keyboardType="phone-pad" />
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Save changes" onPress={save} loading={saving} disabled={!name.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldWrap}>
      <TextInput {...props} placeholderTextColor={colors.textDim} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  avatarWrap: { alignItems: 'center', marginBottom: 20 },
  label: { marginTop: 14, marginBottom: 8 },
  fieldWrap: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingHorizontal: 15,
  },
  input: { color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 14 },
  footer: { padding: 22, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
});
