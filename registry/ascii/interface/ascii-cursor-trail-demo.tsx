'use client';

import type { SceneProps } from '../react/ascii-canvas';
import { AsciiCursorTrail } from './ascii-cursor-trail';
import type { CursorTrailOptions } from './cursor-trail';

/**
 * The cursor trail filling its parent, with an unseen pointer drawing a slow loop while yours is
 * away. For trying the trail on a stage; on a site, use `AsciiCursorTrail` over the whole page.
 */
export function AsciiCursorTrailDemo(props: SceneProps<CursorTrailOptions>) {
  return <AsciiCursorTrail autopilot {...props} scope="parent" />;
}
