'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createRain, type RainOptions } from './rain';

/** Rain on still water, with an umbrella at the pointer and lightning on click. */
export function AsciiRain(props: SceneProps<RainOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createRain)} />;
}
