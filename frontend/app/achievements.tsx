import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/services/api';
import { useTheme, radius, spacing } from '../src/theme';

export default function Achievements() {
  const router = useRouter();
  const { colors } = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/user/stats').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <View style={[s.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.accent} /></View>;
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <View style={s.top}>
        <TouchableOpacity testID="ach-back" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>მიღწევები</Text>
        <View style={{ width: 28 }} />
      </View>
      <Text style={[s.sub, { color: colors.textDim }]}>
        {stats.achievements_earned} / {stats.achievements_total} მიღწეული
      </Text>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {stats.achievements.map((a: any) => (
          <View
            key={a.id}
            style={[
              s.row,
              {
                backgroundColor: colors.card,
                borderColor: a.earned ? colors.accent : colors.border,
                opacity: a.earned ? 1 : 0.55,
              },
            ]}
            testID={`ach-${a.id}`}
          >
            <View style={[s.iconBox, { backgroundColor: colors.cardAlt }]}>
              <Ionicons name={a.icon} size={28} color={a.earned ? colors.accent : colors.textDim} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: colors.text }]}>{a.title}</Text>
              <Text style={[s.rowDesc, { color: colors.textDim }]}>{a.desc}</Text>
            </View>
            {a.earned && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { textAlign: 'center', marginBottom: spacing.lg },
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  iconBox: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowDesc: { fontSize: 12, marginTop: 4 },
});
