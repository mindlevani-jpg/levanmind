import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { colors, radius, spacing } from '../../src/theme';

const quickIcon = (id: string) => {
  if (id === 'sleep-stories') return <Ionicons name="moon" size={28} color="#fff" />;
  if (id === 'for-work') return <FontAwesome5 name="briefcase" size={22} color="#fff" />;
  return <Ionicons name="musical-notes" size={26} color="#fff" />;
};

const featIcon = (id: string) => {
  if (id.includes('stress')) return <MaterialCommunityIcons name="head-question" size={28} color={colors.accent} />;
  return <MaterialCommunityIcons name="weather-windy" size={28} color={colors.accent} />;
};

export default function Discover() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [all, setAll] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([api.get('/discover'), api.get('/sessions')])
      .then(([a, b]) => { setData(a.data); setAll(b.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <View style={s.center}><ActivityIndicator color={colors.accent} /></View>;

  const filtered = query
    ? all.filter(x => x.title.toLowerCase().includes(query.toLowerCase()) || x.category_label.toLowerCase().includes(query.toLowerCase()))
    : null;

  const go = (id: string) => router.push({ pathname: '/player', params: { id } });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.h1}>აღმოაჩინე</Text>

        <View style={s.search}>
          <Ionicons name="search" size={18} color={colors.textDim} />
          <TextInput
            testID="discover-search"
            style={s.searchInput}
            placeholder="სათაური, ტრენერი ან თემა"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          <Ionicons name="options-outline" size={20} color={colors.accent} />
        </View>

        {filtered ? (
          <>
            <Text style={s.section}>ძიების შედეგი</Text>
            {filtered.length === 0 && <Text style={s.empty}>ვერაფერი მოიძებნა</Text>}
            {filtered.map(item => (
              <TouchableOpacity key={item.id} testID={`search-${item.id}`} style={s.row} onPress={() => go(item.id)}>
                <View style={s.rowIcon}><MaterialCommunityIcons name="meditation" size={22} color={colors.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{item.title}</Text>
                  <Text style={s.rowMetaText}>{item.duration_min} წუთი · {item.category_label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <Text style={s.section}>სწრაფი ბმულები</Text>
            <View style={s.quickRow}>
              {data.quick_links.map((q: any) => (
                <TouchableOpacity
                  key={q.id}
                  testID={`quick-${q.id}`}
                  style={s.quickCard}
                  onPress={() => {
                    const first = all.find(x => x.category === q.category);
                    if (first) go(first.id);
                  }}
                >
                  {quickIcon(q.id)}
                  <Text style={s.quickTitle}>{q.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.sectionHeader}>
              <Text style={s.section}>ჩვენი რეკომენდაციები</Text>
              <Text style={s.allLink}>ყველა</Text>
            </View>
            <View style={s.recRow}>
              {data.recommendations.map((r: any) => (
                <TouchableOpacity
                  key={r.id}
                  testID={`rec-${r.id}`}
                  style={s.recCard}
                  onPress={() => go(r.id === 'breathing-relax' ? 'stress-relief' : 'focus-concentration')}
                >
                  {featIcon(r.id)}
                  <Text style={s.recTitle}>{r.title}</Text>
                  <Text style={s.recSub}>{r.subtitle}</Text>
                  <View style={s.recArrow}><Ionicons name="arrow-forward" size={16} color={colors.accent} /></View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.sectionHeader}>
              <Text style={s.section}>ახალი და გამორჩეული</Text>
              <Text style={s.allLink}>ყველა</Text>
            </View>
            {data.new_and_featured.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                testID={`feat-${item.id}`}
                style={s.row}
                onPress={() => go(item.id)}
              >
                <View style={s.rowIcon}><MaterialCommunityIcons name="meditation" size={22} color={colors.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{item.category_label}</Text>
                  <Text style={s.rowTitle}>{item.title}</Text>
                  <Text style={s.rowMetaText}>{item.duration_min} წუთი</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.xl, paddingBottom: 100 },
  h1: { color: colors.text, fontSize: 32, fontWeight: '700', marginBottom: spacing.lg },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  searchInput: { flex: 1, color: colors.text, marginLeft: spacing.sm, fontSize: 14 },
  section: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md, marginTop: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
  allLink: { color: colors.accent, fontWeight: '600' },
  quickRow: { flexDirection: 'row', gap: 10 as any, justifyContent: 'space-between' },
  quickCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'flex-start', borderWidth: 1, borderColor: colors.border, marginHorizontal: 4, minHeight: 110, justifyContent: 'space-between' },
  quickTitle: { color: colors.text, fontWeight: '700', fontSize: 13, marginTop: spacing.md },
  recRow: { flexDirection: 'row', marginTop: spacing.md },
  recCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginHorizontal: 4, minHeight: 140 },
  recTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: spacing.md },
  recSub: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  recArrow: { alignSelf: 'flex-end', marginTop: spacing.sm, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  rowLabel: { color: colors.accent, fontSize: 11, fontWeight: '600' },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowMetaText: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  empty: { color: colors.textDim, textAlign: 'center', padding: spacing.xl },
});
