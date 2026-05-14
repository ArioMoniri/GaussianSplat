#!/usr/bin/env python3
"""Wrapper around third-party 3DGS trainers.

Picks the first available trainer it can find:

1. nerfstudio's `splatfacto` (preferred — handles transforms.json natively).
2. graphdeco-inria/gaussian-splatting (`train.py`).

Drop a session directory containing `transforms.json` + an `images/` folder.
The wrapper writes `output.ply` and converts it to `output.splat` so the
in-app viewer can pick it up.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def have(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def run(cmd: list[str]) -> None:
    print('>>>', ' '.join(cmd), flush=True)
    subprocess.check_call(cmd)


def train_with_nerfstudio(session: Path, out: Path) -> Path:
    run([
        'ns-train',
        'splatfacto',
        '--data', str(session),
        '--output-dir', str(out),
        '--viewer.quit-on-train-completion', 'True',
    ])
    plys = sorted(out.rglob('point_cloud.ply'))
    if not plys:
        raise RuntimeError('nerfstudio finished but no point_cloud.ply found')
    return plys[-1]


def train_with_inria(session: Path, out: Path) -> Path:
    repo = Path.home() / 'src' / 'gaussian-splatting'
    if not repo.exists():
        raise RuntimeError(f'Inria 3DGS repo not at {repo}; clone it or use nerfstudio.')
    out.mkdir(parents=True, exist_ok=True)
    run([
        sys.executable,
        str(repo / 'train.py'),
        '-s', str(session),
        '-m', str(out),
    ])
    ply = next(out.rglob('point_cloud.ply'), None)
    if ply is None:
        raise RuntimeError('Inria 3DGS finished but no point_cloud.ply found')
    return ply


def ply_to_splat(ply: Path, splat: Path) -> None:
    # The conversion is straightforward — see ply_to_splat.py for the actual
    # byte-packing. We delegate so the wrapper stays focused.
    run([sys.executable, str(Path(__file__).with_name('ply_to_splat.py')), str(ply), str(splat)])


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('session', type=Path)
    parser.add_argument('--out', type=Path, default=None)
    args = parser.parse_args()

    session = args.session.resolve()
    out = (args.out or (session / 'training_run')).resolve()
    out.mkdir(parents=True, exist_ok=True)

    if have('ns-train'):
        ply = train_with_nerfstudio(session, out)
    else:
        ply = train_with_inria(session, out)

    splat = session / 'output.splat'
    ply_to_splat(ply, splat)
    print(f'wrote {splat}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
