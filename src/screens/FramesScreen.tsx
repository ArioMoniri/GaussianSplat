import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { sessionStore } from '../services/sessionStore';
import { extractFrames } from '../services/frameExtractor';
import type { RootStackParamList } from '../navigation';
import type { Frame } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Frames'>;

export function FramesScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const session = sessionStore.get(sessionId);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [frames, setFrames] = useState<Frame[]>(session?.frames ?? []);
  const [fps, setFps] = useState(2);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) navigation.goBack();
  }, [session, navigation]);

  if (!session) return null;

  const run = async () => {
    setBusy(true);
    setProgress(0);
    setError(null);
    try {
      const out = await extractFrames(session, {
        fps,
        maxFrames: 200,
        onProgress: setProgress,
      });
      setFrames(out);
      sessionStore.upsert({ ...session, frames: out });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (idx: number) => {
    const next = frames.map((f, i) => (i === idx ? { ...f, selected: !f.selected } : f));
    setFrames(next);
    sessionStore.upsert({ ...session, frames: next });
  };

  const selectedCount = frames.filter((f) => f.selected).length;

  return (
    <View style={styles.root}>
      <View style={styles.controls}>
        <Text style={styles.label}>FPS</Text>
        {[1, 2, 4].map((v) => (
          <Pressable
            key={v}
            onPress={() => setFps(v)}
            style={[styles.chip, fps === v && styles.chipActive]}
          >
            <Text style={styles.chipLabel}>{v}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={run}
          disabled={busy}
          style={[styles.btn, styles.btnPrimary, busy && { opacity: 0.6 }]}
        >
          <Text style={styles.btnLabel}>{busy ? 'Extracting…' : 'Extract'}</Text>
        </Pressable>
      </View>

      {busy && (
        <View style={styles.progress}>
          <ActivityIndicator color="#5b8def" />
          <Text style={styles.body}> {(progress * 100).toFixed(0)}%</Text>
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>
          Frame extraction failed: {error}
        </Text>
      )}

      <FlatList
        data={frames}
        keyExtractor={(_, i) => String(i)}
        numColumns={3}
        contentContainerStyle={{ padding: 6 }}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => toggle(index)} style={[styles.thumb, !item.selected && styles.thumbOff]}>
            <Image source={{ uri: item.uri }} style={styles.thumbImg} resizeMode="cover" />
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No frames yet. Choose FPS and tap “Extract”. On the web target this uses ffmpeg.wasm.
          </Text>
        }
      />

      <View style={styles.footer}>
        <Text style={styles.body}>{selectedCount} of {frames.length} kept</Text>
        <Pressable
          style={[styles.btn, styles.btnPrimary, frames.length === 0 && { opacity: 0.5 }]}
          disabled={frames.length === 0}
          onPress={() => navigation.navigate('Poses', { sessionId })}
        >
          <Text style={styles.btnLabel}>Continue to poses →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  label: { color: '#bbb' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#222',
    borderRadius: 6,
  },
  chipActive: { backgroundColor: '#5b8def' },
  chipLabel: { color: 'white', fontWeight: '600' },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginLeft: 'auto' },
  btnPrimary: { backgroundColor: '#5b8def' },
  btnLabel: { color: 'white', fontWeight: '600' },
  progress: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  body: { color: '#bbb' },
  thumb: { flex: 1, aspectRatio: 1, padding: 3 },
  thumbOff: { opacity: 0.35 },
  thumbImg: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: '#111' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#222',
  },
  empty: { color: '#888', padding: 24, textAlign: 'center', lineHeight: 20 },
  errorText: { color: '#ef6b6b', padding: 12, lineHeight: 20 },
});
