'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createEmber, type EmberOptions } from './ember';

/** A campfire with licking flames and drifting sparks. The flames lean from the pointer. */
export function AsciiEmber(props: SceneProps<EmberOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createEmber)} />;
}
