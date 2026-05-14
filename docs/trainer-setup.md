# Trainer setup

3D Gaussian Splatting training needs a GPU. Three paths, ranked by friction.

---

## 1. Colab (free GPU, zero install) — recommended

1. Open the notebook in Colab:
   <https://colab.research.google.com/github/ArioMoniri/GaussianSplat/blob/main/scripts/train_colab.ipynb>
2. **Runtime → Change runtime type → T4 GPU**.
3. Run the cells top to bottom. When it asks for an upload, give it the `session-<id>.zip` the app produced.
4. Wait ~10 minutes (default 7000 iterations).
5. The last cell downloads `output.splat`. AirDrop it to your phone.
6. In the app: **Train → Import trained splat** → pick the file.

Caveats: Colab's free GPU disconnects after ~12h idle. For >5min training, stay on the tab so it doesn't time out.

---

## 2. Brush on Mac (Apple Silicon, no Python)

[Brush](https://github.com/ArthurBrussee/brush) is a Bevy/WebGPU-based 3DGS trainer that runs natively on M-series Macs.

```bash
# Grab the latest release for macOS aarch64 from
# https://github.com/ArthurBrussee/brush/releases
# (file name varies; pick the *macos-aarch64* zip).
unzip ~/Downloads/brush-macos-aarch64.zip -d ~/brush
chmod +x ~/brush/brush_app

# Run training (Brush understands nerfstudio's transforms.json out of the box).
~/brush/brush_app --source ~/Downloads/session-<id> --export-path output.ply

# Convert to .splat for the in-app viewer
cd /Users/ario/Downloads/gaussiansplat/scripts
python3 ply_to_splat.py ~/Downloads/session-<id>/output.ply ~/Downloads/output.splat
```

Apple Silicon WebGPU training is slower than CUDA — expect 20–40 minutes for a small scene. Quality matches nerfstudio's splatfacto.

---

## 3. nerfstudio on Mac (only with Python 3.10)

nerfstudio **does not install on Python 3.13** (the dependency `av==9.2.0` doesn't compile against Cython 3 on 3.13). Homebrew's `python3` ships 3.13 today, so a system `pip install nerfstudio` will always fail with the error you saw.

If you want this path:

```bash
# Install a compatible Python via pyenv
brew install pyenv
pyenv install 3.10.14
pyenv local 3.10.14

python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip wheel
pip install nerfstudio
```

Then `scripts/train.sh ~/Downloads/session-<id>` works. On Apple Silicon nerfstudio falls back to MPS — splatfacto is **slow** (sometimes hours) and a few methods are CUDA-only.

For most people, **option 1 (Colab) is the right answer.**
