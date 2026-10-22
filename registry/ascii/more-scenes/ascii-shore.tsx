'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createShore, type ShoreOptions } from './shore';

/** A beach: waves break into foam, run up the sand and leave it wet. The pointer writes in it. */
export function AsciiShore(props: SceneProps<ShoreOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createShore)} />;
}
