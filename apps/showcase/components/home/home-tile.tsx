'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowUpRight01Icon from '@hugeicons/core-free-icons/ArrowUpRight01Icon';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { TilePalette } from '@/components/gallery/tile-palette';
import { ChartGlyph, hasGlyph } from '@/components/shell/chart-glyph';
import { icons } from '@/components/shell/nav-model';
import { appRoutes, type AppRoute } from '@/lib/routes';

export interface HomeTileProps {
  /** Its cell in the section's bento. */
  area: string;
  name: string;
  hint: string;
  /** Where the tile leads; its mark is that page's mark in the sidebar. */
  href: string;
  /** `night` for type and canvases; `room` is the gallery's lit room, for chart cards. */
  tone?: 'night' | 'room';
  /** The stage stops above the caption, for content with an axis or a floor of its own. */
  floor?: boolean;
  /** Centre the stage's content with room around it, for components that keep their own size. */
  center?: boolean;
  /** Controls in the label, such as choices for the stage. */
  controls?: ReactNode;
  /** The stage has controls of its own, so only the label's arrow links. */
  live?: boolean;
  children: ReactNode;
}

const routes = appRoutes as readonly AppRoute[];

/** The page's mark, as the sidebar draws it: a chart family as itself, anything else its icon. */
function Mark({ href }: { href: string }) {
  const route = routes.find((candidate) => candidate.href === href);
  if (!route) return null;
  return (
    <TilePalette className="lilt-tile__glyph">
      {hasGlyph(route.icon) ? (
        <ChartGlyph icon={route.icon} />
      ) : (
        <Icon icon={icons[route.icon]} size={15} strokeWidth={1.7} aria-hidden="true" />
      )}
    </TilePalette>
  );
}

/**
 * The home page's one unit, in the chart gallery's language: a room lit by the palette, the live
 * piece on its stage, and a caption with the page's mark, its name, what to try, and an arrow
 * that arrives on hover. Every section is a bento of these.
 */
export function HomeTile({
  area,
  name,
  hint,
  href,
  tone = 'night',
  center = false,
  floor = false,
  controls,
  live = false,
  children,
}: HomeTileProps) {
  const whole = !controls && !live;
  const arrow = <Icon icon={ArrowUpRight01Icon} size={15} strokeWidth={1.8} aria-hidden="true" />;
  const body = (
    <>
      <TilePalette className="lilt-tile__light" />
      {tone === 'room' ? <span className="lilt-tile__grid" aria-hidden="true" /> : null}
      <div className="lilt-home-tile__stage" data-center={center || undefined}>
        {children}
      </div>
      <span className="lilt-home-tile__label">
        <Mark href={href} />
        <span className="lilt-home-tile__text">
          <strong>{name}</strong>
          <small>{hint}</small>
        </span>
        {controls}
        {whole ? (
          <span className="lilt-tile__go">{arrow}</span>
        ) : (
          <Link href={href} className="lilt-tile__go" aria-label={`Open ${name}`}>
            {arrow}
          </Link>
        )}
      </span>
    </>
  );
  const shared = {
    className: tone === 'night' ? 'lilt-home-tile dark' : 'lilt-home-tile',
    style: { gridArea: area },
    'data-tone': tone,
    'data-area': area,
    'data-floor': floor || undefined,
  };
  return whole ? (
    <Link href={href} {...shared}>
      {body}
    </Link>
  ) : (
    <div {...shared}>{body}</div>
  );
}
