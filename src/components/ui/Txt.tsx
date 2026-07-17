import { Text, TextProps, StyleSheet } from 'react-native';
import { typography } from '@/theme';

type Variant = keyof typeof typography;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

/** Themed text. Pick a typography preset via `variant`; override color freely. */
export function Txt({ variant = 'body', color, center, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        color ? { color } : null,
        center ? styles.center : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({ center: { textAlign: 'center' } });
