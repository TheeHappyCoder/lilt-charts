'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createSnow, type SnowOptions } from './snow';

/** Snow falling on a word: it caps the letters, drifts on the ground, and melts at the pointer. */
export function AsciiSnow(props: SceneProps<SnowOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createSnow)} />;
}
