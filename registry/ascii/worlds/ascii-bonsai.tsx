'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createBonsai, type BonsaiOptions } from './bonsai';

/** A bonsai that grows branch by branch, sways in the breeze and drops the odd leaf. */
export function AsciiBonsai(props: SceneProps<BonsaiOptions>) {
  return <AsciiCanvas {...useSceneProps(props, createBonsai)} />;
}
