import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BlurFade } from '@/components/motion/blur-fade';
import { LostMeter } from '@/components/not-found/lost-meter';
import { LiltLogo } from '@/components/shell/logo';

export const metadata: Metadata = { title: 'Page not found' };

/** Any address the site does not have: a short way back, standing on the meter that spells 404. */
export default function NotFound() {
  return (
    <section className="lilt-lost" aria-labelledby="lost-title">
      <Link href="/" className="lilt-lost__brand" aria-label="Lilt Charts home">
        <LiltLogo className="lilt-shell__brand-logo" />
      </Link>
      <div className="lilt-lost__copy">
        <BlurFade>
          <h1 id="lost-title">This page is off the chart.</h1>
        </BlurFade>
        <BlurFade delay={80}>
          <div className="lilt-lost__actions">
            <Link href="/charts" className="lilt-home__button">
              Browse charts
              <Icon icon={ArrowRight02Icon} aria-hidden="true" size={16} strokeWidth={1.8} />
            </Link>
            <Link href="/" className="lilt-home__button" data-variant="quiet">
              Home
            </Link>
          </div>
        </BlurFade>
      </div>
      <LostMeter />
    </section>
  );
}
