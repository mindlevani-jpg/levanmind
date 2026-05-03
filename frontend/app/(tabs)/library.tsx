import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { colors, radius, spacing } from '../../src/theme';

const iconFor = (id: string) => {
  const map: Record<string, any> = {
    'morning-meditation': <MaterialCommunityIcons name="meditation" size={28} color={colors.accent} />,
    'night-sky': <FontAwesome5 name="bed" size={22} color={colors.accent} />,
    'night-relax': <Ionicons name="moon" size={26} color={colors.accent} />,
    'stress-relief': <MaterialCommunityIcons name="brain" size={28} color={colors.accent} />,
    'focus-concentration': <MaterialCommunityIcons name="target" size={26} color={colors.accent} />,
    'forest-sounds': <Ionicons name="leaf" size={26} color={colors.accent} />,
    'ocean-waves': <Ionicons name="water" size={26} color={colors.accent} />,
    'rain-sounds': <Ionicons name="rainy" size={26} color={colors.accent} />,
    'white-noise': <Ionicons name="radio" size={26} color={colors.accent} />,
    'fireplace': <MaterialCommunityIcons name="fire" size={28} color={colors.accent} />,
    'birds': <Ionicons name="musical-notes" size={26} color={colors.accent} />,
  };
  return map[id] || <MaterialCommunityIcons name="meditation" size={26} color={colors.accent} />;
};

export default function Library() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ sessions: any[]; count: number; total_minutes: number }>({ sessions: [], count: 0, total_minutes: 0 });

  useFocusEffect(useCallback(() => {
    setLoading(true);
    api.get('/user/saved').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []));

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>ბიბლიოთეკა</Text>
        <Text style={s.sub}>თქვენი შენახული სესიები</Text>

        <View style={s.statsCard}>
          <View style={s.statBox}>
            <Text style={s.statNum} testID="saved-count">{data.count}</Text>
            <Text style={s.statLabel}>შენახული</Text>
          </View>
          <View style={s.divider} />
          <View style={s.statBox}>
            <Text style={s.statNum} testID="saved-minutes">{data.total_minutes}</Text>
            <Text style={s.statLabel}>წუთი სულ</Text>
          </View>
        </View>

        <Text style={s.section}>შენახული სესიები</Text>
        {data.sessions.length === 0 && (
          <View style={s.empty} testID="library-empty">
            <Ionicons name="bookmark-outline" size={48} color={colors.textDim} />
            <Text style={s.emptyText}>ჯერ არ გაქვს შენახული სესია</Text>
            <Text style={s.emptyHint}>დააჭირე ❤ ღილაკს პლეერში</Text>
          </View>
        )}
        {data.sessions.map(item => (
          <TouchableOpacity
            key={item.id}
            testID={`library-session-${item.id}`}
            style={s.row}
            onPress={() => router.push({ pathname: '/player', params: { id: item.id } })}
          >
            <View style={s.rowIcon}>{iconFor(item.id)}</View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>{item.category_label}</Text>
              <Text style={s.rowTitle}>{item.title}</Text>
              <View style={s.rowMeta}>
                <Ionicons name="time-outline" size={14} color={colors.textDim} />
                <Text style={s.rowMetaText}>{item.duration_min} წუთი</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
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
  h1: { color: colors.text, fontSize: 32, fontWeight: '700' },
  sub: { color: colors.textDim, marginTop: 4, marginBottom: spacing.lg },
  statsCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { color: colors.accent, fontSize: 36, fontWeight: '700' },
  statLabel: { color: colors.textDim, marginTop: 4, fontSize: 13 },
  divider: { width: 1, backgroundColor: colors.border },
  section: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowIcon: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  rowLabel: { color: colors.accent, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 2 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  rowMetaText: { color: colors.textDim, marginLeft: 4, fontSize: 12 },
  empty: { alignItems: 'center', padding: spacing.xxl },
  emptyText: { color: colors.textDim, marginTop: spacing.md, fontSize: 15 },
  emptyHint: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
});
