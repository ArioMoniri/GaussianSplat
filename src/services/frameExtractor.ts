import { Platform } from 'react-native';
import { CaptureSession, Frame } from '../types';

export interface ExtractOptions {
  fps: number;
  maxFrames?: number;
  onProgress?: (ratio: number) => void;
}

export async function extractFrames(
  session: CaptureSession,
  opts: ExtractOptions,
): Promise<Frame[]> {
  if (session.source.kind === 'images') {
    return session.source.uris.map((uri) => ({ uri, selected: true }));
  }
  if (Platform.OS === 'web') {
    return extractWeb(session.source.uri, opts);
  }
  return extractNativePlaceholder(session.source.uri);
}

async function extractWeb(uri: string, opts: ExtractOptions): Promise<Frame[]> {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { fetchFile, toBlobURL } = await import('@ffmpeg/util');
  const ffmpeg = new FFmpeg();

  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpeg.on('progress', ({ progress }) => opts.onProgress?.(progress));
  await ffmpeg.writeFile('in.mp4', await fetchFile(uri));

  const filter = opts.maxFrames
    ? `fps=${opts.fps},select='lte(n,${opts.maxFrames - 1})'`
    : `fps=${opts.fps}`;

  await ffmpeg.exec(['-i', 'in.mp4', '-vf', filter, '-q:v', '3', 'f_%04d.jpg']);

  const list = await ffmpeg.listDir('/');
  const frameNames = list
    .filter((e) => e.name.startsWith('f_') && e.name.endsWith('.jpg'))
    .map((e) => e.name)
    .sort();

  const frames: Frame[] = [];
  for (const name of frameNames) {
    const data = await ffmpeg.readFile(name);
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(0);
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    frames.push({ uri: URL.createObjectURL(blob), selected: true });
  }
  return frames;
}

async function extractNativePlaceholder(uri: string): Promise<Frame[]> {
  // Native ffmpeg via @ffmpeg/ffmpeg doesn't run inside RN. On native the
  // pragmatic path is either: (a) ship the video off to the web target for
  // extraction, or (b) capture as a burst of photos in the first place.
  // We surface the video as a single "frame" so the UI can still drive the
  // session forward and the user can re-extract on a host.
  return [{ uri, selected: true }];
}
