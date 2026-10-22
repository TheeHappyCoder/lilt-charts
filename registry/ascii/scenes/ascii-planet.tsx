'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createPlanet, type PlanetOptions } from './planet';

/** A lit planet turning in space, with a ring and stars. The light follows the pointer. */
export function AsciiPlanet(props: SceneProps<PlanetOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createPlanet)} />;
}
