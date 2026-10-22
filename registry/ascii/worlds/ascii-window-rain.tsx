'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createWindowRain, type WindowRainOptions } from './window-rain';

/** Rain running down a window at night, with the city out of focus behind it. */
export function AsciiWindowRain(props: SceneProps<WindowRainOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createWindowRain)} />;
}
