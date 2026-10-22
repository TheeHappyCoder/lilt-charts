'use client';

import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createGlobe, describeGlobe, type GlobeOptions } from './globe';

/** A turning Earth in type, with places that pulse and arcs that travel between them. */
export function AsciiGlobe(props: SceneProps<GlobeOptions>) {
  const label = props.label ?? describeGlobe(props.points, props.arcs);
  return <AsciiCanvas {...useSceneProps({ ...props, label }, createGlobe)} />;
}
