'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createLava, type LavaOptions } from './lava';

/** A lava lamp: blobs of lit wax that rise warm, sink cool, merge and part. */
export function AsciiLava(props: SceneProps<LavaOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createLava)} />;
}
