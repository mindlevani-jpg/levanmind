import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, radius, spacing } from '../src/theme';

const PHASES = [
  { label: 'ჩაისუნთქე', dur: 4000, target: 1.6 },
  { label: 'შეინარჩუნე', dur: 1500, target: 1.6 },
  { label: 'ამოისუნთქე', dur: 4500, target: 0.7 },
  { label: 'შეიკავე', dur: 1500, target: 0.7 },
];

export default function Welcome() {
  const router = useRouter();
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(0.7)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [cycle, setCycle] = useState(0);

  // entrance fade
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  // breathing loop
  useEffect(() => {
    let i = phaseIdx;
    const run = () => {
      const p = PHASES[i];
      Animated.timing(scale, {
        toValue: p.target,
        duration: p.dur,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start();
    };
    run();
    const t = setTimeout(() => {
      const next = (i + 1) % PHASES.length;
      setPhaseIdx(next);
      if (next === 0) setCycle(c => c + 1);
    }, PHASES[i].dur);
    return () => clearTimeout(t);
  }, [phaseIdx]);

  const begin = async () => {
    await AsyncStorage.setItem('welcome_shown', '1');
    // Use push instead of replace; root layout will not redirect us back
    // because we manually set the flag and navigate.
    router.replace('/(auth)/login');
    // Force a small delay then re-check happens on next mount
  };

  const phase = PHASES[phaseIdx];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bgDeep }]}>
      <Animated.View style={[s.inner, { opacity: fade }]}>
        <View style={s.top}>
          <Ionicons name="moon" size={32} color={colors.accent} />
          <Text style={[s.brand, { color: colors.text }]}>აღმოაჩინე</Text>
          <Text style={[s.tag, { color: colors.textDim }]}>აპლიკაცია მაინდფულნესისთვის</Text>
        </View>

        <View style={s.center}>
          <View style={s.ringOuter}>
            <View style={[s.ringMid, { borderColor: colors.accent + '30' }]}>
              <Animated.View
                style={[
                  s.ring,
                  {
                    backgroundColor: colors.accent + '22',
                    borderColor: colors.accent,
                    transform: [{ scale }],
                  },
                ]}
              >
                <Text style={[s.phaseLabel, { color: colors.accent }]} testID="welcome-phase">{phase.label}</Text>
              </Animated.View>
            </View>
          </View>
          <Text style={[s.hint, { color: colors.textDim }]}>
            იგრძენი სუნთქვა • {Math.min(cycle + 1, 99)} ციკლი
          </Text>
        </View>

        <View style={s.bottom}>
          <TouchableOpacity
            testID="welcome-continue-btn"
            style={[s.btn, { backgroundColor: colors.accent }]}
            onPress={begin}
            activeOpacity={0.8}
          >
            <Text style={s.btnText}>გაგრძელება</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
          <TouchableOpacity testID="welcome-skip-btn" onPress={begin} hitSlop={12}>
            <Text style={[s.skip, { color: colors.textMuted }]}>გამოტოვება</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: spacing.xl, justifyContent: 'space-between' },
  top: { alignItems: 'center', marginTop: spacing.xxl },
  brand: { fontSize: 32, fontWeight: '700', marginTop: spacing.md, letterSpacing: 0.5 },
  tag: { fontSize: 14, marginTop: 6 },
  center: { alignItems: 'center', justifyContent: 'center' },
  ringOuter: { alignItems: 'center', justifyContent: 'center' },
  ringMid: {
    width: 280, height: 280, borderRadius: 140, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  phaseLabel: { fontSize: 22, fontWeight: '700' },
  hint: { marginTop: spacing.xl, fontSize: 13 },
  bottom: { alignItems: 'center', marginBottom: spacing.lg },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: spacing.xl, borderRadius: radius.pill,
    minWidth: 240, marginBottom: spacing.md,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  skip: { fontSize: 13, padding: 8 },
});
