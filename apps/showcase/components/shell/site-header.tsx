'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Menu01Icon from '@hugeicons/core-free-icons/Menu01Icon';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Count } from '@/components/craft/label';
import { NavPill } from '@/components/craft/nav-pill';
import { ArrowSwap, Roll } from '@/components/craft/roll';
import { GitHubStars } from '@/components/github-stars';
import type { GitHubStars as Stars } from '@/lib/github-stars';
import { HeaderSearch } from './docs-search';
import { LiltLogo } from './logo';
import { familyGroups, groupsByTab, tabHref, tabs, type Tab, type TileGroup } from './nav-model';
import { pageScroller } from './page-scroll';
import { StyleMenuTrigger } from './style-menu';
import { ThemeSegmented } from './theme-switcher';

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
        <NavPill className="lilt-header__nav" label="Sections">
          {tabs.map((option) => (
            <Link
              key={option.value}
              href={tabHref[option.value]}
              aria-current={option.value === tab ? 'page' : undefined}
            >
              {option.label}
              <Count n={COUNTS[option.value]} />
            </Link>
          ))}
        </NavPill>

        <div className="lilt-header__actions">
          <HeaderSearch className="lilt-header__search" wide />
          {/* Chart style is the charts' own control; Components, ASCII and home have no use for it. */}
          {tab === 'charts' ? <StyleMenuTrigger /> : null}
          <ThemeSegmented />
          <span className="lilt-header__github">
            {/* A count only says something once it is large; until then the mark stands alone. */}
            <GitHubStars stars={stars && stars.total >= 50 ? stars : null} />
          </span>
          <Link href="/guides/installation" className="lilt-btn lilt-header__cta" data-tone="ink">
            <Roll>Get started</Roll>
            <ArrowSwap direction="right" />
          </Link>
        </div>
      </div>
    </header>
  );
}
