import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { Button, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { supabase, isBackendConfigured } from '@/lib/supabase';
import { notify } from '@/lib/confirm';
import { useLocale } from '@/context/locale';

export default function SignIn() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { signIn, signUp, sendPasswordReset, isDemo } = useAuth();
  const { isRTL, t } = useLocale();
  const [mode, setMode] = useState<'in' | 'up'>(params.mode === 'up' ? 'up' : 'in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    if (!isBackendConfigured) {
      router.replace('/(auth)/onboarding');
      return;
    }
    const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (error) {
      notify(t('auth.googleUnavailable'), t('auth.googleSetup'));
    }
  }

  async function submit() {
    setError(null);
    if (isDemo) {
      router.replace('/(auth)/onboarding');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t('auth.emailError'));
    if (password.length < 8) return setError(t('auth.passwordError'));
    if (mode === 'up' && name.trim().length < 2) return setError(t('auth.nameError'));
    setBusy(true);
    if (mode === 'in') {
      const res = await signIn(email, password);
      setBusy(false);
      if (res.error) setError(res.error);
      else router.replace('/');
      return;
    }
    const res = await signUp(email, password, name);
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else if (res.needsConfirmation) {
      Alert.alert(
        t('auth.confirmTitle'),
        t('auth.confirmCopy'),
      );
      setMode('in');
    } else {
      router.replace('/');
    }
  }

  async function forgotPassword() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t('auth.emailFirst'));
      return;
    }
    setBusy(true);
    const result = await sendPasswordReset(email);
    setBusy(false);
    if (result.error) setError(result.error);
    else notify(t('auth.checkEmail'), t('auth.resetCopy'));
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.body}>
          <Txt variant="screenTitle">{mode === 'in' ? t('auth.welcomeBack') : t('auth.createAccount')}</Txt>
          <Txt variant="body" style={{ marginTop: 8, marginBottom: 28 }}>
            {mode === 'in' ? t('auth.signInCopy') : t('auth.signUpCopy')}
          </Txt>

          {mode === 'up' && (
            <Field icon="person-outline" placeholder={t('auth.fullName')} value={name} onChangeText={setName} />
          )}
          <Field icon="mail-outline" placeholder={t('auth.email')} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" />
          <Field icon="lock-closed-outline" placeholder={t('auth.password')} value={password} onChangeText={setPassword}
            secureTextEntry />
          {mode === 'in' && (
            <Pressable onPress={forgotPassword} style={{ alignSelf: isRTL ? 'flex-start' : 'flex-end', marginTop: -3, marginBottom: 12 }} hitSlop={8}>
              <Txt variant="caption" color={colors.primary}>{t('auth.forgot')}</Txt>
            </Pressable>
          )}

          {error && <Txt variant="caption" color={colors.danger} style={{ marginBottom: 10 }}>{error}</Txt>}

          <Button
            title={isDemo ? t('auth.continueDemo') : mode === 'in' ? t('auth.signIn') : t('auth.create')}
            onPress={submit}
            loading={busy}
            style={{ marginTop: 8 }}
          />
          <View style={[styles.orRow, isRTL && styles.rtlRow]}>
            <View style={styles.orLine} />
            <Txt variant="caption">{t('auth.or')}</Txt>
            <View style={styles.orLine} />
          </View>
          <Button title={t('auth.google')} variant="secondary" icon="logo-google" onPress={signInWithGoogle} />
          <Pressable onPress={() => setMode(mode === 'in' ? 'up' : 'in')} style={{ marginTop: 18 }}>
            <Txt variant="caption" center>
              {mode === 'in' ? t('auth.noAccount') : t('auth.hasAccount')}
              <Txt variant="caption" color={colors.primary}>{mode === 'in' ? t('auth.signUp') : t('auth.signIn')}</Txt>
            </Txt>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { icon: keyof typeof Ionicons.glyphMap }) {
  const { icon, ...rest } = props;
  const { isRTL } = useLocale();
  return (
    <View style={[styles.field, isRTL && styles.rtlRow]}>
      <Ionicons name={icon} size={18} color={colors.textDim} />
      <TextInput
        {...rest}
        placeholderTextColor={colors.textDim}
        style={[styles.input, isRTL && styles.inputRTL]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { paddingHorizontal: 22, paddingTop: 8 },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 24 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  input: { flex: 1, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 15 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  rtlRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  inputRTL: { textAlign: 'right', writingDirection: 'rtl' },
});
