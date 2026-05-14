import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { GLView } from 'expo-gl';
import { loadSplatFromUri, ParsedSplat } from '../services/viewer/splatLoader';
import { createRenderer } from '../services/viewer/splatRenderer';
import {
  computeViewMatrix,
  makeOrbit,
  OrbitState,
  orbitDelta,
  orbitZoom,
} from '../services/viewer/camera';
import { sessionStore } from '../services/sessionStore';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'View'>;

export function ViewScreen({ route }: Props) {
  const [splat, setSplat] = useState<ParsedSplat | null>(null);
  const orbitRef = useRef<OrbitState>(makeOrbit());
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const rendererRef = useRef<ReturnType<typeof createRenderer> | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const uri =
      route.params?.splatUri ??
      (route.params?.sessionId
        ? sessionStore.get(route.params.sessionId)?.splatUri
        : undefined);
    if (!uri) return;
    loadSplatFromUri(uri).then(setSplat).catch((e) => Alert.alert('Load failed', String(e)));
  }, [route.params]);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['*/*'], multiple: false });
    if (res.canceled) return;
    const file = res.assets?.[0];
    if (!file) return;
    try {
      const s = await loadSplatFromUri(file.uri);
      setSplat(s);
    } catch (e) {
      Alert.alert('Load failed', String(e));
    }
  };

  const draw = () => {
    const gl = glRef.current;
    const r = rendererRef.current;
    if (!gl || !r) return;
    r.render(computeViewMatrix(orbitRef.current), Math.PI / 3);
    (gl as unknown as { endFrameEXP?: () => void }).endFrameEXP?.();
    rafRef.current = requestAnimationFrame(draw);
  };

  const onContextCreate = (gl: WebGL2RenderingContext) => {
    glRef.current = gl;
    if (splat) {
      rendererRef.current = createRenderer(gl, splat);
      draw();
    }
  };

  useEffect(() => {
    const gl = glRef.current;
    if (!gl || !splat) return;
    rendererRef.current?.dispose();
    rendererRef.current = createRenderer(gl, splat);
    if (rafRef.current == null) draw();
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [splat]);

  const onTouchStart = (e: any) => {
    const t = e.nativeEvent.touches?.[0] ?? e.nativeEvent;
    dragRef.current = { x: t.pageX, y: t.pageY };
  };
  const onTouchMove = (e: any) => {
    const t = e.nativeEvent.touches?.[0] ?? e.nativeEvent;
    if (!dragRef.current) return;
    const dx = t.pageX - dragRef.current.x;
    const dy = t.pageY - dragRef.current.y;
    dragRef.current = { x: t.pageX, y: t.pageY };
    orbitRef.current = orbitDelta(orbitRef.current, dx, dy);
  };
  const onTouchEnd = () => { dragRef.current = null; };
  const onWheel = (e: any) => {
    const dy = e.deltaY ?? 0;
    orbitRef.current = orbitZoom(orbitRef.current, dy > 0 ? 1.1 : 0.9);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.body}>
          {splat ? `${splat.count.toLocaleString()} splats` : 'No splat loaded'}
        </Text>
        <Pressable onPress={pick} style={[styles.btn, styles.btnPrimary]}>
          <Text style={styles.btnLabel}>Open .splat</Text>
        </Pressable>
      </View>

      <View
        style={styles.canvasWrap}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        {...(Platform.OS === 'web' ? { onWheel } : {})}
      >
        {splat ? (
          <GLView
            style={StyleSheet.absoluteFill}
            onContextCreate={onContextCreate as unknown as (gl: WebGLRenderingContext) => void}
          />
        ) : (
          <Text style={styles.empty}>Open a .splat file to preview it.</Text>
        )}
      </View>

      <Text style={styles.hint}>
        Drag to orbit · scroll to zoom · Phase 5 renders as soft points; the EWA splat path lands
        next.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  body: { color: '#bbb' },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  btnPrimary: { backgroundColor: '#5b8def' },
  btnLabel: { color: 'white', fontWeight: '600' },
  canvasWrap: { flex: 1, backgroundColor: '#0b0b10' },
  empty: { color: '#888', textAlign: 'center', marginTop: 60 },
  hint: { color: '#666', textAlign: 'center', padding: 8, fontSize: 12 },
});
