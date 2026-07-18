import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { useAuth } from '@/context/auth';
import { Button, Txt } from '@/components/ui';

export default function ResetPassword() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The passwords do not match.');
    setBusy(true);
    setError(null);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) setError(result.error);
    else router.replace('/');
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}><Pressable onPress={() => router.replace('/(auth)/sign-in')} hitSlop={10}><Ionicons name="chevron-back" size={24} color={colors.textPrimary} /></Pressable></View>
      <View style={styles.body}>
        <Txt variant="screenTitle">Choose a new password</Txt>
        <Txt variant="body" style={{ marginTop: 8, marginBottom: 24 }}>Open this page from the reset email, then enter a new password for your account.</Txt>
        <View style={styles.field}><Ionicons name="lock-closed-outline" size={18} color={colors.textDim} /><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="New password" placeholderTextColor={colors.textDim} style={styles.input} /></View>
        <View style={styles.field}><Ionicons name="checkmark-circle-outline" size={18} color={colors.textDim} /><TextInput value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Confirm password" placeholderTextColor={colors.textDim} style={styles.input} /></View>
        {error && <Txt variant="caption" color={colors.danger} style={{ marginBottom: 10 }}>{error}</Txt>}
        <Button title="Save new password" onPress={save} disabled={!password || !confirm} loading={busy} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 22, paddingTop: 8 },
  body: { flex: 1, padding: 22 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 15, marginBottom: 12 },
  input: { flex: 1, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 15 },
});
