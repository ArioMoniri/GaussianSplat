# Roadmap

The app is built in phases. Each phase is independently committed and pushed.

## Phase 0 — Scaffold ✅

- Expo TypeScript app, MIT licensed, pushed to `ArioMoniri/GaussianSplat`.
- Folder layout: `src/`, `tests/`, `docs/`, `scripts/`, `assets/`.
- Navigation stack (Home → Capture → Frames → Poses → Train → View).
- Type-only domain model in `src/types/`.

## Phase 1 — Capture ✅

- Native: `expo-camera` with a guided record session.
- Web: file picker that accepts a video or a folder of images.
- All output lands as a `CaptureSession` in `src/services/sessionStore.ts`.

## Phase 2 — Frame extraction ✅

- Web path: `@ffmpeg/ffmpeg` (WASM) extracts N frames per second.
- Native fallback: pass-through if the input is already a folder of images.
- Thumbnails + manual keep/drop UI before moving on.

## Phase 3 — Poses ✅

- Import a `transforms.json` (Nerfstudio / instant-NGP format) **or** a `cameras.bin` COLMAP export.
- ARKit JSON support for Record3D-style exports (rotation + translation per frame).
- Pose preview: small canvas drawing the camera trajectory.

## Phase 4 — Training ✅ (hybrid)

- `scripts/train.py` — minimal 3DGS trainer wrapper, calls `graphdeco-inria/gaussian-splatting` or `nerfstudio` if installed. Outputs a `.ply` and a `.splat` file.
- `scripts/train.sh` — convenience wrapper.
- `src/services/trainer/webgpuTrainer.ts` — WebGPU compute stub that exposes the kernel skeleton (projection + tile rasterizer) so we can iterate in-browser once a small scene works end-to-end. Not production-ready; flagged behind an experimental toggle.

## Phase 5 — Viewer ✅

- `src/services/viewer/splatRenderer.ts` — WebGL2 renderer based on the antimatter15/splat sort + projection approach.
- `src/screens/ViewScreen.tsx` — orbit + free-fly controls, supports `.splat` and PLY (binary).
- On native, viewer runs via `expo-gl`.

## Phase 6 — End-to-end glue ✅

- Single-tap flow on Home: pick a capture, ride the pipeline, drop into the viewer.
- A `quickstart.md` documents the recommended path (record on iPhone → import on Mac → train via script → push the `.splat` back into the app).
- Tag `v1.0` once the loop works on at least one scene.

## Beyond v1.0

- WebGPU trainer becomes the default once Apple's WebGPU implementation is stable enough.
- ARKit live capture with depth (LiDAR) bypassing COLMAP entirely.
- Cloud training button (push frames → run on a remote GPU → pull splat back).
