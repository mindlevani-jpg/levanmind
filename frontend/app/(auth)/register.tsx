import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, formatApiError } from '../../src/contexts/AuthContext';
import { useTheme, radius, spacing } from '../../src/theme';

function passwordStrength(p: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  let score = 0;
  if (p.length >= 6) score++;
  if (p.length >= 10) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  const labels = ['სუსტი', 'სუსტი', 'საშუალო', 'კარგი', 'ძლიერი'];
  const colorsArr = ['#9CA3AF', '#EF4444', '#F59E0B', '#10B981', '#059669'];
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score], color: colorsArr[score] };
}

export default function Register() {
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const emailValid = email.length === 0 || /^\S+@\S+\.\S+$/.test(email);
  const strength = useMemo(() => passwordStrength(password), [password]);
  const matches = !confirm || confirm === password;

  const submit = async () => {
    setError('');
    if (!name || !email || !password) { setError('შეავსე ყველა ველი'); return; }
    if (!emailValid) { setError('არასწორი ელფოსტა'); return; }
    if (password.length < 6) { setError('პაროლი უნდა იყოს მინ. 6 სიმბოლო'); return; }
    if (!matches) { setError('პაროლები არ ემთხვევა'); return; }
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(formatApiError(e));
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logo}><Ionicons name="person-add" size={56} color={colors.accent} /></View>
          <Text style={[s.title, { color: colors.text }]}>შექმენი ანგარიში</Text>
          <Text style={[s.subtitle, { color: colors.textDim }]}>დაიწყე მაინდფულნესის მოგზაურობა</Text>

          <View style={[s.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="person-outline" size={20} color={colors.textDim} />
            <TextInput testID="reg-name-input" style={[s.input, { color: colors.text }]}
              placeholder="სახელი" placeholderTextColor={colors.textMuted}
              value={name} onChangeText={setName} />
          </View>

          <View style={[s.field, { backgroundColor: colors.card, borderColor: emailValid ? colors.border : '#ff6b6b' }]}>
            <Ionicons name="mail-outline" size={20} color={colors.textDim} />
            <TextInput testID="reg-email-input" style={[s.input, { color: colors.text }]}
              placeholder="ელფოსტა" placeholderTextColor={colors.textMuted}
              autoCapitalize="none" keyboardType="email-address"
              value={email} onChangeText={setEmail} />
            {!!email && (
              <Ionicons name={emailValid ? 'checkmark-circle' : 'alert-circle'} size={18}
                color={emailValid ? '#10B981' : '#ff6b6b'} />
            )}
          </View>

          <View style={[s.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textDim} />
            <TextInput testID="reg-password-input" style={[s.input, { color: colors.text }]}
              placeholder="პაროლი (მინ. 6)" placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPwd} value={password} onChangeText={setPassword} />
            <TouchableOpacity onPress={() => setShowPwd(x => !x)} hitSlop={10}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          {!!password && (
            <View style={s.strengthRow}>
              {[0, 1, 2, 3].map(i => (
                <View key={i} style={[
                  s.strengthBar,
                  { backgroundColor: i < strength.score ? strength.color : colors.border },
                ]} />
              ))}
              <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}

          <View style={[s.field, { backgroundColor: colors.card, borderColor: matches ? colors.border : '#ff6b6b' }]}>
            <Ionicons name="checkmark-done-outline" size={20} color={colors.textDim} />
            <TextInput testID="reg-confirm-input" style={[s.input, { color: colors.text }]}
              placeholder="გაიმეორე პაროლი" placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPwd} value={confirm} onChangeText={setConfirm} />
            {!!confirm && (
              <Ionicons name={matches ? 'checkmark-circle' : 'alert-circle'} size={18}
                color={matches ? '#10B981' : '#ff6b6b'} />
            )}
          </View>

          {!!error && <Text style={s.error} testID="reg-error">{error}</Text>}

          <TouchableOpacity testID="reg-submit-btn" style={[s.btn, { backgroundColor: colors.accent }]}
            onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>რეგისტრაცია</Text>}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={[s.footerText, { color: colors.textDim }]}>უკვე გაქვს ანგარიში? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity><Text style={[s.link, { color: colors.accent }]}>შესვლა</Text></TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.xl, paddingTop: spacing.xxl, flexGrow: 1 },
  logo: { alignItems: 'center', marginBottom: spacing.lg, marginTop: spacing.lg },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  field: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md, borderWidth: 1 },
  input: { flex: 1, paddingVertical: 16, marginLeft: spacing.sm, fontSize: 15 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, marginTop: -spacing.sm },
  strengthBar: { flex: 1, height: 4, borderRadius: 2, marginRight: 4 },
  strengthLabel: { marginLeft: spacing.sm, fontSize: 12, fontWeight: '600' },
  btn: { padding: 16, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: {},
  link: { fontWeight: '700' },
  error: { color: '#ff6b6b', textAlign: 'center', marginBottom: spacing.sm },
});
