export interface OrbitState {
  yaw: number;
  pitch: number;
  distance: number;
  target: [number, number, number];
}

export function makeOrbit(): OrbitState {
  return { yaw: 0, pitch: 0, distance: 3, target: [0, 0, 0] };
}

export function orbitDelta(state: OrbitState, dx: number, dy: number): OrbitState {
  const yaw = state.yaw - dx * 0.005;
  let pitch = state.pitch - dy * 0.005;
  pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
  return { ...state, yaw, pitch };
}

export function orbitZoom(state: OrbitState, factor: number): OrbitState {
  return { ...state, distance: Math.max(0.2, state.distance * factor) };
}

export function computeViewMatrix(state: OrbitState): Float32Array {
  const cy = Math.cos(state.yaw);
  const sy = Math.sin(state.yaw);
  const cp = Math.cos(state.pitch);
  const sp = Math.sin(state.pitch);
  const ex = state.target[0] + state.distance * cp * sy;
  const ey = state.target[1] + state.distance * sp;
  const ez = state.target[2] + state.distance * cp * cy;
  return lookAt([ex, ey, ez], state.target, [0, 1, 0]);
}

function lookAt(
  eye: [number, number, number],
  center: [number, number, number],
  up: [number, number, number],
): Float32Array {
  const [zx, zy, zz] = normalize(sub(eye, center));
  const [xx, xy, xz] = normalize(cross(up, [zx, zy, zz]));
  const [yx, yy, yz] = cross([zx, zy, zz], [xx, xy, xz]);
  const m = new Float32Array(16);
  m[0] = xx; m[4] = xy; m[8] = xz; m[12] = -dot([xx, xy, xz], eye);
  m[1] = yx; m[5] = yy; m[9] = yz; m[13] = -dot([yx, yy, yz], eye);
  m[2] = zx; m[6] = zy; m[10] = zz; m[14] = -dot([zx, zy, zz], eye);
  m[3] = 0;  m[7] = 0;  m[11] = 0;  m[15] = 1;
  return m;
}

export function perspective(fovy: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

const sub = (a: number[], b: number[]): [number, number, number] => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: number[], b: number[]): [number, number, number] => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v: number[]): [number, number, number] => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
