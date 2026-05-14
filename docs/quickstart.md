# Quickstart — iPhone 13 Pro → navigable splat

Practical, opinionated path you can follow today.

## 1. Capture on the iPhone

Open the app on your phone (`npm run ios` once Xcode is wired up, or via Expo Go).

- Tap **Capture → Record video**.
- Walk a smooth orbit around your subject. Aim for 60–120 seconds at 1080p30.
- Keep ~70–80% overlap between consecutive viewpoints. The on-screen reticle nudges you.

If you don't yet have native camera access, use the **web** target: open `npm run web` on your laptop and upload a video you AirDropped from your phone.

## 2. Extract frames

- Tap **Frames → Extract** and pick the source video.
- 2 fps is a good default for a slow orbit; 4 fps if you walked fast.
- Eyeball the thumbnails and drop any motion-blurred ones.

## 3. Poses

The on-device SfM path isn't ready yet. Use one of:

- **Record3D** on your iPhone — exports per-frame poses + RGB + depth. Drop the `.r3d` into **Poses → Import Record3D**.
- **COLMAP** on your Mac — see `scripts/run_colmap.sh`. Drop the resulting `transforms.json` into **Poses → Import transforms.json**.

## 4. Train

```bash
# requires Python 3.11, CUDA preferred. On Apple Silicon a Metal/MPS path is provided but slow.
cd scripts
./train.sh ../sessions/<session-id>
```

The trainer drops a `.splat` next to the session. Pull it into the app from **Train → Load output**.

## 5. View

**View** auto-loads the latest `.splat`. Drag to orbit, scroll to zoom, WASD + mouse to free-fly.

That's the whole loop.
