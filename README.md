# GaussianSplat

A self-contained Expo app for capturing video on an iPhone (13 Pro and friends) and turning it into a navigable 3D Gaussian Splatting scene — with as much compute as possible on-device via WebGPU / WASM, and a Python fallback trainer for serious runs.

## What this is

The whole 3DGS pipeline in one app:

1. **Capture** — record video / take overlapping photos with on-screen guidance.
2. **Extract frames** — sample frames from a clip (ffmpeg.wasm on web, native AV on iOS).
3. **Estimate poses** — import COLMAP results or ARKit JSON, or wire in WASM SfM.
4. **Train** — Python script for fast training on a Mac/cloud GPU, plus an in-app WebGPU stub for experimentation.
5. **View** — WebGL splat renderer with orbit + free-fly controls.

## Quick start

```bash
npm install
npm run web      # quickest path on a Mac
npm run ios      # needs Xcode + a real device for camera
```

## Status

Phase 0 scaffold. See [docs/ROADMAP.md](docs/ROADMAP.md) for the phase-by-phase plan and what's implemented.

## License

MIT — see [LICENSE](LICENSE).
