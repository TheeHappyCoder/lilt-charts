'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createSea, type SeaOptions } from './sea';

/** A moonlit sea in perspective, with a glittering path; the moon follows the pointer. */
export function AsciiSea(props: SceneProps<SeaOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createSea)} />;
}
