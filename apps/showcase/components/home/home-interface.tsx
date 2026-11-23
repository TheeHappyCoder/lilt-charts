'use client';

import {
  AsciiCounterDemo,
  AsciiCursorTrailDemo,
  AsciiGlitch,
  AsciiLoader,
  AsciiParticleWord,
  AsciiSplitFlapDemo,
  AsciiTransitionDemo,
} from '@lilt-ui/registry';
import { useEffect, useState } from 'react';
import { HomeTile } from './home-tile';

/** A progress value that fills, holds, and starts again, so the bar always has work to show. */
function useProgress() {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setValue((v) => (v >= 1.15 ? 0 : v + 0.05)), 140);
    return () => window.clearInterval(id);
  }, []);
  return Math.min(1, value);
}

/** The interface pieces, a tile each: every one live, every one a doorway to its page. */
export function HomeInterface() {
  const progress = useProgress();
  return (
    <div className="lilt-bento" data-layout="interface">
      <HomeTile
        area="splitflap"
        href="/ascii/split-flap"
        name="Split-flap board"
        hint="Departures in type"
        center
      >
        <div style={{ fontSize: 30 }}>
          <AsciiSplitFlapDemo />
        </div>
      </HomeTile>
      <HomeTile
        area="transition"
        href="/ascii/transition"
        name="Transition"
        hint="Click the card to change it"
        center
        live
      >
        <AsciiTransitionDemo />
      </HomeTile>
      <HomeTile area="loader" href="/ascii/loader" name="Loader" hint="Four ways to wait" center>
        <span className="lilt-tile__stack">
          <AsciiLoader variant="bar" value={progress} width={14} label="Building" />
          <AsciiLoader variant="spinner" label="Thinking" />
          <AsciiLoader variant="dots" label="Syncing" />
          <AsciiLoader variant="scramble" label="Decrypting" />
        </span>
      </HomeTile>
      <HomeTile area="glitch" href="/ascii/glitch" name="Glitch" hint="Hover it" center>
        <AsciiGlitch text="404" intensity={0.6} className="lilt-tile__huge" />
      </HomeTile>
      <HomeTile area="trail" href="/ascii/cursor-trail" name="Cursor trail" hint="Move through it">
        <AsciiCursorTrailDemo />
      </HomeTile>
      <HomeTile
        area="particle"
        href="/ascii/particle-word"
        name="Particle word"
        hint="Drag through the letters"
      >
        <AsciiParticleWord text="lilt" cellSize={10} />
      </HomeTile>
      <HomeTile
        area="counter"
        href="/ascii/counter"
        name="Counter"
        hint="Click to add readers"
        center
        live
      >
        <AsciiCounterDemo />
      </HomeTile>
    </div>
  );
}
