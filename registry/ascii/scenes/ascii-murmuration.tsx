'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createMurmuration, type MurmurationOptions } from './murmuration';

/** A murmuration of starlings that folds across the sky and flees the pointer. */
export function AsciiMurmuration(props: SceneProps<MurmurationOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createMurmuration)} />;
}
