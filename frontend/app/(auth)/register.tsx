import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, formatApiError } from '../../src/contexts/AuthContext';
import { colors, radius, spacing } from '../../src/theme';

export default function Register() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!name || !email || !password) { setError('შეავსე ყველა ველი'); return; }
    if (password.length < 6) { setError('პაროლი უნდა იყოს მინ. 6 სიმბოლო'); return; }
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(formatApiError(e));
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logo}><Ionicons name="person-add" size={56} color={colors.accent} /></View>
          <Text style={s.title}>შექმენი ანგარიში</Text>
          <Text style={s.subtitle}>დაიწყე მაინდფულნესის მოგზაურობა</Text>

          <View style={s.field}>
            <Ionicons name="person-outline" size={20} color={colors.textDim} />
            <TextInput testID="reg-name-input" style={s.input} placeholder="სახელი"
              placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
          </View>
          <View style={s.field}>
            <Ionicons name="mail-outline" size={20} color={colors.textDim} />
            <TextInput testID="reg-email-input" style={s.input} placeholder="ელფოსტა"
              placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address"
              value={email} onChangeText={setEmail} />
          </View>
          <View style={s.field}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textDim} />
            <TextInput testID="reg-password-input" style={s.input} placeholder="პაროლი (მინ. 6)"
              placeholderTextColor={colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
          </View>

          {!!error && <Text style={s.error} testID="reg-error">{error}</Text>}

          <TouchableOpacity testID="reg-submit-btn" style={s.btn} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>რეგისტრაცია</Text>}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>უკვე გაქვს ანგარიში? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity><Text style={s.link}>შესვლა</Text></TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingTop: spacing.xxl, flexGrow: 1 },
  logo: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.xl },
  title: { color: colors.text, fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: colors.textDim, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, color: colors.text, paddingVertical: 16, marginLeft: spacing.sm, fontSize: 15 },
  btn: { backgroundColor: colors.accent, padding: 16, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textDim },
  link: { color: colors.accent, fontWeight: '700' },
  error: { color: '#ff6b6b', textAlign: 'center', marginBottom: spacing.sm },
});
