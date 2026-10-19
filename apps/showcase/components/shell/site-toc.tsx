'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Heading {
  id: string;
  text: string;
}

/** Reads the page's section headings: each h2 links to the nearest element with an id. */
function readHeadings(root: HTMLElement): Heading[] {
  const seen = new Set<string>();
  return [...root.querySelectorAll<HTMLHeadingElement>('h2')].flatMap((heading) => {
    // Prefer the section's own id, so links read #usage rather than #usage-title.
    const target = heading.closest<HTMLElement>('section[id]') ?? (heading.id ? heading : null);
    const id = target?.id;
    const text = (heading.dataset.tocLabel ?? heading.textContent)?.trim();
    if (!id || !text || seen.has(id) || target === root) return [];
    seen.add(id);
    return [{ id, text }];
  });
}

/**
 * "On this page": the open page's sections down the right, the one in view marked. It stays out
 * of the way on pages with fewer than two sections.
 */
export function SiteToc() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const root = document.getElementById('main-content');
    if (!root) return;
    const update = () => setHeadings(readHeadings(root));
    update();
    // Client pages can add their sections after the first paint.
    const observer = new MutationObserver(() => update());
    observer.observe(root, { childList: true, subtree: true });
    const stop = window.setTimeout(() => observer.disconnect(), 1500);
    return () => {
      observer.disconnect();
      window.clearTimeout(stop);
    };
  }, [pathname]);

  useEffect(() => {
    if (headings.length < 2) return;
    const onScroll = () => {
      const line = window.innerHeight * 0.3;
      let current = headings[0]!.id;
      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (element && element.getBoundingClientRect().top <= line) current = heading.id;
      }
      const bottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
      setActive(bottom ? headings.at(-1)!.id : current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  if (headings.length < 2) return null;
  return (
    <nav className="lilt-toc" aria-label="On this page">
      <p className="lilt-toc__title">On this page</p>
      <ul>
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className="lilt-toc__link"
              aria-current={active === heading.id ? 'location' : undefined}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
