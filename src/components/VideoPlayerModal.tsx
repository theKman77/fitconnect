import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors } from '@/theme';

interface Props {
  visible: boolean;
  uri: string;
  onClose: () => void;
}

/** Fullscreen-ish modal player for trainer video intros. */
export function VideoPlayerModal({ visible, uri, onClose }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.frame}>
          <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
        </View>
        <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.white} />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  frame: { width: '92%', aspectRatio: 9 / 14, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  close: { position: 'absolute', top: 54, right: 22 },
});
