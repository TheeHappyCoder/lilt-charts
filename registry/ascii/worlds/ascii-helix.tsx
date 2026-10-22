'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createHelix, type HelixOptions } from './helix';

/** A turning double helix that unzips where the pointer hovers. */
export function AsciiHelix(props: SceneProps<HelixOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createHelix)} />;
}
