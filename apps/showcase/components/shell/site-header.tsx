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
import { tabHref, tabs, type Tab } from './nav-model';
import { StyleMenuTrigger } from './style-menu';
import { ThemeSegmented } from './theme-switcher';

const SPRING = { type: 'spring', stiffness: 520, damping: 42 } as const;

/**
 * One bar across the top of every page: the wordmark and the four places to browse on the left;
 * search, the chart style, the theme, GitHub and the way in on the right. It is clear over the
 * page until the page scrolls under it.
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
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
        <Link href="/" className="lilt-header__brand" aria-label="Lilt Charts home">
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
              </Link>
            );
          })}
        </nav>

        <div className="lilt-header__actions">
          <HeaderSearch className="lilt-header__search" wide />
          <StyleMenuTrigger />
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
