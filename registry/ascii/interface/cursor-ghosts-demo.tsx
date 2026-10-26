'use client';

import { AsciiLogo } from '../text/ascii-logo';
import { FIRE_GROUND } from '../text/logo';
import { CursorGhosts, type CursorGhostsProps } from './cursor-ghosts';
import { CursorWarmth } from './cursor-warmth';

const FIRES = [0.25, 0.75];

/**
 * A snowy sky with two campfires, the reader's own pointer feeling the cold, and the ghosts: the
 * home page's hero in miniature.
 */
export function CursorGhostsDemo(props: CursorGhostsProps) {
  return (
    <div
      className="lilt-cursor-ghosts-demo"
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <AsciiLogo
        text="cold"
        snow={1}
        cellSize={12}
        clearBelow={0.35}
        colors={['#a9d8ff', '#7c5cff']}
        fires={FIRES}
        label="The word cold under falling snow, with two campfires burning below"
      />
      {FIRES.map((x) => (
        <span
          key={x}
          data-lilt-fire=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${x * 100}%`,
            bottom: `${(1 - FIRE_GROUND) * 100}%`,
            width: '12%',
            height: '22%',
            translate: '-50% 0',
            pointerEvents: 'none',
          }}
        />
      ))}
      <CursorGhosts {...props} />
      <CursorWarmth scope=".lilt-cursor-ghosts-demo" />
    </div>
  );
}
