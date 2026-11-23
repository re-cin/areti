import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, fonts } from '@/theme';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={{ width: 40, height: 30, alignItems: 'center', justifyContent: 'center' }}>
      {focused && (
        <View
          style={{
            position: 'absolute',
            width: 30,
            height: 30,
            borderRadius: 15,
            top: 6,
            backgroundColor: colors.terracotta,
          }}
        />
      )}
      <Icon name={name} size={24} strokeWidth={1.8} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade', // tabs cross-fade instead of jumping (also when a reminder opens Pomodoro)
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.ink,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: 78,
          paddingTop: 8,
        },
        sceneStyle: { backgroundColor: colors.page },
        tabBarLabelStyle: { fontFamily: fonts.semiBold, fontSize: 11 },
      }}>
      <Tabs.Screen name="planner" options={{ title: 'Planner', tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} /> }} />
      <Tabs.Screen name="pomodoro" options={{ title: 'Pomodoro', tabBarIcon: ({ focused }) => <TabIcon name="clock" focused={focused} /> }} />
      <Tabs.Screen name="statistics" options={{ title: 'Statistics', tabBarIcon: ({ focused }) => <TabIcon name="stats" focused={focused} /> }} />
      <Tabs.Screen name="reti" options={{ title: 'Reti', tabBarIcon: ({ focused }) => <TabIcon name="ghost" focused={focused} /> }} />
    </Tabs>
  );
}
