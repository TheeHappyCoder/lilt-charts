'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import { restoreBurntCursor } from '@lilt-ui/registry';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GitHubStars } from '@/lib/github-stars';
import { routeFor } from '@/lib/routes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocsSearchProvider } from './docs-search';
import { LiltLogo } from './logo';
import { NavDrawerContext } from './nav-drawer-context';
import { tabOf, tabs, type Tab } from './nav-model';
import { PAGE_SCROLL_ID, pageScroller } from './page-scroll';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import {
  ASCII_OVERVIEW,
  CHARTS_OVERVIEW,
  COMPONENTS_OVERVIEW,
  SiteSidebar,
  VISUALS_OVERVIEW,
} from './site-sidebar';
import { SiteToc } from './site-toc';
import { StyleMenu } from './style-menu';

/** Showroom routes own the full width on `--gut`, without permanent sidebars. */
function isShowroomPath(pathname: string): boolean {
  return (
    pathname === '/charts' ||
    pathname.startsWith('/charts/') ||
    pathname === '/finance' ||
    pathname.startsWith('/finance/') ||
    pathname === '/features' ||
    pathname.startsWith('/features/') ||
    pathname === '/customize' ||
    pathname.startsWith('/customize/') ||
    pathname === '/components' ||
    pathname.startsWith('/components/') ||
    pathname === '/visuals' ||
    pathname.startsWith('/visuals/') ||
    pathname === '/ascii' ||
    pathname.startsWith('/ascii/')
  );
}

/**
 * The site frame:
 * - Home (`bare`): full-bleed with the overlay bar inside the dark hero.
 * - Showroom (Charts, Finance, Components, ASCII): full-width `--gut` header, open showroom or
 *   studio canvas with no permanent rails, an on-demand index drawer, and the dark closing panel.
 * - Docs (Guides, Customize, Features): left section rail, centered docs page, and "On this page".
 */
export function SiteShell({
  children,
  stars = null,
  bare = false,
}: {
  children: React.ReactNode;
  stars?: GitHubStars | null;
  /** The page takes the full width under the bar, with no rails: the home page. */
  bare?: boolean;
}) {
  const pathname = usePathname();
  const route = routeFor(pathname);
  const showroom = !bare && isShowroomPath(pathname);

  const tab: Tab =
    pathname === '/charts' || pathname.startsWith('/charts/') || pathname.startsWith('/finance')
      ? 'charts'
      : pathname === '/components' || pathname.startsWith('/components/')
        ? 'components'
        : pathname === '/visuals' || pathname.startsWith('/visuals/')
          ? 'visuals'
          : pathname === '/ascii' || pathname.startsWith('/ascii/')
            ? 'ascii'
            : tabOf(route.group);

  const activeId =
    pathname === '/charts'
      ? CHARTS_OVERVIEW
      : pathname === '/components'
        ? COMPONENTS_OVERVIEW
        : pathname === '/visuals'
          ? VISUALS_OVERVIEW
          : pathname === '/ascii'
            ? ASCII_OVERVIEW
            : route.id;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<Tab>(tab);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openDrawer = useCallback(
    (nextTab?: Tab) => {
      setMobileTab(nextTab ?? tab);
      setMobileOpen(true);
    },
    [tab],
  );
  const drawerContext = useMemo(() => ({ openDrawer }), [openDrawer]);

  // The page scrolls in an element, not the window, so keys only move it once it has focus. Give
  // it focus on arrival unless something else already has it.
  useEffect(() => {
    if (document.activeElement === document.body) pageScroller()?.focus({ preventScroll: true });
  }, []);
  // A pointer burnt in the home page's campfire stays burnt on every page for the session.
  useEffect(() => restoreBurntCursor(), []);

  return (
    <NavDrawerContext.Provider value={drawerContext}>
      <DocsSearchProvider onOpen={closeMobile}>
        <ScrollArea
          className="lilt-page-scroll"
          viewportClassName="lilt-page-scroll__viewport"
          viewportProps={{ id: PAGE_SCROLL_ID }}
        >
          <a className="lilt-skip" href="#main-content">
            Skip to content
          </a>
          <SiteHeader
            tab={bare ? undefined : tab}
            overlay={bare}
            wide={showroom}
            stars={stars}
            onMenu={() => openDrawer(tab)}
          />
          <StyleMenu />
          {bare ? (
            <main id="main-content">{children}</main>
          ) : showroom ? (
            <div className="lilt-showroom-shell">
              <main id="main-content" className="lilt-showroom-main">
                {children}
              </main>
              <SiteFooter />
            </div>
          ) : (
            <div className="lilt-site">
              <aside className="lilt-site__sidebar" aria-label="Section navigation">
                <SiteSidebar tab={tab} activeId={activeId} />
              </aside>
              <main id="main-content" className="lilt-site__main">
                {children}
              </main>
              <aside className="lilt-site__toc" aria-label="Page sections">
                <SiteToc />
              </aside>
            </div>
          )}
        </ScrollArea>

        <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Backdrop className="lilt-drawer__backdrop" />
            <DialogPrimitive.Popup className="lilt-drawer" aria-label="Navigation">
              <div className="lilt-drawer__head">
                <Link href="/" className="lilt-header__brand" onClick={closeMobile}>
                  <LiltLogo className="lilt-header__logo" />
                </Link>
                <DialogPrimitive.Close className="lilt-header__icon" aria-label="Close navigation">
                  <Icon icon={Cancel01Icon} size={16} aria-hidden="true" />
                </DialogPrimitive.Close>
              </div>
              <div className="lilt-drawer__tabs" role="tablist" aria-label="Sections">
                {tabs.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={mobileTab === option.value}
                    className="lilt-drawer__tab"
                    onClick={() => setMobileTab(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="lilt-drawer__scroll">
                <SiteSidebar mobile tab={mobileTab} activeId={activeId} onNavigate={closeMobile} />
              </div>
            </DialogPrimitive.Popup>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </DocsSearchProvider>
    </NavDrawerContext.Provider>
  );
}
