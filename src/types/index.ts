export type CaptureSource =
  | { kind: 'video'; uri: string; durationMs?: number }
  | { kind: 'images'; uris: string[] }
  | { kind: 'record3d'; uri: string };

export interface CaptureSession {
  id: string;
  createdAt: number;
  name: string;
  source: CaptureSource;
  frames?: Frame[];
  poses?: PoseSet;
  splatUri?: string;
}

export interface Frame {
  uri: string;
  timestampMs?: number;
  width?: number;
  height?: number;
  selected: boolean;
}

export interface CameraPose {
  frameIndex: number;
  transform: number[];
  fx?: number;
  fy?: number;
  cx?: number;
  cy?: number;
  width?: number;
  height?: number;
}

export interface PoseSet {
  format: 'nerfstudio' | 'colmap' | 'arkit' | 'record3d';
  poses: CameraPose[];
}

export type Screen =
  | 'Home'
  | 'Capture'
  | 'Frames'
  | 'Poses'
  | 'Train'
  | 'View';
