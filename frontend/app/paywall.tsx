import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { api } from '../src/services/api';
import { useTheme, radius, spacing } from '../src/theme';

const FEATURES = [
  { icon: 'infinity', label: 'შეუზღუდავი წვდომა ყველა სესიაზე' },
  { icon: 'cloud-download-outline', label: 'ოფლაინ ჩამოწერა (მალე)' },
  { icon: 'star-outline', label: 'Premium ბეჯი პროფილზე' },
  { icon: 'sparkles-outline', label: 'პრიორიტეტული ახალი სესიები' },
  { icon: 'heart-outline', label: 'მხარი დაუჭირე ქართულ მაინდფულნესს' },
];

export default function Paywall() {
  const router = useRouter();
  const { colors } = useTheme();
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/payments/packages').then(r => {
      setPkg(r.data['premium-lifetime']);
    });
  }, []);

  const startPayment = async () => {
    setLoading(true);
    try {
      let origin = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        origin = window.location.origin;
      } else {
        // Mobile native: use the public preview URL stored in env
        origin = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
      }
      const r = await api.post('/payments/checkout/session', {
        package_id: 'premium-lifetime',
        origin_url: origin,
      });
      const url: string = r.data.url;
      const sessionId: string = r.data.session_id;

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = url;
        return;
      }
      // Native: open Stripe Checkout in in-app browser; success_url will close it
      const result = await WebBrowser.openAuthSessionAsync(url, `${origin}/payment-success`);
      if (result.type === 'success') {
        router.replace({ pathname: '/payment-success', params: { session_id: sessionId } });
      }
    } catch (e: any) {
      Alert.alert('გადახდა ვერ დაიწყო', e?.response?.data?.detail || e?.message || 'შეცდომა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bgDeep }]}>
      <View style={s.top}>
        <TouchableOpacity testID="paywall-close" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <View />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.giftIcon, { backgroundColor: colors.accent + '22' }]}>
          <MaterialCommunityIcons name="gift-outline" size={56} color={colors.accent} />
        </View>
        <Text style={[s.title, { color: colors.text }]}>სპეციალური შეთავაზება</Text>
        <Text style={[s.subtitle, { color: colors.textDim }]}>
          ერთჯერადი გადახდა — სამუდამო Premium წვდომა
        </Text>

        <View style={[s.priceCard, { backgroundColor: colors.card, borderColor: colors.accent }]}>
          <Text style={[s.priceTag, { color: colors.textDim }]}>ფასი</Text>
          <View style={s.priceRow}>
            <Text style={[s.priceVal, { color: colors.text }]} testID="paywall-price">
              {pkg ? pkg.amount : '6.99'}
            </Text>
            <Text style={[s.priceCur, { color: colors.accent }]}>₾</Text>
          </View>
          <Text style={[s.priceNote, { color: colors.textDim }]}>ერთჯერადი • არანაირი თვიური საფასური</Text>
        </View>

        <View style={[s.featBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.featRow}>
              <Ionicons name={f.icon as any} size={22} color={colors.accent} />
              <Text style={[s.featText, { color: colors.text }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.payBadges}>
          <FontAwesome5 name="apple-pay" size={36} color={colors.text} />
          <FontAwesome5 name="google-pay" size={32} color={colors.text} style={{ marginLeft: spacing.lg }} />
          <Ionicons name="card" size={28} color={colors.text} style={{ marginLeft: spacing.lg }} />
        </View>
        <Text style={[s.payNote, { color: colors.textMuted }]}>
          Apple Pay • Google Pay • ბარათი (Visa / Mastercard) • TBC ბარათები მიიღება
        </Text>

        <TouchableOpacity
          testID="paywall-pay-btn"
          style={[s.btn, { backgroundColor: colors.accent }]}
          onPress={startPayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color="#fff" />
              <Text style={s.btnText}>უსაფრთხოდ გადახდა • {pkg?.amount || 6.99} ₾</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[s.legal, { color: colors.textMuted }]}>
          გადახდა მუშავდება Stripe-ის უსაფრთხო სერვერზე. ჩვენ არ ვინახავთ შენი ბარათის მონაცემებს.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg },
  scroll: { padding: spacing.xl, paddingBottom: 60, alignItems: 'center' },
  giftIcon: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl, fontSize: 14 },
  priceCard: { width: '100%', borderRadius: radius.lg, padding: spacing.xl, borderWidth: 2, alignItems: 'center', marginBottom: spacing.lg },
  priceTag: { fontSize: 12, letterSpacing: 1, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  priceVal: { fontSize: 56, fontWeight: '700' },
  priceCur: { fontSize: 32, marginLeft: 6, fontWeight: '700' },
  priceNote: { fontSize: 12, marginTop: 6 },
  featBox: { width: '100%', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, marginBottom: spacing.lg },
  featRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  featText: { marginLeft: spacing.md, fontSize: 14, flex: 1 },
  payBadges: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  payNote: { fontSize: 11, textAlign: 'center', marginBottom: spacing.lg },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, paddingHorizontal: spacing.xl, borderRadius: radius.pill, width: '100%' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 10 },
  legal: { fontSize: 11, textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.lg, lineHeight: 16 },
});
