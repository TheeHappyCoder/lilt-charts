'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createKoi, type KoiOptions } from './koi';

/** A koi pond from above: patterned koi under lily pads, rippling water, food on click. */
export function AsciiKoi(props: SceneProps<KoiOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createKoi)} />;
}
