'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createSmoke, type SmokeOptions } from './smoke';

/** Smoke that moves like smoke: a real fluid you stir with the pointer. */
export function AsciiSmoke(props: SceneProps<SmokeOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createSmoke)} />;
}
