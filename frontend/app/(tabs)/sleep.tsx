import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { colors, radius, spacing } from '../../src/theme';

type S = { id: string; title: string; duration_min: number; icon: string };

export default function Sleep() {
  const router = useRouter();
  const [stories, setStories] = useState<S[]>([]);
  const [sounds, setSounds] = useState<S[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/sessions', { params: { category: 'sleep' } }),
      api.get('/sessions', { params: { category: 'sounds' } }),
    ]).then(([a, b]) => {
      setStories(a.data);
      setSounds(b.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.accent} /></View>;

  const go = (id: string) => router.push({ pathname: '/player', params: { id } });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={s.timerCard} testID="sleep-timer-btn" onPress={() => go('night-relax')}>
          <View style={s.timerIcon}><MaterialCommunityIcons name="timer-sand" size={26} color={colors.accent} /></View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={s.cardTitle}>ძილის ტაიმერი</Text>
            <Text style={s.cardSub}>გამორთეთ აუდიო ავტომატურად</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </TouchableOpacity>

        <TouchableOpacity style={s.breathBig} testID="breathing-478-btn" onPress={() => go('stress-relief')}>
          <MaterialCommunityIcons name="weather-windy" size={48} color={colors.accent} />
          <Text style={s.breathTitle}>4-7-8 სუნთქვა</Text>
          <Text style={s.breathSub}>ძილის მოსამზადებელი სავარჯიშო</Text>
        </TouchableOpacity>

        <View style={s.sectionHeader}>
          <Text style={s.section}>ძილის ამბები</Text>
          <Text style={s.allLink}>ყველა</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.xl }}>
          {stories.map(item => (
            <TouchableOpacity
              key={item.id}
              testID={`story-${item.id}`}
              style={s.storyCard}
              onPress={() => go(item.id)}
            >
              <Ionicons name={item.id === 'night-sky' ? 'moon' : 'rainy'} size={32} color={colors.accent} />
              <View style={{ marginTop: spacing.xl }}>
                <Text style={s.storyTitle}>{item.title}</Text>
                <View style={s.rowMeta}>
                  <Ionicons name="time-outline" size={13} color={colors.textDim} />
                  <Text style={s.rowMetaText}>{item.duration_min} წუთი</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.sectionHeader}>
          <Text style={s.section}>ძილის ხმები</Text>
          <Text style={s.allLink}>ყველა</Text>
        </View>
        {sounds.map(item => (
          <TouchableOpacity
            key={item.id}
            testID={`sound-${item.id}`}
            style={s.row}
            onPress={() => go(item.id)}
          >
            <View style={s.rowIcon}><Ionicons name="musical-notes" size={22} color={colors.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{item.title}</Text>
              <View style={s.rowMeta}>
                <Ionicons name="time-outline" size={13} color={colors.textDim} />
                <Text style={s.rowMetaText}>{item.duration_min} წუთი</Text>
              </View>
            </View>
            <View style={s.playDot}><Ionicons name="play" size={14} color="#fff" /></View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.xl, paddingBottom: 100 },
  timerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  timerIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  cardSub: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  breathBig: { backgroundColor: colors.card, padding: spacing.xl, borderRadius: radius.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  breathTitle: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: spacing.md },
  breathSub: { color: colors.textDim, fontSize: 13, marginTop: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  section: { color: colors.text, fontSize: 20, fontWeight: '700' },
  allLink: { color: colors.accent, fontWeight: '600' },
  storyCard: { width: 180, height: 180, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginRight: spacing.md, borderWidth: 1, borderColor: colors.border, justifyContent: 'space-between' },
  storyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rowMetaText: { color: colors.textDim, marginLeft: 4, fontSize: 12 },
  playDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
