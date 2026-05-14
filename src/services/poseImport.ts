import type { PoseSet, CameraPose } from '../types/index.ts';

export interface RawTransformsJson {
  fl_x?: number;
  fl_y?: number;
  cx?: number;
  cy?: number;
  w?: number;
  h?: number;
  frames: {
    file_path: string;
    transform_matrix: number[][];
  }[];
}

export interface Record3DPose {
  poses: { rotation: number[]; translation: number[] }[];
  intrinsics?: { fx: number; fy: number; cx: number; cy: number; width: number; height: number };
}

export function importTransformsJson(json: RawTransformsJson): PoseSet {
  const poses: CameraPose[] = json.frames.map((f, i) => ({
    frameIndex: i,
    transform: f.transform_matrix.flat(),
    fx: json.fl_x,
    fy: json.fl_y,
    cx: json.cx,
    cy: json.cy,
    width: json.w,
    height: json.h,
  }));
  return { format: 'nerfstudio', poses };
}

export function importRecord3D(json: Record3DPose): PoseSet {
  const poses: CameraPose[] = json.poses.map((p, i) => {
    const r = p.rotation;
    const t = p.translation;
    const T = [
      r[0], r[1], r[2], t[0],
      r[3], r[4], r[5], t[1],
      r[6], r[7], r[8], t[2],
      0,    0,    0,    1,
    ];
    return {
      frameIndex: i,
      transform: T,
      fx: json.intrinsics?.fx,
      fy: json.intrinsics?.fy,
      cx: json.intrinsics?.cx,
      cy: json.intrinsics?.cy,
      width: json.intrinsics?.width,
      height: json.intrinsics?.height,
    };
  });
  return { format: 'record3d', poses };
}

export async function parsePoseFile(uri: string, name: string): Promise<PoseSet> {
  const res = await fetch(uri);
  const text = await res.text();
  const json = JSON.parse(text);
  if (Array.isArray(json?.poses) && json.poses[0]?.rotation) {
    return importRecord3D(json as Record3DPose);
  }
  if (Array.isArray(json?.frames) && json.frames[0]?.transform_matrix) {
    return importTransformsJson(json as RawTransformsJson);
  }
  throw new Error(`Unrecognised pose file format: ${name}`);
}
