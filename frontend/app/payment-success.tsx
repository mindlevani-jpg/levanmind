import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme, radius, spacing } from '../src/theme';

export default function PaymentSuccess() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ session_id?: string }>();
  const { user } = useAuth();
  const [status, setStatus] = useState<'pending' | 'paid' | 'failed' | 'expired'>('pending');
  const [attempts, setAttempts] = useState(0);
  const pollingRef = useRef(false);

  // Try to get session_id from URL on web
  let sessionId = params.session_id as string | undefined;
  if (!sessionId && Platform.OS === 'web' && typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    sessionId = url.searchParams.get('session_id') || undefined;
  }

  useEffect(() => {
    if (!sessionId || pollingRef.current) return;
    pollingRef.current = true;

    let alive = true;
    const MAX = 8;
    const poll = async (n: number) => {
      if (!alive) return;
      setAttempts(n + 1);
      try {
        const r = await api.get(`/payments/checkout/status/${sessionId}`);
        const ps = r.data.payment_status;
        const st = r.data.status;
        if (ps === 'paid') { setStatus('paid'); return; }
        if (st === 'expired') { setStatus('expired'); return; }
      } catch (e) {
        // continue polling
      }
      if (n + 1 >= MAX) { setStatus('failed'); return; }
      setTimeout(() => poll(n + 1), 2000);
    };
    poll(0);
    return () => { alive = false; };
  }, [sessionId]);

  // Refresh user (to pick up is_premium)
  useEffect(() => {
    if (status === 'paid') {
      api.get('/auth/me').catch(() => {});
    }
  }, [status]);

  const goHome = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bgDeep }]}>
      <View style={s.center}>
        {status === 'pending' && (
          <>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[s.title, { color: colors.text }]}>გადახდის დადასტურება...</Text>
            <Text style={[s.sub, { color: colors.textDim }]}>{attempts}/8 ცდა</Text>
          </>
        )}
        {status === 'paid' && (
          <>
            <View style={[s.iconCircle, { backgroundColor: '#10B98122', borderColor: '#10B981' }]}>
              <Ionicons name="checkmark" size={64} color="#10B981" />
            </View>
            <Text style={[s.title, { color: colors.text }]} testID="payment-success-title">გადახდა წარმატებულია! 🎉</Text>
            <Text style={[s.sub, { color: colors.textDim }]}>Premium წვდომა გააქტიურდა</Text>
            <Text style={[s.sub, { color: colors.textDim }]}>{user?.email}</Text>
            <TouchableOpacity
              testID="payment-go-home-btn"
              style={[s.btn, { backgroundColor: colors.accent }]}
              onPress={goHome}
            >
              <Text style={s.btnText}>აპლიკაციაში დაბრუნება</Text>
            </TouchableOpacity>
          </>
        )}
        {(status === 'failed' || status === 'expired') && (
          <>
            <View style={[s.iconCircle, { backgroundColor: '#ff6b6b22', borderColor: '#ff6b6b' }]}>
              <Ionicons name="close" size={64} color="#ff6b6b" />
            </View>
            <Text style={[s.title, { color: colors.text }]}>
              {status === 'expired' ? 'სესია ამოიწურა' : 'გადახდა ვერ დადასტურდა'}
            </Text>
            <Text style={[s.sub, { color: colors.textDim }]}>გთხოვთ სცადე ხელახლა</Text>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: colors.accent }]}
              onPress={() => router.replace('/paywall')}
            >
              <Text style={s.btnText}>ხელახლა ცდა</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goHome} style={{ marginTop: spacing.md }}>
              <Text style={{ color: colors.textDim }}>მთავარზე დაბრუნება</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  iconCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: '700', marginTop: spacing.md, textAlign: 'center' },
  sub: { marginTop: spacing.sm, textAlign: 'center' },
  btn: { paddingVertical: 16, paddingHorizontal: spacing.xl, borderRadius: radius.pill, marginTop: spacing.xl, minWidth: 240, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
