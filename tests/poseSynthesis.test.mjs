import test from 'node:test';
import assert from 'node:assert/strict';

test('synthetic orbit generates N cameras around the origin', async () => {
  const { generateSyntheticOrbit } = await import('../src/services/poseSynthesis.ts');
  const out = generateSyntheticOrbit({ frameCount: 8, radius: 3 });
  assert.equal(out.poses.length, 8);
  for (const p of out.poses) {
    const dx = p.transform[3];
    const dz = p.transform[11];
    const r = Math.hypot(dx, dz);
    assert.ok(Math.abs(r - 3) < 1e-6, `camera should sit on radius 3, got ${r}`);
  }
});
