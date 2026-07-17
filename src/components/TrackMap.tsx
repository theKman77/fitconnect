import { StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors } from '@/theme';

export interface LatLng {
  lat: number;
  lng: number;
}
interface Props {
  trainer?: LatLng | null;
  destination?: LatLng | null;
}

/** Live tracking map (native). iOS uses Apple Maps (no API key needed). */
export function TrackMap({ trainer, destination }: Props) {
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
        <Marker
          coordinate={{ latitude: destination.lat, longitude: destination.lng }}
          title="Session location"
        />
      )}
      {trainer && (
        <Marker
          coordinate={{ latitude: trainer.lat, longitude: trainer.lng }}
          title="Your trainer"
          pinColor={colors.primary}
        />
      )}
    </MapView>
  );
}
