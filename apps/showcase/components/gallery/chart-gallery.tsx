import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowSwap } from '@/components/craft/roll';
import { ChartGlyph } from '@/components/shell/chart-glyph';
import { chartDocs } from '@/lib/card-docs/registry';
import { featureCards } from '@/lib/home-showcase';
import { appRoutes, type AppRoute } from '@/lib/routes';
import { FittedPreview } from './fitted-preview';
import { TilePalette } from './tile-palette';

/** A family's default card, kept compact for a tile: no summary tiles, a shorter plot. */
const tileExample = (href: string) => {
  const doc = chartDocs[href];
  return doc ? featureCards(doc.hero, { height: 220 })[0]! : null;
};

/**
 * One tile: a plinth holding the live chart card, and beneath it the family's glyph, name and job.
 * Hover lifts the card cleanly.
 */
export function GalleryTile({
  href,
  eager = false,
  wide = false,
  index = 0,
}: {
  href: string;
  eager?: boolean;
  /** A tile spanning two columns lays its card out wider. */
  wide?: boolean;
  /** Its place in the row, so tiles arrive in order. */
  index?: number;
}) {
  const doc = chartDocs[href];
  const example = tileExample(href);
  const route = (appRoutes as readonly AppRoute[]).find((candidate) => candidate.href === href);
  if (!doc || !example || !route) return null;
  return (
    <Link
      href={href}
      className="lilt-plinth lilt-tile"
      data-wide={wide || undefined}
      data-rv="media"
      style={{ '--i': index % 4 } as CSSProperties}
    >
      <span className="lilt-media lilt-tile__stage">
        <FittedPreview example={example} eager={eager} width={wide ? 640 : 460} fit="peek" />
      </span>
      <span className="lilt-cap">
        <span className="lilt-cap__top">
          <span className="lilt-cap__title">
            <TilePalette className="lilt-tile__glyph">
              <ChartGlyph icon={route.icon} />
            </TilePalette>
            <strong>{doc.title}</strong>
            {route.badge ? (
              <span className="lilt-chip" data-tone="wall">
                {route.badge}
              </span>
            ) : null}
          </span>
          <span className="lilt-cap__end">
            <ArrowSwap />
          </span>
        </span>
        <span className="lilt-cap__desc">{doc.lede}</span>
      </span>
    </Link>
  );
}
