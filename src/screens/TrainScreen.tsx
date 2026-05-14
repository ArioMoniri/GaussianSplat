import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { sessionStore } from '../services/sessionStore';
import { exportSessionAsZip, ExportProgress } from '../services/exportSession';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Train'>;

export function TrainScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const session = sessionStore.get(sessionId);
  const [experimental, setExperimental] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [zipUri, setZipUri] = useState<string | null>(null);

  if (!session) return null;

  const runExport = async () => {
    setExporting(true);
    setExportMsg('Building session bundle…');
    setZipUri(null);
    try {
      const { zipUri, filename } = await exportSessionAsZip(session, (p: ExportProgress) => {
        if (p.stage === 'frames') {
          setExportMsg(`Packing frame ${Math.round((p.ratio ?? 0) * 100)}%`);
        } else if (p.stage === 'zip') {
          setExportMsg('Zipping…');
        } else if (p.stage === 'share') {
          setExportMsg('Sharing…');
        }
      });
      setZipUri(zipUri);
      setExportMsg(`Saved as ${filename}`);
    } catch (e: unknown) {
      setExportMsg(null);
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  const importSplat = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['*/*'], multiple: false });
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
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Training happens on your Mac.</Text>
        <Text style={styles.bannerBody}>
          The phone has no GPU for this. Tap the big blue button below to AirDrop the session to
          your Mac, run one shell command, then come back and import the result.
        </Text>
      </View>

      <Step n={1} title="Export session to your Mac">
        <Text style={styles.body}>
          Builds a zip with transforms.json + every selected frame, then opens the share sheet.
          AirDrop it to your Mac.
        </Text>
        <Pressable
          style={[styles.btn, styles.btnPrimary, exporting && { opacity: 0.6 }]}
          disabled={exporting}
          onPress={runExport}
        >
          <Text style={styles.btnLabel}>{exporting ? 'Exporting…' : 'Export session bundle'}</Text>
        </Pressable>
        {exporting && (
          <View style={styles.row}>
            <ActivityIndicator color="#5b8def" />
            <Text style={styles.body}> {exportMsg}</Text>
          </View>
        )}
        {!exporting && exportMsg && <Text style={styles.bodyOk}>{exportMsg}</Text>}
        {zipUri && (
          <Text style={styles.path} selectable>
            {zipUri}
          </Text>
        )}
      </Step>

      <Step n={2} title="Run the trainer on your Mac">
        <Text style={styles.body}>
          On your Mac, unzip the bundle, clone this repo, then run:
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>
            {`unzip session-${sessionId}.zip -d session-${sessionId}\n`}
            {`cd /path/to/GaussianSplat/scripts\n`}
            {`./train.sh /path/to/session-${sessionId}\n`}
          </Text>
        </View>
        <Text style={styles.body}>
          That writes {'`session-' + sessionId + '/output.splat`'}. The script needs either
          nerfstudio (recommended) or graphdeco-inria/gaussian-splatting on PATH.
        </Text>
      </Step>

      <Step n={3} title="Import the .splat back into the app">
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={importSplat}>
          <Text style={styles.btnLabel}>Import trained splat</Text>
        </Pressable>
        <Text style={styles.body}>
          Pick the {'`output.splat`'} the trainer wrote. The viewer opens automatically.
        </Text>
      </Step>

      <Pressable
        style={[styles.btn, styles.btnSecondary, { marginTop: 24 }]}
        onPress={() => setExperimental((v) => !v)}
      >
        <Text style={styles.btnLabel}>
          {experimental ? 'Hide WebGPU trainer' : 'Show WebGPU trainer (experimental)'}
        </Text>
      </Pressable>

      {experimental && (
        <View style={styles.experimental}>
          <Text style={styles.body}>
            The WebGPU compute kernels in src/services/trainer/webgpuTrainer.ts are stubs. They
            project Gaussians and rasterise into tiles but don't yet backpropagate.
          </Text>
          <Pressable
            style={[styles.btn, styles.btnPrimary]}
            onPress={async () => {
              const { webgpuAvailable, smokeTest } = await import('../services/trainer/webgpuTrainer');
              if (!(await webgpuAvailable())) {
                Alert.alert(
                  'WebGPU not available',
                  'Run on Safari Technology Preview or Chrome with WebGPU enabled.',
                );
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

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>
        {n}. {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, paddingBottom: 32 },
  heading: { color: '#eee', fontSize: 22, fontWeight: '600', marginBottom: 12 },
  body: { color: '#bbb', lineHeight: 20, marginBottom: 12 },
  bodyOk: { color: '#8be78b', marginBottom: 12 },
  banner: {
    backgroundColor: '#1f2030',
    borderLeftWidth: 4,
    borderLeftColor: '#5b8def',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  bannerTitle: { color: '#eee', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  bannerBody: { color: '#bbb', lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  step: {
    backgroundColor: '#15151c',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  stepTitle: { color: '#eee', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  codeBlock: {
    backgroundColor: '#0f0f15',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  code: { color: '#9bb5ff', fontFamily: 'Menlo', fontSize: 12 },
  path: { color: '#888', fontSize: 11, fontFamily: 'Menlo', marginTop: 4 },
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
