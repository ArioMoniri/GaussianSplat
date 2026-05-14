import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { zipSync, strToU8 } from 'fflate';
import type { CaptureSession } from '../types/index.ts';

export interface ExportProgress {
  stage: 'frames' | 'zip' | 'share';
  ratio?: number;
}

// Builds a nerfstudio-style transforms.json and bundles it with every kept
// frame in a single .zip the user can AirDrop / drag onto a Mac. The Python
// trainer expects exactly this layout:
//
//   session-<id>.zip
//     ├─ transforms.json
//     └─ images/
//        ├─ 0001.jpg
//        ├─ 0002.jpg
//        └─ ...
export async function exportSessionAsZip(
  session: CaptureSession,
  onProgress?: (p: ExportProgress) => void,
): Promise<{ zipUri: string; filename: string }> {
  if (!session.frames || session.frames.length === 0) {
    throw new Error('No frames in session — extract frames first.');
  }
  if (!session.poses || session.poses.poses.length === 0) {
    throw new Error('No poses in session — import or synthesise poses first.');
  }

  const keptFrames = session.frames.filter((f) => f.selected);
  if (keptFrames.length === 0) {
    throw new Error('No frames selected. Tap thumbnails to keep at least one.');
  }

  const intrinsicSrc = session.poses.poses[0];
  const transforms = {
    fl_x: intrinsicSrc.fx ?? 900,
    fl_y: intrinsicSrc.fy ?? 900,
    cx: intrinsicSrc.cx ?? 640,
    cy: intrinsicSrc.cy ?? 360,
    w: intrinsicSrc.width ?? 1280,
    h: intrinsicSrc.height ?? 720,
    camera_model: 'OPENCV',
    frames: keptFrames.map((_, i) => {
      const pose = session.poses!.poses[i] ?? session.poses!.poses[session.poses!.poses.length - 1];
      const m = pose.transform;
      return {
        file_path: `images/${String(i + 1).padStart(4, '0')}.jpg`,
        transform_matrix: [
          [m[0],  m[1],  m[2],  m[3]],
          [m[4],  m[5],  m[6],  m[7]],
          [m[8],  m[9],  m[10], m[11]],
          [m[12], m[13], m[14], m[15]],
        ],
      };
    }),
  };

  const entries: Record<string, Uint8Array> = {};
  entries['transforms.json'] = strToU8(JSON.stringify(transforms, null, 2));

  for (let i = 0; i < keptFrames.length; i++) {
    onProgress?.({ stage: 'frames', ratio: i / keptFrames.length });
    const bytes = await readFrameBytes(keptFrames[i].uri);
    entries[`images/${String(i + 1).padStart(4, '0')}.jpg`] = bytes;
  }

  onProgress?.({ stage: 'zip' });
  const zipped = zipSync(entries, { level: 6 });

  const filename = `session-${session.id}.zip`;
  const zipUri = await writeZip(filename, zipped);

  onProgress?.({ stage: 'share' });
  if (Platform.OS === 'web') {
    triggerBrowserDownload(zipped, filename);
  } else if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(zipUri, {
      dialogTitle: 'Send session to Mac',
      mimeType: 'application/zip',
      UTI: 'public.zip-archive',
    });
  }

  return { zipUri, filename };
}

async function readFrameBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith('blob:') || uri.startsWith('http')) {
    const res = await fetch(uri);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToBytes(base64);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = globalThis.atob ? globalThis.atob(b64) : decodeBase64Node(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeBase64Node(b64: string): string {
  return globalThis.Buffer.from(b64, 'base64').toString('binary');
}

async function writeZip(filename: string, data: Uint8Array): Promise<string> {
  if (Platform.OS === 'web') {
    return URL.createObjectURL(new Blob([data.buffer as ArrayBuffer], { type: 'application/zip' }));
  }
  const target = `${FileSystem.cacheDirectory}${filename}`;
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < data.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(data.subarray(i, i + chunk)));
  }
  const base64 = globalThis.btoa ? globalThis.btoa(bin) : globalThis.Buffer.from(bin, 'binary').toString('base64');
  await FileSystem.writeAsStringAsync(target, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return target;
}

function triggerBrowserDownload(data: Uint8Array, filename: string) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
