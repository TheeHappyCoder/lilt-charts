'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createBlackHole, type BlackHoleOptions } from './black-hole';

/** A black hole whose gravity bends the starlight behind it, with a glowing disc that tips toward the pointer. */
export function AsciiBlackHole(props: SceneProps<BlackHoleOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createBlackHole)} />;
}
