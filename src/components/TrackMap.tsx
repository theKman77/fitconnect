import { StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
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

// react-native-maps has native code that Expo Go can't load. Only require it in a
// real build (dev client / production); Expo Go falls back to a styled panel so the
// rest of the app keeps working there. On a dev build this renders the real map.
const isExpoGo = Constants.appOwnership === 'expo';
let MapView: any;
let Marker: any;
let PROVIDER_DEFAULT: any;
if (!isExpoGo) {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    PROVIDER_DEFAULT = maps.PROVIDER_DEFAULT;
  } catch {
    // maps unavailable — fall through to the placeholder
  }
}

function Placeholder() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#14231C', '#101013']} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        <Ionicons name="map" size={30} color={colors.textFaint} />
        <Txt variant="caption" style={{ marginTop: 8, color: colors.textFaint }}>
          Live map available in the built app
        </Txt>
      </View>
    </View>
  );
}

/** Live tracking map. Real map on a dev/production build; placeholder in Expo Go. */
export function TrackMap({ trainer, destination }: Props) {
  if (!MapView) return <Placeholder />;

  const center = trainer ?? destination ?? { lat: 24.7136, lng: 46.6753 };
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_DEFAULT}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }}
      region={
        trainer
          ? { latitude: trainer.lat, longitude: trainer.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }
          : undefined
      }
    >
      {destination && (
        <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} title="Session location" />
      )}
      {trainer && (
        <Marker coordinate={{ latitude: trainer.lat, longitude: trainer.lng }} title="Your trainer" pinColor={colors.primary} />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
