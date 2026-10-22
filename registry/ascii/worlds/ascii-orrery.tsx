'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createOrrery, type OrreryOptions } from './orrery';

/** The solar system as clockwork, every planet on its real period. */
export function AsciiOrrery(props: SceneProps<OrreryOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createOrrery)} />;
}
