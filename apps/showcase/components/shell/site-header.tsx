'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import Menu01Icon from '@hugeicons/core-free-icons/Menu01Icon';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GitHubStars } from '@/components/github-stars';
import type { GitHubStars as Stars } from '@/lib/github-stars';
import { HeaderSearch } from './docs-search';
import { LiltLogo } from './logo';
import { familyGroups, groupsByTab, tabHref, tabs, type Tab, type TileGroup } from './nav-model';
import { pageScroller } from './page-scroll';
import { StyleMenuTrigger } from './style-menu';
import { ThemeSegmented } from './theme-switcher';

const SPRING = { type: 'spring', stiffness: 520, damping: 42 } as const;

const countOf = (groups: readonly TileGroup[]) =>
  groups.reduce((sum, group) => sum + group.routes.length, 0);

/** How many chart families, components and scenes there are, beside each line like a shelf's label. */
const COUNTS: Record<Tab, number> = {
  charts: countOf(familyGroups),
  components: countOf(groupsByTab.components),
  ascii: countOf(groupsByTab.ascii),
};

/**
 * One bar across the top of every page: the wordmark and the product lines on the left;
 * search, the chart style (on chart pages only), the theme, GitHub and the way in on the right.
 * It is clear over the page until the page scrolls under it.
 */
export function SiteHeader({
  tab,
  stars = null,
  onMenu,
}: {
  /** The place the current page lives under; none on the home page. */
  tab?: Tab;
  stars?: Stars | null;
  /** Opens the navigation drawer on phones; the drawer has no button without it. */
  onMenu?: () => void;
}) {
  const reduced = Boolean(useReducedMotion());
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const scroller = pageScroller();
    if (!scroller) return;
    const onScroll = () => setScrolled(scroller.scrollTop > 4);
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="lilt-header" data-scrolled={scrolled || undefined}>
      <div className="lilt-header__inner">
        {onMenu ? (
          <button
            type="button"
            className="lilt-header__icon lilt-header__menu"
            aria-label="Open navigation"
            onClick={onMenu}
          >
            <Icon icon={Menu01Icon} size={18} strokeWidth={1.7} aria-hidden="true" />
          </button>
        ) : null}
        <Link href="/" className="lilt-header__brand" aria-label="Lilt UI home">
          <LiltLogo className="lilt-header__logo" />
        </Link>
        <nav className="lilt-header__nav" aria-label="Sections">
          {tabs.map((option) => {
            const current = option.value === tab;
            return (
              <Link
                key={option.value}
                href={tabHref[option.value]}
                className="lilt-header__link"
                aria-current={current ? 'page' : undefined}
              >
                {current ? (
                  <motion.span
                    aria-hidden="true"
                    className="lilt-header__link-fill"
                    layoutId="lilt-header-link"
                    transition={reduced ? { duration: 0 } : SPRING}
                  />
                ) : null}
                <span className="lilt-header__link-text">{option.label}</span>
                <span className="lilt-header__count">{COUNTS[option.value]}</span>
              </Link>
            );
          })}
        </nav>

        <div className="lilt-header__actions">
          <HeaderSearch className="lilt-header__search" wide />
          {/* Chart style is the charts' own control; Components, ASCII and home have no use for it. */}
          {tab === 'charts' ? <StyleMenuTrigger /> : null}
          <ThemeSegmented />
          <span className="lilt-header__github">
            {/* A count only says something once it is large; until then the mark stands alone. */}
            <GitHubStars stars={stars && stars.total >= 50 ? stars : null} />
          </span>
          <Link href="/guides/installation" className="lilt-header__cta">
            Get started
            <Icon icon={ArrowRight01Icon} size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
