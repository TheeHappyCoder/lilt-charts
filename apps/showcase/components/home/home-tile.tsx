'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowSwap } from '@/components/craft/roll';
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
  /** The stage stops above its floor, for content with an axis or a floor of its own. */
  floor?: boolean;
  /** Centre the stage's content with room around it, for components that keep their own size. */
  center?: boolean;
  /** Controls in the caption, such as choices for the stage. */
  controls?: ReactNode;
  /** The stage has controls of its own, so only the caption's arrow links. */
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
        <Icon icon={icons[route.icon]} size={13} strokeWidth={1.7} aria-hidden="true" />
      )}
    </TilePalette>
  );
}

/**
 * The home page's one unit, in the portfolio's language: a warm plinth that mounts the live piece
 * like a picture (a night room for type and canvases, the gallery's lit room for chart cards), and
 * a caption beneath it with the page's mark, its name, what to try, and an arrow.
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
  const body = (
    <>
      <span
        className={
          tone === 'night'
            ? 'lilt-media lilt-home-tile__media dark'
            : 'lilt-media lilt-home-tile__media'
        }
      >
        <TilePalette className="lilt-tile__light" />
        {tone === 'room' ? <span className="lilt-tile__grid" aria-hidden="true" /> : null}
        <span className="lilt-home-tile__stage" data-center={center || undefined}>
          {children}
        </span>
      </span>
      <span className="lilt-cap lilt-home-tile__cap">
        <span className="lilt-cap__top">
          <span className="lilt-cap__title">
            <Mark href={href} />
            <strong>{name}</strong>
          </span>
          {controls}
          {whole ? (
            <span className="lilt-cap__end">
              <ArrowSwap />
            </span>
          ) : (
            <Link
              href={href}
              className="lilt-cap__end lilt-home-tile__go"
              aria-label={`Open ${name}`}
            >
              <ArrowSwap />
            </Link>
          )}
        </span>
        <span className="lilt-cap__desc">{hint}</span>
      </span>
    </>
  );
  const shared = {
    className: 'lilt-plinth lilt-home-tile',
    // Tiles arrive in order; home.css steps each one's delay by its place in the bento.
    style: { gridArea: area } as CSSProperties,
    'data-tone': tone,
    'data-area': area,
    'data-floor': floor || undefined,
    'data-hover': whole ? undefined : '',
    'data-rv': 'media',
  };
  return whole ? (
    <Link href={href} {...shared}>
      {body}
    </Link>
  ) : (
    <div {...shared}>{body}</div>
  );
}
