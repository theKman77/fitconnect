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

export default function SignIn() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { signIn, signUp, sendPasswordReset, isDemo } = useAuth();
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
      notify('Google sign-in unavailable', 'Enable the Google provider in Supabase (Authentication → Providers) to turn this on.');
    }
  }

  async function submit() {
    setError(null);
    if (isDemo) {
      router.replace('/(auth)/onboarding');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (mode === 'up' && name.trim().length < 2) return setError('Enter your full name.');
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
        'Confirm your email',
        `We sent a confirmation link to ${email}. Tap it, then come back and sign in.`,
      );
      setMode('in');
    } else {
      router.replace('/');
    }
  }

  async function forgotPassword() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter your email above first.');
      return;
    }
    setBusy(true);
    const result = await sendPasswordReset(email);
    setBusy(false);
    if (result.error) setError(result.error);
    else notify('Check your email', 'Use the FitConnect reset link to choose a new password.');
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.body}>
          <Txt variant="screenTitle">{mode === 'in' ? 'Welcome back' : 'Create your account'}</Txt>
          <Txt variant="body" style={{ marginTop: 8, marginBottom: 28 }}>
            {mode === 'in' ? 'Sign in to book and manage sessions.' : 'Join to book vetted trainers near you.'}
          </Txt>

          {mode === 'up' && (
            <Field icon="person-outline" placeholder="Full name" value={name} onChangeText={setName} />
          )}
          <Field icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" />
          <Field icon="lock-closed-outline" placeholder="Password" value={password} onChangeText={setPassword}
            secureTextEntry />
          {mode === 'in' && (
            <Pressable onPress={forgotPassword} style={{ alignSelf: 'flex-end', marginTop: -3, marginBottom: 12 }} hitSlop={8}>
              <Txt variant="caption" color={colors.primary}>Forgot password?</Txt>
            </Pressable>
          )}

          {error && <Txt variant="caption" color={colors.danger} style={{ marginBottom: 10 }}>{error}</Txt>}

          <Button
            title={isDemo ? 'Continue (demo)' : mode === 'in' ? 'Sign in' : 'Create account'}
            onPress={submit}
            loading={busy}
            style={{ marginTop: 8 }}
          />
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Txt variant="caption">or</Txt>
            <View style={styles.orLine} />
          </View>
          <Button title="Continue with Google" variant="secondary" icon="logo-google" onPress={signInWithGoogle} />
          <Pressable onPress={() => setMode(mode === 'in' ? 'up' : 'in')} style={{ marginTop: 18 }}>
            <Txt variant="caption" center>
              {mode === 'in' ? "Don't have an account? " : 'Already have an account? '}
              <Txt variant="caption" color={colors.primary}>{mode === 'in' ? 'Sign up' : 'Sign in'}</Txt>
            </Txt>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { icon: keyof typeof Ionicons.glyphMap }) {
  const { icon, ...rest } = props;
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={colors.textDim} />
      <TextInput
        {...rest}
        placeholderTextColor={colors.textDim}
        style={styles.input}
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
});
