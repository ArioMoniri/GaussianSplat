import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { PoseSet } from '../types';

export function TrajectoryPreview({ poses }: { poses: PoseSet }) {
  const pts = poses.poses.map((p) => [p.transform[3], p.transform[11]]);
  if (pts.length === 0) return <View style={styles.empty} />;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = 320;
  const h = 200;
  const pad = 18;
  const rx = maxX - minX || 1;
  const ry = maxY - minY || 1;
  const mapped = pts.map(([x, y]) => [
    pad + ((x - minX) / rx) * (w - pad * 2),
    pad + ((y - minY) / ry) * (h - pad * 2),
  ]);
  const d = mapped
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

  return (
    <View style={styles.wrap}>
      <Svg width={w} height={h}>
        <Path d={d} stroke="#5b8def" strokeWidth={2} fill="none" />
        {mapped.map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={2.5} fill={i === 0 ? '#ef6b6b' : '#9bb5ff'} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#0f0f15',
    borderRadius: 10,
    padding: 8,
    alignSelf: 'flex-start',
  },
  empty: { height: 200 },
});
