import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Animated, Easing, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { api } from '../src/services/api';
import { colors, radius, spacing } from '../src/theme';

type Session = {
  id: string; title: string; description: string; duration_min: number;
  category: string; category_label: string; audio_url: string | null;
  instructions: string[];
};

export default function Player() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [breathCount, setBreathCount] = useState(4);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [saved, setSaved] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<any>(null);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!id) return;
    api.get(`/sessions/${id}`).then(r => setSession(r.data)).finally(() => setLoading(false));
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  const total = (session?.duration_min || 0) * 60;

  // Timer + countdown + breath animation
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    let secIn = 0, secHold = 0, secOut = 0;
    const tick = () => {
      setElapsed(e => {
        const nxt = e + 1;
        if (nxt >= total && total > 0) {
          stop();
          api.post('/sessions/complete', { session_id: session!.id, duration_minutes: session!.duration_min }).catch(() => {});
          return total;
        }
        return nxt;
      });
      // Breath cycle 4-7-8 => simplified 4-4-4 if not stress-relief
      const IN = 4, HOLD = session?.id === 'stress-relief' ? 7 : 4, OUT = session?.id === 'stress-relief' ? 8 : 4;
      setBreathPhase(p => {
        if (p === 'in') {
          secIn += 1;
          if (secIn >= IN) { secIn = 0; return 'hold'; }
          setBreathCount(Math.max(1, IN - secIn));
          return 'in';
        }
        if (p === 'hold') {
          secHold += 1;
          if (secHold >= HOLD) { secHold = 0; return 'out'; }
          setBreathCount(Math.max(1, HOLD - secHold));
          return 'hold';
        }
        secOut += 1;
        if (secOut >= OUT) { secOut = 0; return 'in'; }
        setBreathCount(Math.max(1, OUT - secOut));
        return 'out';
      });
    };
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [playing, total, session]);

  useEffect(() => {
    const target = breathPhase === 'in' ? 1.35 : breathPhase === 'hold' ? 1.35 : 0.85;
    Animated.timing(scale, {
      toValue: target,
      duration: breathPhase === 'hold' ? 400 : 1800,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [breathPhase]);

  const play = async () => {
    if (!session) return;
    if (!soundRef.current && session.audio_url) {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: session.audio_url },
          { shouldPlay: true, isLooping: true, volume: 0.7 }
        );
        soundRef.current = sound;
      } catch { /* audio optional */ }
    } else if (soundRef.current) {
      await soundRef.current.playAsync();
    }
    setPlaying(true);
  };

  const pause = async () => {
    if (soundRef.current) await soundRef.current.pauseAsync();
    setPlaying(false);
  };

  const stop = async () => {
    setPlaying(false);
    if (soundRef.current) { await soundRef.current.stopAsync(); }
  };

  const toggleSave = async () => {
    if (!session) return;
    const r = await api.post('/sessions/toggle_saved', { session_id: session.id });
    setSaved(r.data.saved);
  };

  if (loading || !session) {
    return <View style={s.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  const mm = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const ss = (elapsed % 60).toString().padStart(2, '0');
  const remaining = Math.max(0, total - elapsed);
  const rMm = Math.floor(remaining / 60).toString().padStart(2, '0');
  const rSs = (remaining % 60).toString().padStart(2, '0');

  const phaseLabel = breathPhase === 'in' ? 'ჩაისუნთქე' : breathPhase === 'hold' ? 'შეინარჩუნე' : 'ამოისუნთქე';

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity testID="player-back" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.category}>{session.category_label}</Text>
        <TouchableOpacity testID="player-save" onPress={toggleSave} hitSlop={12}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={26} color={saved ? '#ff6b6b' : colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>{session.title}</Text>
        <Text style={s.desc}>{session.description}</Text>

        <View style={s.breathWrap}>
          <Animated.View style={[s.breathCircle, { transform: [{ scale }] }]}>
            <Text style={s.breathNum} testID="breath-countdown">{playing ? breathCount : '•'}</Text>
            <Text style={s.breathPhase}>{playing ? phaseLabel : 'მზად?'}</Text>
          </Animated.View>
        </View>

        <View style={s.timeRow}>
          <Text style={s.timeText} testID="elapsed-time">{mm}:{ss}</Text>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${total ? (elapsed / total) * 100 : 0}%` }]} />
          </View>
          <Text style={s.timeText}>-{rMm}:{rSs}</Text>
        </View>

        <View style={s.controls}>
          <TouchableOpacity onPress={() => setElapsed(Math.max(0, elapsed - 15))} hitSlop={12}>
            <MaterialCommunityIcons name="rewind-15" size={36} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="player-play-btn"
            style={s.playBtn}
            onPress={playing ? pause : play}
          >
            <Ionicons name={playing ? 'pause' : 'play'} size={40} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setElapsed(Math.min(total, elapsed + 15))} hitSlop={12}>
            <MaterialCommunityIcons name="fast-forward-15" size={36} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={s.instrHeader}>ინსტრუქცია</Text>
        {session.instructions.map((it, i) => (
          <View key={i} style={s.instr}>
            <Text style={s.instrNum}>{i + 1}</Text>
            <Text style={s.instrText}>{it}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  center: { flex: 1, backgroundColor: colors.bgDeep, justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  category: { color: colors.accent, fontWeight: '700', letterSpacing: 0.5, fontSize: 12 },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', textAlign: 'center' },
  desc: { color: colors.textDim, textAlign: 'center', marginTop: 6 },
  breathWrap: { alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xl, height: 240, justifyContent: 'center' },
  breathCircle: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: colors.accent + '22', borderWidth: 2, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  breathNum: { color: colors.accent, fontSize: 56, fontWeight: '700' },
  breathPhase: { color: colors.textDim, fontSize: 14, marginTop: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  timeText: { color: colors.textDim, fontSize: 12, minWidth: 50, textAlign: 'center' },
  progressBar: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, marginHorizontal: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginVertical: spacing.lg },
  playBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  instrHeader: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.md },
  instr: { flexDirection: 'row', backgroundColor: colors.card, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  instrNum: { color: colors.accent, fontWeight: '700', marginRight: spacing.md, fontSize: 16 },
  instrText: { color: colors.text, flex: 1, lineHeight: 20 },
});
