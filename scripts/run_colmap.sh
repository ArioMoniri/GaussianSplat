#!/usr/bin/env bash
# Minimal COLMAP recipe: drop a folder of images at $1 and get a
# transforms.json suitable for nerfstudio / instant-NGP.
#
# Requires: colmap, ffmpeg, nerfstudio (for ns-process-data).
set -euo pipefail

IN="${1:?usage: run_colmap.sh <images-or-video-dir>}"
OUT="${2:-${IN}/processed}"

mkdir -p "$OUT"

if compgen -G "${IN}/*.mp4" > /dev/null || compgen -G "${IN}/*.mov" > /dev/null; then
  VIDEO="$(ls "${IN}"/*.mp4 "${IN}"/*.mov 2>/dev/null | head -n1)"
  ns-process-data video --data "$VIDEO" --output-dir "$OUT" --num-frames-target 200
else
  ns-process-data images --data "$IN" --output-dir "$OUT"
fi

echo "transforms.json written to $OUT/transforms.json"
