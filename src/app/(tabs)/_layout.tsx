import { borders, colors, fonts } from '@/theme';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { 
          backgroundColor: colors.surface, 
          borderTopColor: colors.ink, 
          borderTopWidth: borders.width, 
          height: 72 
        },
        tabBarLabelStyle: { fontFamily: fonts.semiBold, fontSize: 11 },
        tabBarIcon: () => null,
      }}>
      <Tabs.Screen name="planner" options={{ title: 'Planner' }} />
      <Tabs.Screen name="pomodoro" options={{ title: 'Pomodoro' }} />
      <Tabs.Screen name="statistics" options={{ title: 'Statistics' }} />
      <Tabs.Screen name="reti" options={{ title: 'Reti' }} />
    </Tabs>
  );
}

