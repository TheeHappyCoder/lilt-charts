'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createWormhole, type WormholeOptions } from './wormhole';

/** A tunnel of type you fly through forever, steered by the pointer, with warp on click. */
export function AsciiWormhole(props: SceneProps<WormholeOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createWormhole)} />;
}
