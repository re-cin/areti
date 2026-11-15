import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, fonts } from '@/theme';

/** Tab icon with the terracotta blob behind it when the tab is active. */
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
            bottom: -6,
            zIndex: 0,
            backgroundColor: colors.terracotta,
          }}
        />
      )}
      <View style={{ zIndex: 1 }}>
        <Icon name={name} size={24} strokeWidth={1.8} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.ink,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          height: 80,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontFamily: fonts.semiBold, fontSize: 11, marginTop: 4 },
      }}>
      <Tabs.Screen
        name="planner"
        options={{ title: 'Planner', tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} /> }}
      />
      <Tabs.Screen
        name="pomodoro"
        options={{ title: 'Pomodoro', tabBarIcon: ({ focused }) => <TabIcon name="clock" focused={focused} /> }}
      />
      <Tabs.Screen
        name="statistics"
        options={{ title: 'Statistics', tabBarIcon: ({ focused }) => <TabIcon name="stats" focused={focused} /> }}
      />
      <Tabs.Screen
        name="reti"
        options={{ title: 'Reti', tabBarIcon: ({ focused }) => <TabIcon name="ghost" focused={focused} /> }}
      />
    </Tabs>
  );
}
