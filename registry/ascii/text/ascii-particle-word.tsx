'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createParticleWord, type ParticleWordOptions } from './particle-word';

/** A word made of glyphs that scatter from the pointer and spring back home. */
export function AsciiParticleWord(props: SceneProps<ParticleWordOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createParticleWord)} />;
}
