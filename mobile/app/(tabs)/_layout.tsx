import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '@/hooks/useResponsive';

export default function TabLayout() {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const { hScale, vScale, spacing, fontSize } = useResponsive();
  const isDark = theme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: Platform.OS === 'ios' ? vScale(84) : vScale(64),
          paddingBottom: Platform.OS === 'ios' ? vScale(28) : vScale(10),
          paddingTop: vScale(10),
          backgroundColor: colors.surface,
          shadowColor: 'transparent',
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: '500',
          marginTop: vScale(-4),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "map" : "map-outline"} size={hScale(24)} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={hScale(24)} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: t('tabs.trips'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "car" : "car-outline"} size={hScale(24)} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={hScale(24)} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
