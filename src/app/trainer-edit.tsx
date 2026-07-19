import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { getMyTrainer } from '@/lib/trainer';
import { uploadFile, extFor } from '@/lib/storage';
import { supabase, isBackendConfigured } from '@/lib/supabase';
import { notify } from '@/lib/confirm';
import { Button, Chip, Txt } from '@/components/ui';
import type { Trainer } from '@/types/domain';
import { useLocale } from '@/context/locale';
import { localizeDomain } from '@/lib/localize-domain';

const SPECIALTIES = ['Strength', 'Conditioning', 'HIIT', 'Boxing', 'Yoga', 'Mobility', 'Pilates', 'Running', 'Powerlifting', 'Nutrition'];

export default function TrainerEdit() {
  const router = useRouter();
  const { profile } = useAuth();
  const { locale, isRTL, tr } = useLocale();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [price, setPrice] = useState('');
  const [specs, setSpecs] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    getMyTrainer(profile).then((t) => {
      if (!t) return;
      setTrainer(t);
      setHeadline(t.headline ?? '');
      setBio(t.bio ?? '');
      setPrice(String(t.base_price));
      setSpecs(t.specialties);
      setVideoUrl(t.video_intro_url);
    }).catch(() => setLoadError(tr('Could not load trainer settings.')));
  }, [profile, tr]));

  const toggleSpec = (s: string) =>
    setSpecs((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  async function pickVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      videoMaxDuration: 60,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0] || !profile) return;
    setUploading(true);
    try {
      const url = await uploadFile('videos', profile.id, result.assets[0].uri, extFor(result.assets[0].uri, 'video'));
      setVideoUrl(url);
    } catch (e: any) {
      notify(tr('Upload failed'), e?.message ?? tr('Could not upload the video.'));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!trainer) return;
    const base = Math.max(1, parseFloat(price) || trainer.base_price);
    setSaving(true);
    try {
      if (isBackendConfigured) {
        const { error } = await supabase.from('trainers').update({
          headline: headline || null,
          bio: bio || null,
          base_price: base,
          specialties: specs,
          video_intro_url: videoUrl,
        }).eq('id', trainer.id);
        if (error) throw error;
        // Keep plan prices in step with the base rate.
        const { data: plans } = await supabase.from('session_types').select('id,kind').eq('trainer_id', trainer.id);
        for (const p of plans ?? []) {
          const mult = p.kind === 'pack' ? 4.5 : p.kind === 'subscription' ? 5.4 : 1;
          const { error: planError } = await supabase.from('session_types').update({ price: Math.round(base * mult) }).eq('id', p.id);
          if (planError) throw planError;
        }
      }
      router.back();
    } catch (e: any) {
      notify(tr('Changes not saved'), e?.message ?? tr('Check your connection and try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.textPrimary} />
        </Pressable>
        <Txt variant="sectionTitle">{tr('Trainer settings')}</Txt>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 22 }} showsVerticalScrollIndicator={false}>
          {loadError && <Txt variant="caption" color={colors.danger} style={{ marginBottom: 10 }}>{loadError}</Txt>}
          <Txt variant="label" style={styles.label}>{tr('Headline')}</Txt>
          <Field value={headline} onChangeText={setHeadline} placeholder={isRTL ? 'مثال: مدرب قوة ولياقة' : 'e.g. Strength & conditioning coach'} />

          <Txt variant="label" style={styles.label}>{tr('Bio')}</Txt>
          <View style={styles.fieldWrap}>
            <TextInput value={bio} onChangeText={setBio} placeholder={tr('Tell clients how you coach…')}
              placeholderTextColor={colors.textDim} multiline style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }, isRTL && styles.inputRTL]} />
          </View>

          <Txt variant="label" style={styles.label}>{tr('Price per session (SAR)')}</Txt>
          <Field value={price} onChangeText={setPrice} placeholder="200" keyboardType="numeric" />
          <Txt variant="caption" style={{ marginTop: 6 }}>
            {tr('Pack and monthly plan prices update automatically from this rate.')}
          </Txt>

          <Txt variant="label" style={styles.label}>{tr('Specialties')}</Txt>
          <View style={[styles.chips, isRTL && styles.rtlWrap]}>
            {SPECIALTIES.map((s) => (
              <Chip key={s} label={localizeDomain(s, locale)} selected={specs.includes(s)} onPress={() => toggleSpec(s)} />
            ))}
          </View>

          <Txt variant="label" style={styles.label}>{tr('Video intro')}</Txt>
          <Pressable style={[styles.videoBtn, isRTL && styles.rtlRow]} onPress={pickVideo} disabled={uploading}>
            <Ionicons name={videoUrl ? 'checkmark-circle' : 'videocam'} size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">
                {uploading ? tr('Uploading…') : videoUrl ? tr('Video uploaded — tap to replace') : tr('Upload a video intro')}
              </Txt>
              <Txt variant="caption" style={{ marginTop: 2 }}>{tr('Up to 60 seconds. Shown on your public profile.')}</Txt>
            </View>
          </Pressable>
          {videoUrl && (
            <Pressable onPress={() => setVideoUrl(null)} style={{ marginTop: 10, alignSelf: 'flex-start' }} hitSlop={6}>
              <Txt variant="caption" color={colors.danger}>{tr('Remove video')}</Txt>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button title={tr('Save changes')} onPress={save} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  const { isRTL } = useLocale();
  return (
    <View style={styles.fieldWrap}>
      <TextInput {...props} placeholderTextColor={colors.textDim} style={[styles.input, isRTL && styles.inputRTL]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  label: { marginTop: 18, marginBottom: 8 },
  fieldWrap: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 15 },
  input: { color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  videoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: colors.primaryBorder, borderStyle: 'dashed',
    borderRadius: radius.lg, padding: 16,
  },
  footer: { padding: 22, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  rtlWrap: { direction: 'ltr', flexDirection: 'row-reverse' },
  inputRTL: { textAlign: 'right', writingDirection: 'rtl' },
});
