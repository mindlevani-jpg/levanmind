import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/theme';

function RootNav() {
  const { user, loading } = useAuth();
  const { colors, mode } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [welcomeShown, setWelcomeShown] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('welcome_shown').then(v => setWelcomeShown(v === '1'));
  }, []);

  useEffect(() => {
    if (loading || welcomeShown === null) return;
    const inAuth = segments[0] === '(auth)';
    const onWelcome = segments[0] === 'welcome';
    if (user) {
      if (inAuth || onWelcome) router.replace('/(tabs)');
      return;
    }
    // not authenticated
    if (!welcomeShown && !onWelcome) {
      router.replace('/welcome');
    } else if (welcomeShown && !inAuth) {
      router.replace('/(auth)/login');
    }
  }, [user, loading, segments, welcomeShown]);

  if (loading || welcomeShown === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="player" options={{ presentation: 'modal' }} />
        <Stack.Screen name="journal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="achievements" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNav />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
