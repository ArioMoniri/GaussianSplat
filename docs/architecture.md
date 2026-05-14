# Architecture

```
GaussianSplat (Expo + TypeScript)
├── App.tsx                       Navigation root
├── src/
│   ├── navigation/               React Navigation stack
│   ├── screens/                  One per pipeline stage
│   │   ├── HomeScreen.tsx
│   │   ├── CaptureScreen.tsx     expo-camera + web file picker
│   │   ├── FramesScreen.tsx      ffmpeg.wasm extraction + manual cull
│   │   ├── PosesScreen.tsx       transforms.json / Record3D import
│   │   ├── TrainScreen.tsx       Python recipe + WebGPU kernel stub
│   │   └── ViewScreen.tsx        expo-gl + splatRenderer
│   ├── components/               Cross-screen UI bits
│   ├── services/
│   │   ├── sessionStore.ts       In-memory CaptureSession registry
│   │   ├── frameExtractor.ts     Platform-routed extractor
│   │   ├── poseImport.ts         transforms.json / Record3D parsers
│   │   ├── trainer/
│   │   │   └── webgpuTrainer.ts  WebGPU compute scaffolding
│   │   └── viewer/
│   │       ├── splatLoader.ts    .splat byte layout parser
│   │       ├── camera.ts         Orbit camera math
│   │       └── splatRenderer.ts  WebGL2 point-based renderer
│   └── types/                    Domain types
├── scripts/
│   ├── train.py                  Wraps nerfstudio or Inria 3DGS
│   ├── ply_to_splat.py           Converts trainer output for viewer
│   ├── train.sh                  Convenience entry
│   └── run_colmap.sh             SfM pre-processing recipe
└── tests/                        node --test smoke tests
```

## Boundaries

- **Pure TypeScript domain** lives in `src/types/` and is the only contract the
  services agree on. UI is allowed to know about it; services should not bleed
  React Native types into the domain.
- **Platform splits** are kept inside `services/`. A screen never needs to
  branch on `Platform.OS` — it asks the service, and the service routes.
- **Heavy compute** is opt-in. Frame extraction loads ffmpeg.wasm lazily, the
  WebGPU trainer is gated behind an experimental toggle, the Python trainer is
  out-of-process.

## Why this shape

The pipeline is naturally a pipeline — each stage produces an artifact the next
stage consumes (`CaptureSession.frames`, `.poses`, `.splatUri`). Modelling that
explicitly keeps the UI flow obvious and lets us swap individual stages without
rewiring the whole thing.
