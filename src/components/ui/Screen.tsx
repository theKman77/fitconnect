import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle, ScrollViewProps } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors } from '@/theme';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
  style?: ViewStyle;
  scrollProps?: ScrollViewProps;
}

/** Full-bleed dark screen with safe-area handling and optional scroll. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  contentStyle,
  style,
  scrollProps,
}: Props) {
  const inner = padded ? styles.padded : undefined;
  return (
    <SafeAreaView style={[styles.root, style]} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[inner, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, inner, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  padded: { paddingHorizontal: 22 },
});
