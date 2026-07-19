import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { colors, fonts } from '@/theme';
import { useLocale } from '@/context/locale';

export default function TrainerLayout() {
  const { t } = useLocale();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingTop: 9,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
        },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 10, marginTop: 2 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.business'), tabBarIcon: ({ color, size, focused }) => <TabIcon name={focused ? 'grid' : 'grid-outline'} size={size} color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: t('nav.bookings'), tabBarIcon: ({ color, size, focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: t('nav.messages'), tabBarIcon: ({ color, size, focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: t('nav.account'), tabBarIcon: ({ color, size, focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} size={size} color={color} focused={focused} /> }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color, size, focused }: { name: keyof typeof Ionicons.glyphMap; color: string; size: number; focused: boolean }) {
  return <View style={[styles.icon, focused && styles.iconActive]}><Ionicons name={name} size={focused ? size - 1 : size} color={color} /></View>;
}

const styles = StyleSheet.create({
  icon: { width: 38, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: colors.primaryTintStrong },
});
