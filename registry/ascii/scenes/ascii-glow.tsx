'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createGlow, type GlowOptions } from './glow';

/** Soft gradient light drawn in type, which the pointer stirs into code. */
export function AsciiGlow(props: SceneProps<GlowOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createGlow)} />;
}
