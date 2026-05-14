// Loader for the .splat format used by antimatter15/splat and several other
// viewers. Each splat is laid out as:
//
//   float32 x, y, z                (12 bytes)
//   float32 sx, sy, sz             (12 bytes)
//   uint8   r, g, b, a             (4 bytes)
//   uint8   rot0, rot1, rot2, rot3 (4 bytes)
//
// Total: 32 bytes per Gaussian.

export interface ParsedSplat {
  count: number;
  positions: Float32Array;
  scales: Float32Array;
  colors: Uint8Array;
  rotations: Uint8Array;
  raw: ArrayBuffer;
}

export async function loadSplatFromUri(uri: string): Promise<ParsedSplat> {
  const res = await fetch(uri);
  const buf = await res.arrayBuffer();
  return parseSplatBuffer(buf);
}

export function parseSplatBuffer(buf: ArrayBuffer): ParsedSplat {
  const STRIDE = 32;
  if (buf.byteLength % STRIDE !== 0) {
    throw new Error(`Bad .splat: ${buf.byteLength} bytes is not a multiple of ${STRIDE}`);
  }
  const count = buf.byteLength / STRIDE;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count * 3);
  const colors = new Uint8Array(count * 4);
  const rotations = new Uint8Array(count * 4);

  const fview = new Float32Array(buf);
  const bview = new Uint8Array(buf);
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = fview[i * 8 + 0];
    positions[i * 3 + 1] = fview[i * 8 + 1];
    positions[i * 3 + 2] = fview[i * 8 + 2];
    scales[i * 3 + 0] = fview[i * 8 + 3];
    scales[i * 3 + 1] = fview[i * 8 + 4];
    scales[i * 3 + 2] = fview[i * 8 + 5];
    colors[i * 4 + 0] = bview[i * 32 + 24];
    colors[i * 4 + 1] = bview[i * 32 + 25];
    colors[i * 4 + 2] = bview[i * 32 + 26];
    colors[i * 4 + 3] = bview[i * 32 + 27];
    rotations[i * 4 + 0] = bview[i * 32 + 28];
    rotations[i * 4 + 1] = bview[i * 32 + 29];
    rotations[i * 4 + 2] = bview[i * 32 + 30];
    rotations[i * 4 + 3] = bview[i * 32 + 31];
  }
  return { count, positions, scales, colors, rotations, raw: buf };
}
