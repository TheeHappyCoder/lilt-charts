import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { TwoTone } from '@/components/craft/label';
import { ArrowSwap, Roll } from '@/components/craft/roll';
import { LostMeter } from '@/components/not-found/lost-meter';
import { LiltLogo } from '@/components/shell/logo';

export const metadata: Metadata = { title: 'Page not found' };

/** Any address the site does not have: a short way back, standing on the meter that spells 404. */
export default function NotFound() {
  return (
    <section className="lilt-lost" aria-labelledby="lost-title">
      <Link href="/" className="lilt-lost__brand" aria-label="Lilt UI home">
        <LiltLogo className="lilt-shell__brand-logo" />
      </Link>
      <div className="lilt-lost__copy">
        <TwoTone as="h1" id="lost-title" claim="This page is" dim="off the chart." />
        <div className="lilt-lost__actions" data-rv="fade" style={{ '--i': 3 } as CSSProperties}>
          <Link href="/charts" className="lilt-btn" data-tone="ink" data-size="lg">
            <Roll>Browse charts</Roll>
            <ArrowSwap direction="right" />
          </Link>
          <Link href="/" className="lilt-btn" data-size="lg">
            <Roll>Home</Roll>
          </Link>
        </div>
      </div>
      <LostMeter />
    </section>
  );
}
