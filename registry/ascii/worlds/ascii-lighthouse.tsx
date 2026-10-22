'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createLighthouse, type LighthouseOptions } from './lighthouse';

/** A lighthouse sweeping its beam over a misty sea, aimed by the pointer. */
export function AsciiLighthouse(props: SceneProps<LighthouseOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createLighthouse)} />;
}
