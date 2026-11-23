'use client';

import { AsciiDotGrid } from '@lilt-ui/registry';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { TwoTone } from '@/components/craft/label';
import { ArrowSwap, Roll } from '@/components/craft/roll';
import { LiltLogo } from '@/components/shell/logo';

export interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

/**
 * The page's closing panel, its second dark object: an interactive dot grid breathing behind the
 * closing headline, the two ways in, the quickstart, the links in short columns under a hairline,
 * and the wordmark rising from the foot.
 */
export function HomeFooter({
  github,
  columns,
  children,
}: {
  github: string;
  columns: FooterColumn[];
  /** The quickstart, under the ways in. */
  children?: ReactNode;
}) {
  return (
    <footer className="lilt-home-foot">
      <div className="lilt-home-foot__panel lilt-dusk dark">
        <div className="lilt-home-foot__ground" aria-hidden="true">
          <AsciiDotGrid color="#8b6cff" />
        </div>
        <div className="lilt-home-foot__close">
          <TwoTone
            id="closing-title"
            claim="Ready when your data is."
            dim="Start with one install."
          />
          <p data-rv="fade" style={{ '--i': 2 } as CSSProperties}>
            Install a package, import the stylesheet once, and drop in a card or a scene.
          </p>
          <div
            className="lilt-home-foot__actions"
            data-rv="fade"
            style={{ '--i': 3 } as CSSProperties}
          >
            <Link href="/guides/installation" className="lilt-btn" data-tone="light" data-size="lg">
              <Roll>Read the guide</Roll>
            </Link>
            <a
              href={github}
              className="lilt-btn"
              data-tone="glass"
              data-size="lg"
              target="_blank"
              rel="noreferrer"
            >
              <Roll>View on GitHub</Roll>
              <ArrowSwap />
            </a>
          </div>
          {children ? (
            <div
              className="lilt-home-foot__install"
              data-rv="fade"
              style={{ '--i': 4 } as CSSProperties}
            >
              {children}
            </div>
          ) : null}
        </div>

        <div className="lilt-home-foot__bottom">
          <div className="lilt-home-foot__links" data-rv="kids">
            {columns.map((column) => (
              <nav key={column.heading} className="lilt-home-foot__col" aria-label={column.heading}>
                <span className="lilt-home-foot__label">{column.heading}</span>
                {column.links.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Roll>{link.label}</Roll>
                  </Link>
                ))}
              </nav>
            ))}
          </div>
          <div className="lilt-home-foot__base">
            <span className="lilt-home-foot__me">
              <LiltLogo className="lilt-home-foot__logo" />
              React components with a little lilt.
            </span>
            <span>Charts from npm. Components and scenes as source you own.</span>
            <span className="lilt-home-foot__elsewhere">
              <a href={github}>
                <Roll>GitHub</Roll>
                <ArrowSwap />
              </a>
              <a href="https://www.npmjs.com/package/@lilt-ui/charts">
                <Roll>npm</Roll>
                <ArrowSwap />
              </a>
            </span>
          </div>
        </div>
        <div className="lilt-home-foot__name" aria-hidden="true">
          <LiltLogo />
        </div>
      </div>
    </footer>
  );
}
