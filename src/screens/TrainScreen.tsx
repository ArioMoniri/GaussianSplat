import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { sessionStore } from '../services/sessionStore';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Train'>;

export function TrainScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const session = sessionStore.get(sessionId);
  const [experimental, setExperimental] = useState(false);

  if (!session) return null;

  const importSplat = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['*/*'],
      multiple: false,
    });
    if (res.canceled) return;
    const file = res.assets?.[0];
    if (!file) return;
    if (!/\.(splat|ply)$/i.test(file.name)) {
      Alert.alert('Wrong file', 'Pick a .splat or .ply produced by training.');
      return;
    }
    sessionStore.upsert({ ...session, splatUri: file.uri });
    navigation.navigate('View', { sessionId, splatUri: file.uri });
  };

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.heading}>Train</Text>
      <Text style={styles.body}>
        Training a 3D Gaussian Splatting scene from scratch needs serious GPU time. The fast path is
        to run the bundled Python script on a machine with CUDA (or Apple Silicon MPS for a slower
        run), then import the resulting `.splat` here.
      </Text>

      <View style={styles.codeBlock}>
        <Text style={styles.code}>
          {`cd scripts\n./train.sh ../sessions/${sessionId}\n`}
        </Text>
      </View>

      <Text style={styles.body}>
        That writes {'`<session>/output.splat`'}. Use the button below to attach it to this session.
      </Text>

      <Pressable style={[styles.btn, styles.btnPrimary]} onPress={importSplat}>
        <Text style={styles.btnLabel}>Import trained splat</Text>
      </Pressable>

      <View style={{ height: 24 }} />

      <Pressable
        style={[styles.btn, styles.btnSecondary]}
        onPress={() => setExperimental((v) => !v)}
      >
        <Text style={styles.btnLabel}>
          {experimental ? 'Hide WebGPU trainer' : 'Show WebGPU trainer (experimental)'}
        </Text>
      </Pressable>

      {experimental && (
        <View style={styles.experimental}>
          <Text style={styles.body}>
            The WebGPU compute kernels in `src/services/trainer/webgpuTrainer.ts` are stubs. They
            project Gaussians and rasterise into tiles but don't yet backpropagate. Treat this as a
            place to iterate the rendering kernel; production training stays in Python until it
            stabilises.
          </Text>
          <Pressable
            style={[styles.btn, styles.btnPrimary]}
            onPress={async () => {
              const { webgpuAvailable, smokeTest } = await import('../services/trainer/webgpuTrainer');
              if (!(await webgpuAvailable())) {
                Alert.alert('WebGPU not available', 'Run on Safari Technology Preview or Chrome with WebGPU enabled.');
                return;
              }
              const ms = await smokeTest();
              Alert.alert('WebGPU OK', `Projected 1024 Gaussians in ${ms.toFixed(1)}ms.`);
            }}
          >
            <Text style={styles.btnLabel}>Run kernel smoke test</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={() => Linking.openURL('https://github.com/graphdeco-inria/gaussian-splatting')}
        style={styles.link}
      >
        <Text style={styles.linkText}>graphdeco-inria/gaussian-splatting →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, paddingBottom: 32 },
  heading: { color: '#eee', fontSize: 22, fontWeight: '600', marginBottom: 12 },
  body: { color: '#bbb', lineHeight: 20, marginBottom: 12 },
  codeBlock: {
    backgroundColor: '#0f0f15',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  code: {
    color: '#9bb5ff',
    fontFamily: 'Menlo',
    fontSize: 12,
  },
  btn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#5b8def' },
  btnSecondary: { backgroundColor: '#2a2a36' },
  btnLabel: { color: 'white', fontWeight: '600' },
  experimental: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#15151c',
    borderRadius: 8,
    gap: 8,
  },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#5b8def', textDecorationLine: 'underline' },
});
