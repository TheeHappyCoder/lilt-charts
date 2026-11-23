'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** How long the page takes to blur out before the route changes. */
const LEAVE_MS = 170;
/** However the navigation went, the page is never left blurred for longer than this. */
const PATIENCE = 4000;

/**
 * Page changes as a quick blur: following a link blurs and fades the page out, the route changes,
 * and the new page sharpens in. Only same-site page links take part; files, new tabs, modified
 * clicks and anchors on the same page go straight through, and with reduced motion nothing is
 * held at all. The motion is CSS in craft.css.
 */
export function BlurTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const leaving = useRef(false);
  const from = useRef(pathname);

  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let push = 0;
    let rescue = 0;

    const onClick = (event: MouseEvent) => {
      if (reduced.matches || leaving.current) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;
      if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;
      if (link.closest('[data-no-transition]')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page (an anchor on it) or a file such as llms.txt: the browser handles those.
      if (url.pathname === window.location.pathname || /\.[a-z0-9]+$/i.test(url.pathname)) return;

      // Hold the click: next/link sees it handled and leaves the navigation to us.
      event.preventDefault();
      leaving.current = true;
      from.current = window.location.pathname;
      root.classList.remove('lilt-pt-enter');
      root.classList.add('lilt-pt-leave');
      push = window.setTimeout(() => router.push(url.pathname + url.search + url.hash), LEAVE_MS);
      window.clearTimeout(rescue);
      rescue = window.setTimeout(() => {
        leaving.current = false;
        root.classList.remove('lilt-pt-leave');
      }, PATIENCE);
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.clearTimeout(push);
      window.clearTimeout(rescue);
    };
  }, [router]);

  useEffect(() => {
    if (!leaving.current || pathname === from.current) return;
    const root = document.documentElement;
    leaving.current = false;
    // A timer, not a frame: background tabs never draw frames, and the page must never stay blurred.
    const enter = window.setTimeout(() => {
      root.classList.remove('lilt-pt-leave');
      root.classList.add('lilt-pt-enter');
    }, 16);
    const settle = window.setTimeout(() => root.classList.remove('lilt-pt-enter'), 420);
    return () => {
      window.clearTimeout(enter);
      window.clearTimeout(settle);
    };
  }, [pathname]);

  return null;
}
