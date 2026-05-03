import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { colors, radius, spacing } from '../../src/theme';

export default function Profile() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    api.get('/user/stats').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []));

  const confirmLogout = () => {
    Alert.alert('გასვლა', 'ნამდვილად გსურს გასვლა?', [
      { text: 'გაუქმება', style: 'cancel' },
      { text: 'გასვლა', style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/login'); } },
    ]);
  };

  if (loading || !stats) return <View style={s.center}><ActivityIndicator color={colors.accent} /></View>;

  const initials = (user?.name || '?').slice(0, 1).toUpperCase();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={s.name} testID="profile-name">{user?.name}</Text>
        <Text style={s.email} testID="profile-email">{user?.email}</Text>
        <TouchableOpacity><Text style={s.edit}>პროფილის რედაქტირება</Text></TouchableOpacity>

        <View style={s.statsCard}>
          <View style={s.statRow}>
            <View style={s.statCol}>
              <Ionicons name="calendar-outline" size={26} color={colors.accent} />
              <Text style={s.statNum} testID="stat-days">{stats.mindful_days}</Text>
              <Text style={s.statLabel}>მაინდფულ დღეები</Text>
            </View>
            <View style={s.statCol}>
              <MaterialCommunityIcons name="meditation" size={26} color={colors.accent} />
              <Text style={s.statNum} testID="stat-minutes">{stats.mindful_minutes}</Text>
              <Text style={s.statLabel}>მაინდფულ წუთები</Text>
            </View>
          </View>
          <View style={s.statRow}>
            <View style={s.statCol}>
              <Ionicons name="headset-outline" size={26} color={colors.accent} />
              <Text style={s.statNum} testID="stat-sessions">{stats.total_sessions}</Text>
              <Text style={s.statLabel}>სულ სესიები</Text>
            </View>
            <View style={s.statCol}>
              <Ionicons name="school-outline" size={26} color={colors.accent} />
              <Text style={s.statNum} testID="stat-courses">{stats.total_courses}</Text>
              <Text style={s.statLabel}>სულ კურსები</Text>
            </View>
          </View>
          <View style={s.divider} />
          <TouchableOpacity><Text style={s.historyLink}>ისტორიული სტატისტიკა</Text></TouchableOpacity>
        </View>

        <Text style={s.section}>ჩემი სერიები</Text>
        <View style={s.card}>
          <Text style={s.cardSub}>შენი სერიები გამოჩნდება აქ ყოველდღიური მედიტაციის შემდეგ.</Text>
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
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.xl, paddingBottom: 120, alignItems: 'center' },
  avatarWrap: { marginTop: spacing.md },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  name: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: spacing.md },
  email: { color: colors.textDim, fontSize: 14, marginTop: 4 },
  edit: { color: colors.accent, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.lg },
  statsCard: { width: '100%', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: spacing.md },
  statCol: { alignItems: 'center', flex: 1 },
  statNum: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 4 },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  historyLink: { color: colors.accent, textAlign: 'center', fontWeight: '600', padding: spacing.sm },
  section: { color: colors.text, fontSize: 22, fontWeight: '700', alignSelf: 'flex-start', marginTop: spacing.xl, marginBottom: spacing.md },
  card: { width: '100%', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  cardSub: { color: colors.textDim, fontSize: 13 },
  logout: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  logoutText: { color: '#ff6b6b', marginLeft: spacing.sm, fontWeight: '600' },
});
