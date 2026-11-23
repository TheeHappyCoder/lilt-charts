'use client';

import { useEffect } from 'react';

/**
 * Reveal choreography, one vocabulary used the same way on every page:
 *
 *   data-rv="lines"  a heading's lines rise out of their masks (see TwoTone)
 *   data-rv="media"  a card settles in while its `.lilt-media` wipes open
 *   data-rv="fade"   small things lift a few pixels out of a blur
 *   data-rv="kids"   the same, staggered across the element's children
 *
 * `--i` on an element delays it by steps, so siblings arrive in order. The motion is CSS in
 * craft.css; this only marks each element once it scrolls into view. REVEAL_BOOT (in the root
 * layout) switches reveals on before the first paint, unless the reader prefers reduced motion,
 * and switches them off again if this never runs.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.rv !== 'on') return;
    (window as Window & { __liltReveal?: boolean }).__liltReveal = true;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-rv-in', '');
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -6% 0px' },
    );
    const watched = new WeakSet<Element>();
    const scan = () => {
      for (const element of document.querySelectorAll('[data-rv]:not([data-rv-in])')) {
        if (watched.has(element)) continue;
        watched.add(element);
        if (element.getAttribute('data-rv') === 'kids') {
          Array.from(element.children).forEach((child, index) =>
            (child as HTMLElement).style.setProperty('--k', String(index)),
          );
        }
        io.observe(element);
      }
    };
    scan();
    // Pages change without a reload; pick up whatever each new page brings.
    let queued = 0;
    const mutations = new MutationObserver(() => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        scan();
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const off = () => {
      if (reduced.matches) root.dataset.rv = 'off';
    };
    reduced.addEventListener('change', off);
    return () => {
      io.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(queued);
      reduced.removeEventListener('change', off);
    };
  }, []);
  return null;
}

/**
 * Runs in the document head before the first paint: content that reveals waits hidden from the
 * start, rather than showing and then hiding. If the observer has not started within four seconds,
 * everything shows.
 */
export const REVEAL_BOOT = `(function(){try{var d=document.documentElement;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.rv='off';return}d.dataset.rv='on';setTimeout(function(){if(!window.__liltReveal)d.dataset.rv='off'},4000)}catch(e){}})();`;
