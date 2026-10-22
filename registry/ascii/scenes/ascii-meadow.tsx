'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createMeadow, type MeadowOptions } from './meadow';

/** A meadow at dusk: grass in gusts that parts for the pointer, flowers and fireflies. */
export function AsciiMeadow(props: SceneProps<MeadowOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createMeadow)} />;
}
