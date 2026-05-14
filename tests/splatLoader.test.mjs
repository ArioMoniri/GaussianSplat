// Smoke test for the .splat parser. Runs via `node --test`.

import test from 'node:test';
import assert from 'node:assert/strict';

const STRIDE = 32;

function makeSplat(count) {
  const buf = new ArrayBuffer(count * STRIDE);
  const view = new DataView(buf);
  for (let i = 0; i < count; i++) {
    view.setFloat32(i * STRIDE + 0, i, true);
    view.setFloat32(i * STRIDE + 4, i + 0.5, true);
    view.setFloat32(i * STRIDE + 8, i + 1.5, true);
    view.setFloat32(i * STRIDE + 12, 0.1, true);
    view.setFloat32(i * STRIDE + 16, 0.2, true);
    view.setFloat32(i * STRIDE + 20, 0.3, true);
    view.setUint8(i * STRIDE + 24, (i * 7) & 0xff);
    view.setUint8(i * STRIDE + 25, (i * 11) & 0xff);
    view.setUint8(i * STRIDE + 26, (i * 13) & 0xff);
    view.setUint8(i * STRIDE + 27, 255);
    view.setUint8(i * STRIDE + 28, 0);
    view.setUint8(i * STRIDE + 29, 0);
    view.setUint8(i * STRIDE + 30, 0);
    view.setUint8(i * STRIDE + 31, 255);
  }
  return buf;
}

test('parses a .splat buffer of N gaussians', async () => {
  const { parseSplatBuffer } = await import('../src/services/viewer/splatLoader.ts');
  const N = 5;
  const buf = makeSplat(N);
  const parsed = parseSplatBuffer(buf);
  assert.equal(parsed.count, N);
  assert.equal(parsed.positions.length, N * 3);
  assert.equal(parsed.colors.length, N * 4);
  assert.equal(parsed.positions[0], 0);
  assert.equal(parsed.positions[3], 1);
});

test('rejects truncated buffers', async () => {
  const { parseSplatBuffer } = await import('../src/services/viewer/splatLoader.ts');
  const bad = new ArrayBuffer(31);
  assert.throws(() => parseSplatBuffer(bad), /Bad \.splat/);
});
