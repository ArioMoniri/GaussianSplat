import { Platform } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import type { CaptureSession, Frame } from '../types/index.ts';

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
    return extractWebHtml5(session.source.uri, opts);
  }
  return extractNative(session.source.uri, opts);
}

async function extractNative(uri: string, opts: ExtractOptions): Promise<Frame[]> {
  // Probe duration: grab one frame to discover that the URL is valid and that
  // expo-video-thumbnails can read it. The first call also returns the
  // generated thumbnail's dimensions, but we don't need duration here — we
  // sample at fixed intervals up to maxFrames.
  const intervalMs = 1000 / opts.fps;
  const maxFrames = opts.maxFrames ?? 200;
  const frames: Frame[] = [];

  for (let i = 0; i < maxFrames; i++) {
    const t = i * intervalMs;
    try {
      const out = await VideoThumbnails.getThumbnailAsync(uri, {
        time: t,
        quality: 0.7,
      });
      frames.push({
        uri: out.uri,
        timestampMs: t,
        width: out.width,
        height: out.height,
        selected: true,
      });
      opts.onProgress?.(Math.min(1, (i + 1) / maxFrames));
    } catch (err) {
      // expo-video-thumbnails throws once we sample past the end of the video.
      // Treat that as the natural stopping point.
      if (frames.length > 0) break;
      throw err;
    }
  }

  return frames;
}

async function extractWebHtml5(uri: string, opts: ExtractOptions): Promise<Frame[]> {
  if (typeof document === 'undefined') {
    throw new Error('Web extractor requires a DOM');
  }
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = uri;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Could not load video for frame extraction'));
  });

  const duration = video.duration;
  if (!isFinite(duration) || duration <= 0) {
    throw new Error('Video metadata reports no duration; cannot extract frames');
  }

  const total = Math.min(opts.maxFrames ?? Infinity, Math.max(1, Math.floor(duration * opts.fps)));
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  const frames: Frame[] = [];
  for (let i = 0; i < total; i++) {
    const t = i / opts.fps;
    await seekTo(video, t);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (!blob) continue;
    frames.push({
      uri: URL.createObjectURL(blob),
      timestampMs: t * 1000,
      width: canvas.width,
      height: canvas.height,
      selected: true,
    });
    opts.onProgress?.((i + 1) / total);
  }
  return frames;
}

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = t;
  });
}
