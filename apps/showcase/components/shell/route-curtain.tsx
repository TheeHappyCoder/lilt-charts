'use client';

import { AsciiCurtain } from '@lilt-ui/registry';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

/** Longest the curtain waits for a page before it lifts anyway. */
const PATIENCE = 8000;

/** Where the curtain falls: the page's column, or the whole window under the bar. */
function regionFor(from: string, to: string): CSSProperties {
  const header = document.querySelector('.lilt-header')?.getBoundingClientRect().bottom ?? 0;
  const top = Math.max(0, header);
  const main = document.getElementById('main-content')?.getBoundingClientRect();
  // Into or out of the home page the frame itself changes, so the whole window turns over.
  if (!main || from === '/' || to === '/') {
    return { top, left: 0, width: '100vw', height: `calc(100vh - ${top}px)` };
  }
  return {
    top,
    left: Math.max(0, main.left),
    width: Math.min(window.innerWidth, main.right) - Math.max(0, main.left),
    height: `calc(100vh - ${top}px)`,
  };
}

/**
 * Every move between pages runs behind a curtain of type: a link click raises it over the page,
 * the route changes behind it, and it resolves away once the new page is there. Links that open
 * elsewhere, modified clicks, files, and same-page anchors go straight through, and with reduced
 * motion nothing is held at all.
 */
export function RouteCurtain() {
  const router = useRouter();
  const pathname = usePathname();
  const [covered, setCovered] = useState(false);
  const [region, setRegion] = useState<CSSProperties>({});
  const pending = useRef<string | null>(null);
  const arrived = useRef(pathname);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || reduced.matches) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page (an anchor on it) or a file such as llms.txt: the browser handles those.
      if (url.pathname === window.location.pathname || /\.[a-z0-9]+$/i.test(url.pathname)) return;
      // Hold the click: next/link sees it handled and leaves the navigation to the curtain.
      event.preventDefault();
      pending.current = url.pathname + url.search + url.hash;
      setRegion(regionFor(window.location.pathname, url.pathname));
      setCovered(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  const onCovered = useCallback(() => {
    const href = pending.current;
    if (href) router.push(href);
  }, [router]);

  // The new page is in: let it paint, then lift the curtain. A page that never comes lifts it too.
  useEffect(() => {
    if (!covered) return;
    if (pathname !== arrived.current) {
      arrived.current = pathname;
      pending.current = null;
      let raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => setCovered(false));
      });
      return () => cancelAnimationFrame(raf);
    }
    const timeout = window.setTimeout(() => setCovered(false), PATIENCE);
    return () => window.clearTimeout(timeout);
  }, [covered, pathname]);

  useEffect(() => {
    if (!covered) arrived.current = pathname;
  }, [covered, pathname]);

  return (
    <AsciiCurtain
      covered={covered}
      onCovered={onCovered}
      duration={0.32}
      color="#8b6cff"
      background="var(--background)"
      className="lilt-route-curtain"
      style={region}
    />
  );
}
