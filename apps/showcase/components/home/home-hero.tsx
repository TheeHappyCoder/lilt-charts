'use client';

import { AsciiLogo, CursorGhosts, CursorWarmth, FIRE_GROUND } from '@lilt-ui/registry';
import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { TwoTone } from '@/components/craft/label';
import { ArrowSwap, Roll } from '@/components/craft/roll';

/**
 * The share of the sky kept clear under the wordmark. The headline's place in home.css is worked
 * out from the same number, so change both together.
 */
const CLEAR_BELOW = 0.3;

/** Two campfires on the ground, in the lower corners of the sky, clear of the headline. */
const FIRES = [0.2, 0.8];

/**
 * The hero, the page's one dark object: the wordmark lettered in solid type under falling snow,
 * which settles on the letters and melts where the pointer passes. A quick pass knocks letters
 * loose; a click sends a shockwave through them. The headline and the way in sit over the word's
 * foot. A few ghost cursors keep the reader company, hurrying to the fires when they get cold.
 */
export function HomeHero() {
  // Phones get finer cells, so the letters keep their bevels at a quarter of the width.
  const [cellSize, setCellSize] = useState(14);
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 639px)');
    const update = () => setCellSize(narrow.matches ? 8 : 14);
    update();
    narrow.addEventListener('change', update);
    return () => narrow.removeEventListener('change', update);
  }, []);
  return (
    <section className="lilt-home-hero lilt-dusk dark" aria-labelledby="lilt-home-title">
      <div className="lilt-home-hero__stage">
        <AsciiLogo
          text="lilt UI"
          snow={1}
          cellSize={cellSize}
          clearBelow={CLEAR_BELOW}
          colors={['#7c5cff', '#b45cf0', '#e5489c']}
          fires={FIRES}
          label="Lilt UI, lettered in solid type as snow falls and settles on the letters, with two campfires burning below"
        />
      </div>
      {/* Where the fires burn, for the pointer to warm at; the scene draws them. */}
      {FIRES.map((x) => (
        <span
          key={x}
          data-lilt-fire=""
          aria-hidden="true"
          className="lilt-home-hero__fire"
          style={{ left: `${x * 100}%`, bottom: `${(1 - FIRE_GROUND) * 100}%` }}
        />
      ))}
      {/* Imagined company, kept off the headline; phones get fewer, the sky being smaller. */}
      <CursorGhosts
        count={cellSize === 8 ? 2 : 3}
        avoid=".lilt-home-hero h1, .lilt-home-hero__ctas"
      />
      <CursorWarmth scope=".lilt-home-hero" />
      <div className="lilt-home-hero__copy">
        <TwoTone
          as="h1"
          id="lilt-home-title"
          claim="React components"
          dim="with a little lilt."
          delay={5}
        />
        <div className="lilt-home-hero__ctas" data-rv="fade" style={{ '--i': 9 } as CSSProperties}>
          <Link href="/guides/installation" className="lilt-btn" data-tone="light" data-size="lg">
            <Roll>Get started</Roll>
            <ArrowSwap direction="right" />
          </Link>
        </div>
      </div>
      <p className="lilt-home-hero__hint" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 2.5v8.2l2.3-2 1.5 3.3 1.6-.7-1.5-3.2h3.1L3 2.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
        Move through the letters <span>·</span> warm up by the fire
      </p>
    </section>
  );
}
