import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { sessionStore } from '../services/sessionStore';
import { parsePoseFile } from '../services/poseImport';
import { generateSyntheticOrbit } from '../services/poseSynthesis';
import { TrajectoryPreview } from '../components/TrajectoryPreview';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Poses'>;

export function PosesScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const session = sessionStore.get(sessionId);
  const [error, setError] = useState<string | null>(null);

  if (!session) return null;

  const pick = async () => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json'],
      multiple: false,
    });
    if (res.canceled) return;
    const file = res.assets?.[0];
    if (!file) return;
    try {
      const poses = await parsePoseFile(file.uri, file.name);
      sessionStore.upsert({ ...session, poses });
      Alert.alert('Poses loaded', `${poses.poses.length} cameras (${poses.format}).`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.body}>
        Two ways to get poses. Real SfM (COLMAP / Record3D) gives sharp splats but you have to run
        it externally — see docs/quickstart.md. The synthetic orbit assumes you walked a smooth
        circle around the subject; quality is rough but the pipeline runs end-to-end without any
        external tools.
      </Text>

      <View style={styles.row}>
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={pick}>
          <Text style={styles.btnLabel}>Import pose JSON</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => {
            const frameCount = session.frames?.length ?? 36;
            const poses = generateSyntheticOrbit({ frameCount });
            sessionStore.upsert({ ...session, poses });
            Alert.alert(
              'Synthetic poses ready',
              `Generated ${frameCount} circular-orbit cameras. Next: export to your Mac and train.`,
              [
                { text: 'Stay here', style: 'cancel' },
                {
                  text: 'Continue to training',
                  onPress: () => navigation.navigate('Train', { sessionId }),
                },
              ],
            );
          }}
        >
          <Text style={styles.btnLabel}>Generate synthetic orbit</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {session.poses && (
        <View style={styles.preview}>
          <Text style={styles.heading}>
            {session.poses.poses.length} cameras · {session.poses.format}
          </Text>
          <TrajectoryPreview poses={session.poses} />
        </View>
      )}

      <View style={styles.footer}>
        <Pressable
          style={[styles.btn, styles.btnPrimary, !session.poses && { opacity: 0.5 }]}
          disabled={!session.poses}
          onPress={() => navigation.navigate('Train', { sessionId })}
        >
          <Text style={styles.btnLabel}>Continue to training →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  body: { color: '#bbb', lineHeight: 20, marginBottom: 16 },
  heading: { color: '#eee', fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  btnPrimary: { backgroundColor: '#5b8def' },
  btnSecondary: { backgroundColor: '#2a2a36' },
  btnLabel: { color: 'white', fontWeight: '600' },
  preview: { flex: 1, marginVertical: 16 },
  error: { color: '#ef6b6b', marginBottom: 12 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#222', paddingTop: 12 },
});
