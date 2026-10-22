'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createGalaxy, type GalaxyOptions } from './galaxy';

/** A spiral galaxy whose arms sweep through turning stars; the pointer tilts it. */
export function AsciiGalaxy(props: SceneProps<GalaxyOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createGalaxy)} />;
}
