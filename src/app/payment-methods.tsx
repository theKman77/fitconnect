import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme';
import { isBackendConfigured } from '@/lib/supabase';
import { Badge, Button, Card, Txt } from '@/components/ui';

export default function PaymentMethods() {
  const router = useRouter();

  function addCard() {
    if (!isBackendConfigured) {
      Alert.alert(
        'Demo mode',
        'Adding real cards switches on with the live backend + payment provider (Moyasar). For now, checkout uses this demo card.',
      );
      return;
    }
    Alert.alert('Coming soon', 'Card management arrives with the payments milestone.');
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Txt variant="sectionTitle">Payment methods</Txt>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 22, gap: 12 }} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.cardRow}>
            <View style={styles.visa}><Txt style={styles.visaTxt}>VISA</Txt></View>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">•••• 4242</Txt>
              <Txt variant="caption" style={{ marginTop: 2 }}>Expires 12/28</Txt>
            </View>
            <Badge label="DEFAULT" tone="brand" />
          </View>
        </Card>

        <Card>
          <View style={styles.cardRow}>
            <View style={styles.mada}><Txt style={styles.madaTxt}>mada</Txt></View>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">Supported at launch</Txt>
              <Txt variant="caption" style={{ marginTop: 2 }}>mada, Apple Pay & cards via Moyasar</Txt>
            </View>
          </View>
        </Card>

        <Button title="Add payment method" variant="secondary" icon="add" onPress={addCard} style={{ marginTop: 8 }} />

        <View style={styles.note}>
          <Ionicons name="lock-closed" size={15} color={colors.textMuted} />
          <Txt variant="caption" style={{ flex: 1 }}>
            Card details are stored by the payment provider, never on FitConnect servers.
          </Txt>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  visa: { backgroundColor: '#1434CB', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  visaTxt: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.white, letterSpacing: 1 },
  mada: { backgroundColor: colors.surfaceHigh, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  madaTxt: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.textPrimary },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 4 },
});
