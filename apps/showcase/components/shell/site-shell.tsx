'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { GitHubStars } from '@/lib/github-stars';
import { routeFor } from '@/lib/routes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocsSearchProvider } from './docs-search';
import { LiltLogo } from './logo';
import { tabOf, tabs } from './nav-model';
import { PAGE_SCROLL_ID, pageScroller } from './page-scroll';
import { SiteHeader } from './site-header';
import { CHARTS_OVERVIEW, SiteSidebar } from './site-sidebar';
import { SiteToc } from './site-toc';
import { StyleMenu } from './style-menu';

/**
 * The documentation frame: one bar across the top, the open section's pages down the left, the
 * page in the middle, and its sections down the right on wide screens. The page scrolls in the
 * kit's own ScrollArea; the bar and both rails stay put inside it. Phones fold the left rail into
 * a drawer.
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
  const overview = pathname === '/charts';
  const route = routeFor(pathname);
  const tab = overview ? 'charts' : tabOf(route.group);
  const activeId = overview ? CHARTS_OVERVIEW : route.id;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState(tab);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  // The page scrolls in an element, not the window, so keys only move it once it has focus. Give
  // it focus on arrival unless something else already has it.
  useEffect(() => {
    if (document.activeElement === document.body) pageScroller()?.focus({ preventScroll: true });
  }, []);

  return (
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
          stars={stars}
          onMenu={() => {
            setMobileTab(tab);
            setMobileOpen(true);
          }}
        />
        <StyleMenu />
        {bare ? (
          <main id="main-content">{children}</main>
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
  );
}
