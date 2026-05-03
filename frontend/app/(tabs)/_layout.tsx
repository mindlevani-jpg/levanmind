import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.bgDeep,
          borderTopColor: colors.border,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'მედიტაცია',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="meditation" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'ბიბლიოთეკა',
          tabBarIcon: ({ color }) => <Ionicons name="bookmark-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sleep"
        options={{
          title: 'ძილი',
          tabBarIcon: ({ color }) => <Ionicons name="moon-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'აღმოაჩინე',
          tabBarIcon: ({ color }) => <Ionicons name="search-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'პროფილი',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
