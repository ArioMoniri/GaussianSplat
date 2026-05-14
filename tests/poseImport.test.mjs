import test from 'node:test';
import assert from 'node:assert/strict';

test('imports a nerfstudio transforms.json', async () => {
  const { importTransformsJson } = await import('../src/services/poseImport.ts');
  const json = {
    fl_x: 800,
    fl_y: 800,
    cx: 320,
    cy: 240,
    w: 640,
    h: 480,
    frames: [
      { file_path: 'a.jpg', transform_matrix: [[1,0,0,0],[0,1,0,1],[0,0,1,2],[0,0,0,1]] },
      { file_path: 'b.jpg', transform_matrix: [[1,0,0,3],[0,1,0,0],[0,0,1,0],[0,0,0,1]] },
    ],
  };
  const out = importTransformsJson(json);
  assert.equal(out.format, 'nerfstudio');
  assert.equal(out.poses.length, 2);
  assert.equal(out.poses[1].transform[3], 3);
});
