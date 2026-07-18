import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { uploadFile, extFor } from '@/lib/storage';
import { supabase, isBackendConfigured } from '@/lib/supabase';
import { notify } from '@/lib/confirm';
import { Avatar, Button, Txt } from '@/components/ui';

export default function EditProfile() {
  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [ecName, setEcName] = useState(profile?.emergency_contact_name ?? '');
  const [ecPhone, setEcPhone] = useState(profile?.emergency_contact_phone ?? '');
  const [instagram, setInstagram] = useState(profile?.socials?.instagram ?? '');
  const [tiktok, setTiktok] = useState(profile?.socials?.tiktok ?? '');
  const [xHandle, setXHandle] = useState(profile?.socials?.x ?? '');
  const [youtube, setYoutube] = useState(profile?.socials?.youtube ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const clean = (s: string) => s.trim().replace(/^@/, '');

  async function changeAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0] || !profile) return;
    setUploading(true);
    try {
      const url = await uploadFile('avatars', profile.id, result.assets[0].uri, extFor(result.assets[0].uri, 'image'));
      await updateProfile({ avatar_url: url });
      // Keep the public trainer card in sync if this user is also a trainer.
      if (isBackendConfigured) {
        const { error } = await supabase.from('trainers').update({ avatar_url: url }).eq('profile_id', profile.id);
        if (error) throw error;
      }
    } catch (e: any) {
      notify('Upload failed', e?.message ?? 'Could not upload the photo.');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    const socials: Record<string, string> = {};
    if (clean(instagram)) socials.instagram = clean(instagram);
    if (clean(tiktok)) socials.tiktok = clean(tiktok);
    if (clean(xHandle)) socials.x = clean(xHandle);
    if (clean(youtube)) socials.youtube = clean(youtube);
    try {
      await updateProfile({
        full_name: name.trim(),
        city: city.trim(),
        phone: phone.trim() || null,
        emergency_contact_name: ecName.trim() || null,
        emergency_contact_phone: ecPhone.trim() || null,
        socials,
      });
      if (isBackendConfigured && profile) {
        const { error } = await supabase.from('trainers').update({
          display_name: name.trim(),
          city: city.trim() || null,
          socials,
        }).eq('profile_id', profile.id);
        if (error) throw error;
      }
      router.back();
    } catch (e: any) {
      notify('Changes not saved', e?.message ?? 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
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
            <Pressable onPress={changeAvatar} disabled={uploading}>
              <Avatar uri={profile?.avatar_url} name={name} size={84} />
              <View style={styles.avatarBadge}>
                <Ionicons name={uploading ? 'hourglass' : 'camera'} size={14} color={colors.white} />
              </View>
            </Pressable>
            <Txt variant="caption" style={{ marginTop: 8 }}>
              {uploading ? 'Uploading…' : 'Tap to change photo'}
            </Txt>
          </View>

          <Txt variant="label" style={styles.label}>Full name</Txt>
          <Field value={name} onChangeText={setName} placeholder="Your name" />

          <Txt variant="label" style={styles.label}>City</Txt>
          <Field value={city} onChangeText={setCity} placeholder="e.g. Riyadh" />

          <Txt variant="label" style={styles.label}>Phone</Txt>
          <Field value={phone} onChangeText={setPhone} placeholder="+966 5x xxx xxxx" keyboardType="phone-pad" />

          <Txt variant="sectionTitle" style={{ marginTop: 28, marginBottom: 4 }}>Socials</Txt>
          <Txt variant="caption" style={{ marginBottom: 10 }}>
            Shown on your public profile. Handles only — no @ needed.
          </Txt>
          <Txt variant="label" style={styles.label}>Instagram</Txt>
          <Field value={instagram} onChangeText={setInstagram} placeholder="username" autoCapitalize="none" />
          <Txt variant="label" style={styles.label}>TikTok</Txt>
          <Field value={tiktok} onChangeText={setTiktok} placeholder="username" autoCapitalize="none" />
          <Txt variant="label" style={styles.label}>X (Twitter)</Txt>
          <Field value={xHandle} onChangeText={setXHandle} placeholder="username" autoCapitalize="none" />
          <Txt variant="label" style={styles.label}>YouTube</Txt>
          <Field value={youtube} onChangeText={setYoutube} placeholder="channel" autoCapitalize="none" />

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
  avatarBadge: {
    position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.bg,
  },
  label: { marginTop: 14, marginBottom: 8 },
  fieldWrap: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingHorizontal: 15,
  },
  input: { color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 14 },
  footer: { padding: 22, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
});
