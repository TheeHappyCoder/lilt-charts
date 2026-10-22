'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createFlag, type FlagOptions } from './flag';

/** A word printed on a flag that ripples in the wind. */
export function AsciiFlag(props: SceneProps<FlagOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createFlag)} />;
}
