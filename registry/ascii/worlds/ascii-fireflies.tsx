'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createFireflies, type FirefliesOptions } from './fireflies';

/** Fireflies over a field at dusk that fall into step and flash together. */
export function AsciiFireflies(props: SceneProps<FirefliesOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createFireflies)} />;
}
