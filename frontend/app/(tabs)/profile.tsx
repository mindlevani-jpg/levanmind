import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { useTheme, radius, spacing } from '../../src/theme';

export default function Profile() {
  const { user, signOut } = useAuth();
  const { colors, mode, toggle } = useTheme();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    api.get('/user/stats').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []));

  const doLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      // RN Web's Alert.alert destructive callback is unreliable; use native confirm.
      // eslint-disable-next-line no-alert
      const ok = typeof window !== 'undefined' ? window.confirm('ნამდვილად გსურს გასვლა?') : true;
      if (ok) doLogout();
      return;
    }
    Alert.alert('გასვლა', 'ნამდვილად გსურს გასვლა?', [
      { text: 'გაუქმება', style: 'cancel' },
      { text: 'გასვლა', style: 'destructive', onPress: doLogout },
    ]);
  };

  if (loading || !stats) {
    return <View style={[s.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.accent} /></View>;
  }

  const initials = (user?.name || '?').slice(0, 1).toUpperCase();
  const earned = stats.achievements?.filter((a: any) => a.earned).slice(0, 3) || [];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.avatarWrap}>
          <View style={[s.avatar, { backgroundColor: colors.accentSoft }]}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={[s.name, { color: colors.text }]} testID="profile-name">{user?.name}</Text>
        <Text style={[s.email, { color: colors.textDim }]} testID="profile-email">{user?.email}</Text>

        {/* Streak banner */}
        <View style={[s.streakCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="fire" size={28} color="#FF6B35" />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[s.streakNum, { color: colors.text }]} testID="streak-count">{stats.streak} დღე</Text>
            <Text style={[s.streakLabel, { color: colors.textDim }]}>მიმდინარე სერია</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/achievements')} testID="open-achievements-btn">
            <Text style={[s.streakLink, { color: colors.accent }]}>მიღწევები →</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.statRow}>
            <View style={s.statCol}>
              <Ionicons name="calendar-outline" size={26} color={colors.accent} />
              <Text style={[s.statNum, { color: colors.text }]} testID="stat-days">{stats.mindful_days}</Text>
              <Text style={[s.statLabel, { color: colors.textDim }]}>მაინდფულ დღეები</Text>
            </View>
            <View style={s.statCol}>
              <MaterialCommunityIcons name="meditation" size={26} color={colors.accent} />
              <Text style={[s.statNum, { color: colors.text }]} testID="stat-minutes">{stats.mindful_minutes}</Text>
              <Text style={[s.statLabel, { color: colors.textDim }]}>მაინდფულ წუთები</Text>
            </View>
          </View>
          <View style={s.statRow}>
            <View style={s.statCol}>
              <Ionicons name="headset-outline" size={26} color={colors.accent} />
              <Text style={[s.statNum, { color: colors.text }]} testID="stat-sessions">{stats.total_sessions}</Text>
              <Text style={[s.statLabel, { color: colors.textDim }]}>სულ სესიები</Text>
            </View>
            <View style={s.statCol}>
              <Ionicons name="trophy-outline" size={26} color={colors.accent} />
              <Text style={[s.statNum, { color: colors.text }]} testID="stat-achievements">{stats.achievements_earned}/{stats.achievements_total}</Text>
              <Text style={[s.statLabel, { color: colors.textDim }]}>მიღწევები</Text>
            </View>
          </View>
        </View>

        {/* Earned achievements preview */}
        {earned.length > 0 && (
          <>
            <Text style={[s.section, { color: colors.text }]}>ბოლო მიღწევები</Text>
            <View style={s.achRow}>
              {earned.map((a: any) => (
                <View key={a.id} style={[s.achBadge, { backgroundColor: colors.card, borderColor: colors.accent }]}>
                  <Ionicons name={a.icon} size={28} color={colors.accent} />
                  <Text style={[s.achTitle, { color: colors.text }]} numberOfLines={1}>{a.title}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Quick actions */}
        <Text style={[s.section, { color: colors.text }]}>სწრაფი მოქმედებები</Text>
        <TouchableOpacity testID="open-journal-btn" style={[s.action, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/journal')}>
          <Ionicons name="book-outline" size={22} color={colors.accent} />
          <Text style={[s.actionText, { color: colors.text }]}>დღიური</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </TouchableOpacity>
        <TouchableOpacity testID="open-achievements-btn-2" style={[s.action, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/achievements')}>
          <Ionicons name="trophy-outline" size={22} color={colors.accent} />
          <Text style={[s.actionText, { color: colors.text }]}>ყველა მიღწევა</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </TouchableOpacity>

        {/* Theme toggle */}
        <Text style={[s.section, { color: colors.text }]}>პარამეტრები</Text>
        <View style={[s.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={22} color={colors.accent} />
          <Text style={[s.actionText, { color: colors.text }]}>
            {mode === 'dark' ? 'მუქი რეჟიმი' : 'ღია რეჟიმი'}
          </Text>
          <Switch
            testID="theme-toggle"
            value={mode === 'dark'}
            onValueChange={toggle}
            trackColor={{ false: colors.border, true: colors.accentMuted }}
            thumbColor={colors.accent}
          />
        </View>

        <TouchableOpacity testID="logout-btn" style={s.logout} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ff6b6b" />
          <Text style={s.logoutText}>გასვლა</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.xl, paddingBottom: 120, alignItems: 'center' },
  avatarWrap: { marginTop: spacing.md },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  name: { fontSize: 24, fontWeight: '700', marginTop: spacing.md },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFB80022', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 6, borderWidth: 1, borderColor: '#FFB800' },
  premiumText: { color: '#FFB800', fontSize: 11, fontWeight: '700', marginLeft: 4, letterSpacing: 1 },
  email: { fontSize: 14, marginTop: 4, marginBottom: spacing.lg },
  streakCard: { width: '100%', flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, marginBottom: spacing.md },
  streakNum: { fontSize: 22, fontWeight: '700' },
  streakLabel: { fontSize: 12, marginTop: 2 },
  streakLink: { fontWeight: '600' },
  statsCard: { width: '100%', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: spacing.md },
  statCol: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 26, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  section: { fontSize: 18, fontWeight: '700', alignSelf: 'flex-start', marginTop: spacing.xl, marginBottom: spacing.md },
  achRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  achBadge: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginHorizontal: 4 },
  achTitle: { fontSize: 11, marginTop: 6, fontWeight: '600' },
  action: { width: '100%', flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
  actionText: { flex: 1, marginLeft: spacing.md, fontSize: 15, fontWeight: '500' },
  toggleRow: { width: '100%', flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
  logout: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  logoutText: { color: '#ff6b6b', marginLeft: spacing.sm, fontWeight: '600' },
});
