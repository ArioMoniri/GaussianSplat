import type { CameraPose, PoseSet } from '../types/index.ts';

export interface SyntheticOrbitOptions {
  frameCount: number;
  radius?: number;
  height?: number;
  imageWidth?: number;
  imageHeight?: number;
  // Horizontal FOV in degrees. iPhone 13 Pro wide camera is ~73°.
  horizontalFovDeg?: number;
  // Explicit focal in pixels — overrides horizontalFovDeg if set.
  focalLength?: number;
}

// Builds N cameras on a circle around the origin, all looking inward.
// Assumes the user walked a roughly circular orbit. The trainer takes a hit
// in quality vs. real SfM poses, but the pipeline runs end-to-end.
export function generateSyntheticOrbit(opts: SyntheticOrbitOptions): PoseSet {
  const {
    frameCount,
    radius = 2.0,
    height = 0.0,
    imageWidth = 1280,
    imageHeight = 720,
    horizontalFovDeg = 70,
  } = opts;
  const focalLength =
    opts.focalLength ??
    (0.5 * imageWidth) / Math.tan((horizontalFovDeg * Math.PI) / 360);

  const poses: CameraPose[] = [];
  for (let i = 0; i < frameCount; i++) {
    const angle = (i / Math.max(frameCount, 1)) * Math.PI * 2;
    const eye: [number, number, number] = [
      radius * Math.cos(angle),
      height,
      radius * Math.sin(angle),
    ];
    poses.push({
      frameIndex: i,
      transform: lookAtMatrix(eye, [0, 0, 0], [0, 1, 0]),
      fx: focalLength,
      fy: focalLength,
      cx: imageWidth / 2,
      cy: imageHeight / 2,
      width: imageWidth,
      height: imageHeight,
    });
  }
  return { format: 'nerfstudio', poses };
}

function lookAtMatrix(
  eye: [number, number, number],
  center: [number, number, number],
  up: [number, number, number],
): number[] {
  const zx = eye[0] - center[0];
  const zy = eye[1] - center[1];
  const zz = eye[2] - center[2];
  const zl = Math.hypot(zx, zy, zz) || 1;
  const z = [zx / zl, zy / zl, zz / zl];

  // x = up × z
  const xx = up[1] * z[2] - up[2] * z[1];
  const xy = up[2] * z[0] - up[0] * z[2];
  const xz = up[0] * z[1] - up[1] * z[0];
  const xl = Math.hypot(xx, xy, xz) || 1;
  const x = [xx / xl, xy / xl, xz / xl];

  // y = z × x
  const y = [
    z[1] * x[2] - z[2] * x[1],
    z[2] * x[0] - z[0] * x[2],
    z[0] * x[1] - z[1] * x[0],
  ];

  // Column-major 4x4 with rotation in the upper-left 3x3 and eye in the
  // translation column; this matches the nerfstudio/Blender convention used
  // by transforms.json.
  return [
    x[0], y[0], z[0], eye[0],
    x[1], y[1], z[1], eye[1],
    x[2], y[2], z[2], eye[2],
    0,    0,    0,    1,
  ];
}
