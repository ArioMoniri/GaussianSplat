import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { sessionStore, newSessionId } from '../services/sessionStore';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

export function CaptureScreen({ navigation }: Props) {
  const isWeb = Platform.OS === 'web';

  if (isWeb) return <WebCapture navigation={navigation} />;
  return <NativeCapture navigation={navigation} />;
}

function NativeCapture({ navigation }: Props) {
  const [cameraPerm, requestCamera] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const ref = useRef<CameraView | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - t0), 250);
    return () => clearInterval(id);
  }, [recording]);

  if (!cameraPerm?.granted || !micPerm?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>
          GaussianSplat needs the camera and microphone to capture an orbit video.
        </Text>
        <Pressable
          style={[styles.btn, styles.btnPrimary]}
          onPress={async () => {
            await requestCamera();
            await requestMic();
          }}
        >
          <Text style={styles.btnLabel}>Grant access</Text>
        </Pressable>
      </View>
    );
  }

  const onShutter = async () => {
    const cam = ref.current;
    if (!cam) return;
    if (!recording) {
      setRecording(true);
      try {
        const result = await cam.recordAsync({ maxDuration: 180 });
        if (result?.uri) {
          const id = newSessionId();
          sessionStore.upsert({
            id,
            createdAt: Date.now(),
            name: `Capture ${new Date().toLocaleString()}`,
            source: { kind: 'video', uri: result.uri },
          });
          navigation.replace('Frames', { sessionId: id });
        }
      } catch (e) {
        Alert.alert('Recording failed', String(e));
      } finally {
        setRecording(false);
      }
    } else {
      cam.stopRecording();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={ref} mode="video" style={{ flex: 1 }} facing="back" />
      <Reticle />
      <View style={styles.bottomBar}>
        <Text style={styles.timer}>
          {recording ? `${(elapsed / 1000).toFixed(1)}s` : '00.0s'}
        </Text>
        <Pressable onPress={onShutter} style={[styles.shutter, recording && styles.shutterRec]} />
      </View>
    </View>
  );
}

function WebCapture({ navigation }: Props) {
  const onPick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['video/*', 'image/*'],
      multiple: true,
    });
    if (res.canceled) return;
    const assets = res.assets ?? [];
    if (assets.length === 0) return;

    const id = newSessionId();
    const first = assets[0];
    const isVideo = first.mimeType?.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(first.name);
    sessionStore.upsert({
      id,
      createdAt: Date.now(),
      name: `Import ${new Date().toLocaleString()}`,
      source: isVideo
        ? { kind: 'video', uri: first.uri }
        : { kind: 'images', uris: assets.map((a) => a.uri) },
    });
    navigation.replace('Frames', { sessionId: id });
  };

  return (
    <View style={styles.center}>
      <Text style={styles.heading}>Upload from this device</Text>
      <Text style={styles.body}>
        Camera capture only runs on iOS/Android. On the web target, drop in a video or a folder of
        overlapping photos.
      </Text>
      <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onPick}>
        <Text style={styles.btnLabel}>Pick file(s)</Text>
      </Pressable>
    </View>
  );
}

function Reticle() {
  return (
    <View pointerEvents="none" style={styles.reticleWrap}>
      <View style={styles.reticle} />
      <Text style={styles.reticleHint}>Walk a smooth orbit · keep subject centred · 60–120s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heading: { color: '#eee', fontSize: 22, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  body: { color: '#bbb', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  btn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
  btnPrimary: { backgroundColor: '#5b8def' },
  btnLabel: { color: 'white', fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  timer: { color: 'white', marginBottom: 12, fontVariant: ['tabular-nums'] },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'white',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  shutterRec: { backgroundColor: '#ef4d4d' },
  reticleWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  reticleHint: {
    position: 'absolute',
    bottom: 120,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
