import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/services/api';
import { useTheme, radius, spacing } from '../src/theme';

const MOODS = [
  { id: 'great', emoji: '😄', label: 'შესანიშნავი' },
  { id: 'good', emoji: '🙂', label: 'კარგი' },
  { id: 'ok', emoji: '😐', label: 'საშუალო' },
  { id: 'low', emoji: '😕', label: 'დაბალი' },
  { id: 'bad', emoji: '😢', label: 'ცუდი' },
];

export default function Journal() {
  const router = useRouter();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [mood, setMood] = useState<string>('good');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/user/journal');
      setEntries(r.data.entries);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!text.trim()) { Alert.alert('ცარიელი ჩანაწერი', 'დაწერე რამე ჯერ'); return; }
    setSaving(true);
    try {
      await api.post('/user/journal', { text: text.trim(), mood });
      setText('');
      await load();
    } catch {
      Alert.alert('შეცდომა', 'ვერ შევინახე');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.top}>
          <TouchableOpacity testID="journal-back" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-down" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.text }]}>დღიური</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[s.label, { color: colors.textDim }]}>როგორ გრძნობ თავს?</Text>
          <View style={s.moodRow}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.id}
                testID={`mood-${m.id}`}
                style={[
                  s.moodBtn,
                  { backgroundColor: colors.card, borderColor: mood === m.id ? colors.accent : colors.border },
                ]}
                onPress={() => setMood(m.id)}
              >
                <Text style={s.moodEmoji}>{m.emoji}</Text>
                <Text style={[s.moodLabel, { color: colors.textDim }]} numberOfLines={1}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.label, { color: colors.textDim, marginTop: spacing.lg }]}>დღევანდელი აზრები</Text>
          <TextInput
            testID="journal-input"
            style={[s.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="რა ხდება შენთან დღეს?"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={6}
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />

          <TouchableOpacity
            testID="journal-save-btn"
            style={[s.saveBtn, { backgroundColor: colors.accent }]}
            onPress={save}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>შენახვა</Text>}
          </TouchableOpacity>

          <Text style={[s.h2, { color: colors.text }]}>წინა ჩანაწერები</Text>
          {loading && <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} />}
          {!loading && entries.length === 0 && (
            <Text style={[s.empty, { color: colors.textMuted }]}>ჯერ არ გაქვს ჩანაწერი</Text>
          )}
          {entries.map((e: any) => (
            <View key={e.id} style={[s.entry, { backgroundColor: colors.card, borderColor: colors.border }]} testID={`entry-${e.id}`}>
              <View style={s.entryHeader}>
                {e.mood && (
                  <Text style={s.entryEmoji}>
                    {MOODS.find(m => m.id === e.mood)?.emoji || '🙂'}
                  </Text>
                )}
                <Text style={[s.entryDate, { color: colors.textDim }]}>{e.at?.slice(0, 10)}</Text>
              </View>
              <Text style={[s.entryText, { color: colors.text }]}>{e.text}</Text>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '700' },
  scroll: { padding: spacing.lg, paddingBottom: 80 },
  label: { fontSize: 13, marginBottom: spacing.md },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginHorizontal: 2 },
  moodEmoji: { fontSize: 26 },
  moodLabel: { fontSize: 10, marginTop: 4 },
  textArea: { minHeight: 140, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, fontSize: 15 },
  saveBtn: { padding: 14, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  h2: { fontSize: 18, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.md },
  empty: { textAlign: 'center', padding: spacing.lg },
  entry: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  entryEmoji: { fontSize: 20, marginRight: 8 },
  entryDate: { fontSize: 12 },
  entryText: { fontSize: 14, lineHeight: 20 },
});
