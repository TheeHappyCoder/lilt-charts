'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createJellyfish, type JellyfishOptions } from './jellyfish';

/** Jellyfish that pulse to swim and trail swaying tentacles, in drifting marine snow. */
export function AsciiJellyfish(props: SceneProps<JellyfishOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createJellyfish)} />;
}
