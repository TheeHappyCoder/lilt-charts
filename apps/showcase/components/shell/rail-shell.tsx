'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Menu01Icon from '@hugeicons/core-free-icons/Menu01Icon';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Downloads } from '@/lib/npm-downloads';
import type { GitHubStars } from '@/lib/github-stars';
import { routeFor } from '@/lib/routes';
import { ChartIsland } from './chart-island';
import { DocsSearchProvider, HeaderSearch } from './docs-search';
import { NotchSlotProvider } from './notch-slot';
import { Rail, RailPanel } from './rail-nav';
import { tabOf, type Tab } from './nav-model';
import { DownloadsNotch } from './downloads-notch';
import { StyleNotch } from './style-notch';
import { useSnappedSheet } from './use-hairline';
import { ThemeModeSwitcher } from './theme-switcher';

const PANEL_KEY = 'lilt-rail-panel';
const PHONE = '(max-width: 767px)';

/** True on phone widths, once hydrated; the server renders the wide layout. */
function usePhone() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(PHONE);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}

/** The panel's open state, remembered per reader; it always renders open on the server. */
function usePanelOpen() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(PANEL_KEY) === 'closed') setOpen(false);
    } catch {
      // Storage can be blocked; the panel simply opens.
    }
  }, []);
  const set = useCallback((next: boolean | ((current: boolean) => boolean)) => {
    setOpen((current) => {
      const value = typeof next === 'function' ? next(current) : next;
      try {
        window.localStorage.setItem(PANEL_KEY, value ? 'open' : 'closed');
      } catch {
        // Storage can be blocked; the panel simply opens.
      }
      return value;
    });
  }, []);
  return [open, set] as const;
}

/**
 * The formal shell: a frame that stays dark on every theme with the page as one sheet inside it.
 * The rail down the left is the menu switcher; the panel beside it lists the open tab's pages; the
 * chart style notch pours out of the frame's right edge. Phones keep the notch on top instead.
 */
export function RailShell({
  children,
  downloads = null,
  stars = null,
}: {
  children: React.ReactNode;
  /** Lilt's npm downloads, fetched on the server; chart pages show them in the frame. */
  downloads?: Downloads | null;
  stars?: GitHubStars | null;
}) {
  const active = routeFor(usePathname());
  const [tab, setTab] = useState<Tab>(() => tabOf(active.group));
  const [open, setOpen] = usePanelOpen();
  const [mobileOpen, setMobileOpen] = useState(false);
  const phone = usePhone();
  const railRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  useSnappedSheet(shellRef);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const closePanel = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (!open || phone) return;
    const onPointer = (event: PointerEvent) => {
      if (!railRef.current?.contains(event.target as Node)) closePanel();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const rail = railRef.current;
      if (rail?.contains(document.activeElement)) {
        rail.querySelector<HTMLButtonElement>('.lilt-rail__tab[aria-pressed="true"]')?.focus();
      }
      closePanel();
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onEscape);
    };
  }, [open, phone, closePanel]);

  // Arriving on a page opens its tab.
  useEffect(() => setTab(tabOf(active.group)), [active.group]);

  const choose = useCallback(
    (next: Tab) => {
      if (next === tab) {
        setOpen((current) => !current);
        return;
      }
      setTab(next);
      setOpen(true);
    },
    [tab, setOpen],
  );
  const toggle = useCallback(() => setOpen((current) => !current), [setOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'b' || !(event.metaKey || event.ctrlKey) || event.altKey)
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return (
    <DocsSearchProvider onOpen={closeMobile}>
      <NotchSlotProvider>
        <div
          ref={shellRef}
          className="lilt-shell"
          data-layout="rail"
          data-panel={open ? 'open' : 'closed'}
        >
          <div className="lilt-shell__sheet" aria-hidden="true" />
          {/* Phones keep the notch on top: search, the menu and the chart style in one place. */}
          <header className="lilt-shell__header" aria-label="Lilt Charts">
            {phone ? (
              <ChartIsland
                leading={
                  <>
                    <button
                      aria-label="Open navigation"
                      className="lilt-shell__menu-button lilt-shell__mobile-trigger"
                      onClick={() => setMobileOpen(true)}
                      type="button"
                    >
                      <Icon icon={Menu01Icon} aria-hidden="true" size={18} />
                    </button>
                    <HeaderSearch />
                  </>
                }
                trailing={<ThemeModeSwitcher compact start="top" />}
              />
            ) : null}
          </header>
          {phone ? null : <StyleNotch />}
          {!phone && (active.group === 'Charts' || active.group === 'Finance') ? (
            <DownloadsNotch downloads={downloads} stars={stars} />
          ) : null}
          <aside ref={railRef} aria-label="Primary navigation" className="lilt-shell__rail">
            <Rail tab={tab} open={open} onChoose={choose} onToggle={toggle} />
            <div className="lilt-shell__panel-clip">
              <div className="lilt-shell__panel">
                <RailPanel tab={tab} activeId={active.id} open={open} onNavigate={closePanel} />
              </div>
            </div>
          </aside>
          <div className="lilt-shell__main-frame">
            <ScrollArea
              scrollFade
              className="lilt-shell__scroll"
              contentClassName="lilt-shell__content"
              viewportProps={{ render: <main />, role: 'main', id: 'main-content' }}
            >
              {children}
            </ScrollArea>
          </div>

          <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Backdrop className="lilt-shell__mobile-backdrop" />
              <DialogPrimitive.Viewport>
                <DialogPrimitive.Popup
                  className="lilt-shell__mobile-dialog lilt-rail-drawer"
                  aria-label="Mobile navigation"
                >
                  <Rail
                    mobile
                    tab={tab}
                    open
                    onChoose={setTab}
                    onToggle={closeMobile}
                    onNavigate={closeMobile}
                  />
                  <RailPanel mobile tab={tab} activeId={active.id} onNavigate={closeMobile} />
                </DialogPrimitive.Popup>
              </DialogPrimitive.Viewport>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </NotchSlotProvider>
    </DocsSearchProvider>
  );
}
