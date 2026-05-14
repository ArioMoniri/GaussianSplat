#!/usr/bin/env python3
"""Convert a 3DGS .ply (Inria / nerfstudio format) into the antimatter15 .splat
byte layout used by the in-app viewer.

Layout: float32 x,y,z, float32 sx,sy,sz, uint8 r,g,b,a, uint8 rot quaternion
(packed). See src/services/viewer/splatLoader.ts.
"""

from __future__ import annotations

import argparse
import math
import struct
import sys
from pathlib import Path


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def read_ply(path: Path) -> tuple[list[str], list[bytes]]:
    with path.open('rb') as f:
        header: list[str] = []
        while True:
            line = f.readline().decode('ascii', errors='ignore').strip()
            header.append(line)
            if line == 'end_header':
                break
        body = f.read()
    return header, [body]


def parse_props(header: list[str]) -> tuple[int, list[tuple[str, str]]]:
    count = 0
    props: list[tuple[str, str]] = []
    for line in header:
        if line.startswith('element vertex'):
            count = int(line.split()[-1])
        elif line.startswith('property'):
            parts = line.split()
            props.append((parts[1], parts[2]))
    return count, props


PLY_TYPES = {
    'float': ('f', 4),
    'float32': ('f', 4),
    'double': ('d', 8),
    'uchar': ('B', 1),
    'uint8': ('B', 1),
    'int': ('i', 4),
    'int32': ('i', 4),
}


def convert(ply: Path, out: Path) -> None:
    header, body_chunks = read_ply(ply)
    count, props = parse_props(header)
    fmt = '<' + ''.join(PLY_TYPES[t][0] for t, _ in props)
    stride = struct.calcsize(fmt)
    body = b''.join(body_chunks)
    if len(body) < count * stride:
        raise RuntimeError(f'truncated body: {len(body)} bytes, expected {count * stride}')

    idx = {name: i for i, (_, name) in enumerate(props)}
    SH_C0 = 0.28209479177387814

    with out.open('wb') as f:
        for i in range(count):
            v = struct.unpack_from(fmt, body, i * stride)
            x, y, z = v[idx['x']], v[idx['y']], v[idx['z']]
            sx = math.exp(v[idx.get('scale_0', 0)]) if 'scale_0' in idx else 0.01
            sy = math.exp(v[idx.get('scale_1', 0)]) if 'scale_1' in idx else 0.01
            sz = math.exp(v[idx.get('scale_2', 0)]) if 'scale_2' in idx else 0.01
            r = max(0, min(255, int((0.5 + SH_C0 * v[idx['f_dc_0']]) * 255))) if 'f_dc_0' in idx else 200
            g = max(0, min(255, int((0.5 + SH_C0 * v[idx['f_dc_1']]) * 255))) if 'f_dc_1' in idx else 200
            b = max(0, min(255, int((0.5 + SH_C0 * v[idx['f_dc_2']]) * 255))) if 'f_dc_2' in idx else 200
            a = max(0, min(255, int(sigmoid(v[idx['opacity']]) * 255))) if 'opacity' in idx else 255
            rw = v[idx['rot_0']] if 'rot_0' in idx else 1.0
            rx = v[idx['rot_1']] if 'rot_1' in idx else 0.0
            ry = v[idx['rot_2']] if 'rot_2' in idx else 0.0
            rz = v[idx['rot_3']] if 'rot_3' in idx else 0.0
            mag = math.sqrt(rw * rw + rx * rx + ry * ry + rz * rz) or 1.0
            rw, rx, ry, rz = rw / mag, rx / mag, ry / mag, rz / mag

            def pack(q: float) -> int:
                return max(0, min(255, int((q + 1) * 0.5 * 255)))

            f.write(struct.pack('<3f3f4B4B', x, y, z, sx, sy, sz, r, g, b, a,
                                pack(rw), pack(rx), pack(ry), pack(rz)))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('ply', type=Path)
    parser.add_argument('splat', type=Path)
    args = parser.parse_args()
    convert(args.ply, args.splat)
    print(f'wrote {args.splat}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
