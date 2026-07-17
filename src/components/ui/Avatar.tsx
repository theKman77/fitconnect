import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts } from '@/theme';
import { Txt } from './Txt';

interface Props {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

/** Circular avatar; falls back to initials on a branded tint. */
export function Avatar({ uri, name, size = 44 }: Props) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={[dim, styles.img]} contentFit="cover" transition={150} />;
  }
  const initials = (name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={[dim, styles.fallback]}>
      <Txt style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: colors.surfaceElevated },
  fallback: {
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  initials: { fontFamily: fonts.bold, color: colors.primary },
});
