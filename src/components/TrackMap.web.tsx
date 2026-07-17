import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { Txt } from './ui/Txt';

export interface LatLng {
  lat: number;
  lng: number;
}
interface Props {
  trainer?: LatLng | null;
  destination?: LatLng | null;
}

/** Web fallback — react-native-maps has no web support; show a styled panel. */
export function TrackMap(_props: Props) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#14231C', '#101013']} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        <Ionicons name="map" size={30} color={colors.textFaint} />
        <Txt variant="caption" style={{ marginTop: 8, color: colors.textFaint }}>
          Live map available in the mobile app
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
