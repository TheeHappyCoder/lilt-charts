'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createFireworks, type FireworksOptions } from './fireworks';

/** Fireworks over a city at night: peonies, rings and willows that fall, fade and smoke. */
export function AsciiFireworks(props: SceneProps<FireworksOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createFireworks)} />;
}
