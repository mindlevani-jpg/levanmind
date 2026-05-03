import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, formatApiError } from '../../src/contexts/AuthContext';
import { colors, radius, spacing } from '../../src/theme';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('test@test.com');
  const [password, setPassword] = useState('test123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!email || !password) { setError('შეავსე ყველა ველი'); return; }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(formatApiError(e));
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logo}>
            <Ionicons name="moon" size={56} color={colors.accent} />
          </View>
          <Text style={s.title} testID="login-title">კეთილი იყოს შენი მობრძანება</Text>
          <Text style={s.subtitle}>შედი აკაუნტში და განაგრძე მედიტაცია</Text>

          <View style={s.field}>
            <Ionicons name="mail-outline" size={20} color={colors.textDim} />
            <TextInput
              testID="login-email-input"
              style={s.input}
              placeholder="ელფოსტა"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={s.field}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textDim} />
            <TextInput
              testID="login-password-input"
              style={s.input}
              placeholder="პაროლი"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {!!error && <Text style={s.error} testID="login-error">{error}</Text>}

          <TouchableOpacity testID="login-submit-btn" style={s.btn} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>შესვლა</Text>}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>არ გაქვს აკაუნტი? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity testID="goto-register-btn"><Text style={s.link}>რეგისტრაცია</Text></TouchableOpacity>
            </Link>
          </View>

          <View style={s.hint}>
            <Text style={s.hintTxt}>სატესტო ანგარიში: test@test.com / test123</Text>
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
  field: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: radius.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, paddingVertical: 16, marginLeft: spacing.sm, fontSize: 15 },
  btn: { backgroundColor: colors.accent, padding: 16, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textDim },
  link: { color: colors.accent, fontWeight: '700' },
  error: { color: '#ff6b6b', textAlign: 'center', marginBottom: spacing.sm },
  hint: { marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.cardAlt, borderRadius: radius.md },
  hintTxt: { color: colors.textDim, textAlign: 'center', fontSize: 12 },
});
