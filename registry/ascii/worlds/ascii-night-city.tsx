'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createNightCity, type NightCityOptions } from './night-city';

/** A city at night: windows that come on one by one, blinking masts, traffic and a moon. */
export function AsciiNightCity(props: SceneProps<NightCityOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createNightCity)} />;
}
