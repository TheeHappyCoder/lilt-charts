'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createAurora, type AuroraOptions } from './aurora';

/** The northern lights over mountains, mirrored in a lake. The pointer bends the curtain. */
export function AsciiAurora(props: SceneProps<AuroraOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createAurora)} />;
}
