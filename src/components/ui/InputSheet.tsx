import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radius } from '@/theme';
import { Txt } from './Txt';
import { Button } from './Button';
import { useLocale } from '@/context/locale';

interface Field {
  key: string;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  initial?: string;
  multiline?: boolean;
  maxLength?: number;
}

interface Props {
  visible: boolean;
  title: string;
  fields: Field[];
  submitLabel?: string;
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  onClose: () => void;
}

/** Bottom-sheet style dialog for quick data entry (log weight, add PR…). */
export function InputSheet({ visible, title, fields, submitLabel, onSubmit, onClose }: Props) {
  const { isRTL, t } = useLocale();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = (f: Field) => values[f.key] ?? f.initial ?? '';
  const canSubmit = fields.every((f) => value(f).trim().length > 0);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(Object.fromEntries(fields.map((f) => [f.key, value(f).trim()])));
      setValues({});
      onClose();
    } catch (e: any) {
      setError(e?.message ?? t('common.saveError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <Txt variant="sectionTitle">{title}</Txt>
          {fields.map((f) => (
            <View key={f.key} style={{ marginTop: 14 }}>
              <Txt variant="label" style={{ marginBottom: 8 }}>{f.label}</Txt>
              <View style={styles.inputWrap}>
                <TextInput
                  value={value(f)}
                  onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textDim}
                  keyboardType={f.keyboardType ?? 'default'}
                  multiline={f.multiline}
                  maxLength={f.maxLength}
                  textAlignVertical={f.multiline ? 'top' : 'center'}
                  style={[styles.input, f.multiline && styles.multiline, isRTL && styles.inputRTL]}
                />
              </View>
            </View>
          ))}
          {error && <Txt variant="caption" color={colors.danger} style={{ marginTop: 12 }}>{error}</Txt>}
          <Button title={submitLabel ?? t('common.save')} onPress={submit} disabled={!canSubmit} loading={busy} style={{ marginTop: 20 }} />
          <Pressable onPress={onClose} style={{ marginTop: 12, alignSelf: 'center' }} hitSlop={8}>
            <Txt variant="caption">{t('common.cancel')}</Txt>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 22, paddingBottom: 34,
    borderWidth: 1, borderColor: colors.border,
  },
  inputWrap: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14 },
  input: { color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 13 },
  multiline: { minHeight: 110 },
  inputRTL: { fontFamily: undefined, textAlign: 'right', writingDirection: 'rtl' },
});
