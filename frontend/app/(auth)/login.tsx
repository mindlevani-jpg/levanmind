import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, formatApiError } from '../../src/contexts/AuthContext';
import { useTheme, radius, spacing } from '../../src/theme';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

export default function Login() {
  const { signIn, signInWithGoogleSession } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('test@test.com');
  const [password, setPassword] = useState('test123');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Web: detect session_id in URL hash on mount (for web Expo build)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const hash = (typeof window !== 'undefined' ? window.location.hash : '') || '';
    if (hash.includes('session_id=')) {
      const sid = hash.split('session_id=')[1].split('&')[0];
      if (sid) {
        setGoogleLoading(true);
        signInWithGoogleSession(sid)
          .then(() => {
            if (typeof window !== 'undefined') window.history.replaceState({}, '', window.location.pathname);
            router.replace('/(tabs)');
          })
          .catch((e) => setError(formatApiError(e)))
          .finally(() => setGoogleLoading(false));
      }
    }
  }, []);

  const submit = async () => {
    setError('');
    if (!email || !password) { setError('შეავსე ყველა ველი'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('არასწორი ელფოსტის ფორმატი'); return; }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(formatApiError(e));
    } finally { setLoading(false); }
  };

  const googleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      let redirectUrl = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        redirectUrl = window.location.origin + '/(auth)/login';
      } else {
        redirectUrl = ExpoLinking.createURL('/(auth)/login');
      }
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.location.href = authUrl;
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type === 'success' && result.url) {
        const m = result.url.match(/session_id=([^&]+)/);
        if (m && m[1]) {
          await signInWithGoogleSession(m[1]);
          router.replace('/(tabs)');
        } else {
          setError('Google session ვერ ამოიკითხა');
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // user cancelled
      }
    } catch (e: any) {
      setError(formatApiError(e));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logo}><Ionicons name="moon" size={56} color={colors.accent} /></View>
          <Text style={[s.title, { color: colors.text }]} testID="login-title">კეთილი მობრძანება</Text>
          <Text style={[s.subtitle, { color: colors.textDim }]}>შედი აკაუნტში და განაგრძე მედიტაცია</Text>

          <TouchableOpacity
            testID="login-google-btn"
            style={[s.googleBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={googleSignIn}
            disabled={googleLoading}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={colors.accent} />
                <Text style={[s.googleText, { color: colors.text }]}>Google-ით შესვლა</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[s.dividerText, { color: colors.textMuted }]}>ან</Text>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={[s.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={20} color={colors.textDim} />
            <TextInput
              testID="login-email-input"
              style={[s.input, { color: colors.text }]}
              placeholder="ელფოსტა"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={[s.field, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textDim} />
            <TextInput
              testID="login-password-input"
              style={[s.input, { color: colors.text }]}
              placeholder="პაროლი"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPwd}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPwd(s => !s)} hitSlop={10}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          {!!error && <Text style={s.error} testID="login-error">{error}</Text>}

          <TouchableOpacity
            testID="login-submit-btn"
            style={[s.btn, { backgroundColor: colors.accent }]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>შესვლა</Text>}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={[s.footerText, { color: colors.textDim }]}>არ გაქვს აკაუნტი? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity testID="goto-register-btn"><Text style={[s.link, { color: colors.accent }]}>რეგისტრაცია</Text></TouchableOpacity>
            </Link>
          </View>

          <View style={[s.hint, { backgroundColor: colors.cardAlt }]}>
            <Text style={[s.hintTxt, { color: colors.textDim }]}>სატესტო ანგარიში: test@test.com / test123</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.xl, paddingTop: spacing.xxl, flexGrow: 1 },
  logo: { alignItems: 'center', marginBottom: spacing.lg, marginTop: spacing.xl },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.lg,
  },
  googleText: { marginLeft: 10, fontWeight: '600', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { paddingHorizontal: spacing.md, fontSize: 12 },
  field: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1,
  },
  input: { flex: 1, paddingVertical: 16, marginLeft: spacing.sm, fontSize: 15 },
  btn: { padding: 16, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: {},
  link: { fontWeight: '700' },
  error: { color: '#ff6b6b', textAlign: 'center', marginBottom: spacing.sm },
  hint: { marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.md },
  hintTxt: { textAlign: 'center', fontSize: 12 },
});
