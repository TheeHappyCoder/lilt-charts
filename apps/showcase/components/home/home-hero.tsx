'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import { AsciiLogo, CursorWarmth, FIRE_GROUND } from '@lilt-ui/registry';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BlurFade } from '@/components/motion/blur-fade';

/**
 * The share of the sky kept clear under the wordmark. The headline's place in home.css is worked
 * out from the same number, so change both together.
 */
const CLEAR_BELOW = 0.3;

/** Two campfires on the ground, in the lower corners of the sky, clear of the headline. */
const FIRES = [0.2, 0.8];

/**
 * The hero: the wordmark lettered in solid type under falling snow, which settles on the letters
 * and melts where the pointer passes. A quick pass knocks letters loose; a click sends a shockwave
 * through them. The headline and the ways in sit in the clear space beneath.
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
    <section className="lilt-home-hero dark" aria-labelledby="lilt-home-title">
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
      <CursorWarmth scope=".lilt-home-hero" />
      <div className="lilt-home-hero__copy">
        <BlurFade delay={600}>
          <h1 id="lilt-home-title">
            React components with a little <em>lilt.</em>
          </h1>
        </BlurFade>
        <BlurFade delay={760}>
          <div className="lilt-home-hero__ctas">
            <Link href="/guides/installation" className="lilt-home-button">
              Get started
              <Icon icon={ArrowRight01Icon} size={15} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </BlurFade>
      </div>
      <p className="lilt-home-hero__hint" aria-hidden="true">
        <span>move</span> through the letters <span>·</span> warm up by the <span>fire</span>
      </p>
    </section>
  );
}
