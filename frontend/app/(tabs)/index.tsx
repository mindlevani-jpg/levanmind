import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { colors, radius, spacing } from '../../src/theme';

type Session = {
  id: string; title: string; duration_min: number; category: string;
  category_label: string; description: string; icon: string; color: string;
};

function greeting(name: string) {
  const h = new Date().getHours();
  if (h < 6) return `მშვიდი ღამე, ${name}`;
  if (h < 12) return `დილა მშვიდობისა, ${name}`;
  if (h < 18) return `შუადღე მშვიდობისა, ${name}`;
  return `საღამო მშვიდობისა, ${name}`;
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('12:41:59');

  useEffect(() => {
    api.get('/sessions').then(r => setSessions(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const tick = () => {
      const end = new Date(); end.setHours(23, 59, 59, 0);
      const diff = Math.max(0, end.getTime() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const beginner = sessions.find(s => s.id === 'morning-meditation');
  const evening = sessions.find(s => s.id === 'night-sky');

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  const go = (id: string) => router.push({ pathname: '/player', params: { id } });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.hello} testID="home-greeting">{greeting(user?.name || 'მოგზაურო')}</Text>
        <Text style={s.h1}>დავიწყოთ თქვენი მოგზაურობა</Text>

        <TouchableOpacity style={s.banner} testID="special-offer-banner" onPress={() => router.push('/paywall')}>
          <Ionicons name="gift-outline" size={22} color={colors.accent} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={s.bannerTitle}>სპეციალური შეთავაზება</Text>
            <Text style={s.bannerSub}>იწურება {countdown}-ში</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </TouchableOpacity>

        <TouchableOpacity
          testID="breathing-card"
          style={s.breatheCard}
          onPress={() => go('stress-relief')}
        >
          <View style={s.breathIcon}><MaterialCommunityIcons name="weather-windy" size={26} color={colors.accent} /></View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={s.breatheTitle}>სუნთქვის სავარჯიშო</Text>
            <Text style={s.breatheSub}>2 წუთიანი რელაქსაცია</Text>
          </View>
          <View style={s.playDot}><Ionicons name="play" size={14} color="#fff" /></View>
        </TouchableOpacity>

        {beginner && (
          <View style={s.timeline}>
            <View style={[s.dot, s.dotActive]}><Ionicons name="checkmark" size={14} color="#fff" /></View>
            <TouchableOpacity testID="beginner-course" style={s.timelineCard} onPress={() => go(beginner.id)}>
              <View style={{ flex: 1 }}>
                <Text style={s.tlLabel}>შესავალი კურსი</Text>
                <Text style={s.tlTitle}>დაიწყეთ მაინდფულნესით</Text>
                <View style={s.bulletRow}>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={[s.bullet, i === 0 && s.bulletOn]} />
                  ))}
                </View>
              </View>
              <View style={s.iconBox}><MaterialCommunityIcons name="meditation" size={28} color={colors.accent} /></View>
            </TouchableOpacity>
          </View>
        )}

        {evening && (
          <View style={s.timeline}>
            <View style={s.dot} />
            <TouchableOpacity testID="evening-course" style={s.timelineCard} onPress={() => go(evening.id)}>
              <View style={{ flex: 1 }}>
                <Text style={s.tlLabel}>საფუძვლები</Text>
                <Text style={s.tlTitle}>ჩაიძინეთ ძილის ამბავით</Text>
                <View style={s.bulletRow}>
                  {[0, 1, 2, 3, 4].map(i => <View key={i} style={s.bullet} />)}
                </View>
              </View>
              <View style={s.iconBox}><FontAwesome5 name="bed" size={22} color={colors.accent} /></View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.xl, paddingBottom: 100 },
  hello: { color: colors.textDim, fontSize: 14, fontStyle: 'italic' },
  h1: { color: colors.accent, fontSize: 28, fontWeight: '700', marginTop: spacing.sm, marginBottom: spacing.lg, lineHeight: 34 },
  banner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md,
  },
  bannerTitle: { color: colors.text, fontWeight: '600', fontSize: 15 },
  bannerSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  breatheCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  breathIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  breatheTitle: { color: colors.text, fontWeight: '600', fontSize: 16 },
  breatheSub: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  playDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  timeline: { flexDirection: 'row', marginBottom: spacing.md, position: 'relative' },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, marginTop: 24, marginRight: spacing.md },
  dotActive: { backgroundColor: colors.accent, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  timelineCard: {
    flex: 1, flexDirection: 'row', backgroundColor: colors.card, padding: spacing.lg,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  tlLabel: { color: colors.accent, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  tlTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  bulletRow: { flexDirection: 'row', marginTop: spacing.md },
  bullet: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.accent, marginRight: 8 },
  bulletOn: { backgroundColor: colors.accent },
  iconBox: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
});
