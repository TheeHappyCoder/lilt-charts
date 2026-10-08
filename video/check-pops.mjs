// Scan a render for single-frame pops: a frame whose change from the previous one is at least 3x
// both neighbours' changes. Usage: node check-pops.mjs out/lilt-3d.mp4
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const size = 180;
const { stdout } = spawnSync(
  ffmpeg,
  [
    '-v',
    'error',
    '-i',
    process.argv[2],
    '-vf',
    `scale=${size}:${size}`,
    '-f',
    'rawvideo',
    '-pix_fmt',
    'gray',
    '-',
  ],
  { maxBuffer: 1 << 30 },
);
const area = size * size;
const count = stdout.length / area;
const diff = [];
for (let f = 1; f < count; f += 1) {
  let sum = 0;
  for (let i = 0; i < area; i += 1)
    sum += Math.abs(stdout[f * area + i] - stdout[(f - 1) * area + i]);
  diff.push(sum / area);
}
console.log(
  `${count} frames, mean change ${(diff.reduce((a, b) => a + b, 0) / diff.length).toFixed(2)}`,
);
for (let i = 1; i < diff.length - 1; i += 1) {
  if (diff[i] > 1.5 && diff[i] > 3 * diff[i - 1] && diff[i] > 3 * diff[i + 1])
    console.log(
      `pop at frame ${i + 1} (${((i + 1) / 60).toFixed(2)}s): ${diff[i].toFixed(2)} vs ${diff[i - 1].toFixed(2)}/${diff[i + 1].toFixed(2)}`,
    );
}
