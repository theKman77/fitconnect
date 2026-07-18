import { StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts } from '@/theme';
import { Txt } from './Txt';

interface Props {
  compact?: boolean;
  markOnly?: boolean;
  style?: ViewStyle;
}

export function Brand({ compact = false, markOnly = false, style }: Props) {
  const markSize = compact ? 34 : 52;
  return (
    <View style={[styles.row, style]} accessibilityLabel="FitConnect">
      <Image
        source={require('../../../assets/images/brand-mark.png')}
        style={{ width: markSize, height: markSize }}
        contentFit="contain"
      />
      {!markOnly && (
        <View style={styles.wordmark}>
          <Txt style={[styles.fit, compact && styles.fitCompact]}>FIT</Txt>
          <Txt style={[styles.connect, compact && styles.connectCompact]}>CONNECT</Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  fit: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.9, color: colors.primary },
  connect: { fontFamily: fonts.bold, fontSize: 15, letterSpacing: 2.4, color: colors.textPrimary },
  fitCompact: { fontSize: 20 },
  connectCompact: { fontSize: 11, letterSpacing: 1.8 },
});
