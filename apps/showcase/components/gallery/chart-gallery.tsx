import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowUpRight01Icon from '@hugeicons/core-free-icons/ArrowUpRight01Icon';
import Link from 'next/link';
import { ChartGlyph } from '@/components/shell/chart-glyph';
import { familyGroups } from '@/components/shell/nav-model';
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
 * One tile: a lit room with the chart rising from its floor, live, and beneath it the family's
 * glyph, name and job. Hover lifts the card and brightens the room.
 */
export function GalleryTile({
  href,
  eager = false,
  wide = false,
}: {
  href: string;
  eager?: boolean;
  /** A tile spanning two columns lays its card out wider. */
  wide?: boolean;
}) {
  const doc = chartDocs[href];
  const example = tileExample(href);
  const route = (appRoutes as readonly AppRoute[]).find((candidate) => candidate.href === href);
  if (!doc || !example || !route) return null;
  return (
    <Link href={href} className="lilt-tile" data-wide={wide || undefined}>
      <span className="lilt-tile__stage">
        <TilePalette className="lilt-tile__light" />
        <span className="lilt-tile__grid" aria-hidden="true" />
        <FittedPreview example={example} eager={eager} width={wide ? 640 : 460} fit="peek" />
        {route.badge ? <span className="lilt-tile__badge">{route.badge}</span> : null}
      </span>
      <span className="lilt-tile__caption">
        <TilePalette className="lilt-tile__glyph">
          <ChartGlyph icon={route.icon} />
        </TilePalette>
        <span className="lilt-tile__text">
          <span className="lilt-tile__name">{doc.title}</span>
          <span className="lilt-tile__lede">{doc.lede}</span>
        </span>
        <span className="lilt-tile__go" aria-hidden="true">
          <Icon icon={ArrowUpRight01Icon} size={15} strokeWidth={1.8} />
        </span>
      </span>
    </Link>
  );
}

/** Every chart family by the job it does, each as a live tile. */
export function ChartGallery() {
  let index = 0;
  return (
    <div className="lilt-gallery">
      {familyGroups.map((group) => (
        <section
          key={group.key}
          className="lilt-gallery__group"
          id={group.key}
          aria-labelledby={`${group.key}-title`}
        >
          <h2
            id={`${group.key}-title`}
            className="lilt-gallery__heading"
            data-toc-label={group.heading}
          >
            {group.heading}
            <span>{group.routes.length}</span>
          </h2>
          <div className="lilt-gallery__grid">
            {group.routes.map((route) => (
              <GalleryTile key={route.id} href={route.href} eager={index++ < 6} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
