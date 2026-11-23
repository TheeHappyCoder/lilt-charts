'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Count } from '@/components/craft/label';
import { NavPill } from '@/components/craft/nav-pill';
import { Roll } from '@/components/craft/roll';
import { LiltLogo } from '@/components/shell/logo';
import {
  familyGroups,
  groupsByTab,
  tabHref,
  tabs,
  type Tab,
  type TileGroup,
} from '@/components/shell/nav-model';
import { pageScroller } from '@/components/shell/page-scroll';

const countOf = (groups: readonly TileGroup[]) =>
  groups.reduce((sum, group) => sum + group.routes.length, 0);

const COUNTS: Record<Tab, number> = {
  charts: countOf(familyGroups),
  components: countOf(groupsByTab.components),
  visuals: countOf(groupsByTab.visuals),
  ascii: countOf(groupsByTab.ascii),
};

/**
 * A slim dark-glass bar that drops in once the hero has scrolled away, so the sections and the
 * way in are never more than a glance off. It steps aside again when the closing panel arrives.
 */
export function HomeFloatingNav() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = ref.current;
    const hero = document.querySelector('.lilt-home-hero');
    const foot = document.querySelector('.lilt-home-foot__panel');
    if (!bar || !hero) return;
    let pastHero = false;
    let atFoot = false;
    const apply = () => {
      const on = pastHero && !atFoot;
      bar.dataset.on = String(on);
      bar.inert = !on;
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === hero) {
            pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
          } else atFoot = entry.isIntersecting;
        }
        apply();
      },
      { threshold: [0, 0.3] },
    );
    observer.observe(hero);
    if (foot) observer.observe(foot);
    apply();
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="lilt-float dark" data-on="false">
      <a
        href="#main-content"
        className="lilt-float__brand"
        aria-label="Back to top"
        onClick={(event) => {
          event.preventDefault();
          pageScroller()?.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        <LiltLogo className="lilt-float__logo" />
      </a>
      <NavPill className="lilt-float__nav" label="Sections">
        {tabs.map((option) => (
          <Link key={option.value} href={tabHref[option.value]}>
            {option.label}
            <Count n={COUNTS[option.value]} />
          </Link>
        ))}
      </NavPill>
      <Link href="/guides/installation" className="lilt-btn" data-tone="light">
        <Roll>Get started</Roll>
      </Link>
    </div>
  );
}
