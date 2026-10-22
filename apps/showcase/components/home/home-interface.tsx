'use client';

import {
  AsciiCounterDemo,
  AsciiCursorTrailDemo,
  AsciiFrame,
  AsciiGlitch,
  AsciiLoader,
  AsciiScramble,
  AsciiTerminal,
  AsciiTransitionDemo,
} from '@lilt-ui/registry';
import { useEffect, useState } from 'react';
import { HomeTile } from './home-tile';

const SESSION = [
  '$ pnpm add @lilt-ui/charts',
  'Packages: +1',
  '+ @lilt-ui/charts',
  '',
  '$ pnpm dlx shadcn@latest add https://liltui.vercel.app/r/loader.json',
  '✔ Created 6 files: components/lilt/ascii/interface/ascii-loader.tsx …',
  '',
  '$ pnpm dev',
  '✓ Ready in 812ms on http://localhost:3000',
];

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
        area="terminal"
        href="/components/terminal"
        name="Terminal"
        hint="Types itself"
        center
      >
        <AsciiTerminal lines={SESSION} title="~/my-app" accent="#a58bff" loop />
      </HomeTile>
      <HomeTile
        area="transition"
        href="/components/transition"
        name="Transition"
        hint="Click the card, or follow any link"
        center
        live
      >
        <AsciiTransitionDemo />
      </HomeTile>
      <HomeTile
        area="loader"
        href="/components/loader"
        name="Loader"
        hint="Four ways to wait"
        center
      >
        <span className="lilt-tile__stack">
          <AsciiLoader variant="bar" value={progress} width={14} label="Building" />
          <AsciiLoader variant="spinner" label="Thinking" />
          <AsciiLoader variant="dots" label="Syncing" />
          <AsciiLoader variant="scramble" label="Decrypting" />
        </span>
      </HomeTile>
      <HomeTile area="glitch" href="/components/glitch" name="Glitch" hint="Hover it" center>
        <AsciiGlitch text="404" intensity={0.6} className="lilt-tile__huge" />
      </HomeTile>
      <HomeTile
        area="trail"
        href="/components/cursor-trail"
        name="Cursor trail"
        hint="Move through it"
      >
        <AsciiCursorTrailDemo />
      </HomeTile>
      <HomeTile
        area="scramble"
        href="/components/scramble"
        name="Scramble"
        hint="Hover to decode"
        center
      >
        <AsciiScramble text="Lilt UI" trigger="hover" className="lilt-tile__big" />
      </HomeTile>
      <HomeTile
        area="counter"
        href="/components/counter"
        name="Counter & frame"
        hint="Click to add readers"
        center
        live
      >
        <AsciiFrame variant="round" trace="always" color="#e5489c" padding={18}>
          <AsciiCounterDemo />
        </AsciiFrame>
      </HomeTile>
    </div>
  );
}
