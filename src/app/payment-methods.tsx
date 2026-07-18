import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { notify } from '@/lib/confirm';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme';
import { config } from '@/lib/config';
import { Button, Card, EmptyState, Txt } from '@/components/ui';

export default function PaymentMethods() {
  const router = useRouter();

  function addCard() {
    notify('Payment provider required', 'No card is stored and no payment can be collected yet. This activates after the business account is approved by a Saudi payment provider.');
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
        <Card><EmptyState icon="card-outline" title="No payment method connected" subtitle="The web MVP saves demo reservations without charging you." /></Card>

        <Card>
          <View style={styles.cardRow}>
            <View style={styles.mada}><Txt style={styles.madaTxt}>mada</Txt></View>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">Planned Saudi checkout</Txt>
              <Txt variant="caption" style={{ marginTop: 2 }}>mada, Apple Pay and cards after provider approval</Txt>
            </View>
          </View>
        </Card>

        <Button title={config.paymentsEnabled ? 'Open secure checkout during booking' : 'Payment setup not active'} variant="secondary" icon="lock-closed" onPress={addCard} style={{ marginTop: 8 }} />

        <View style={styles.note}>
          <Ionicons name="lock-closed" size={15} color={colors.textMuted} />
          <Txt variant="caption" style={{ flex: 1 }}>
            FitConnect will never store raw card details. The future licensed provider will handle them.
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
  mada: { backgroundColor: colors.surfaceHigh, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  madaTxt: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.textPrimary },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 4 },
});
