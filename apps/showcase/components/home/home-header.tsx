'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useSpring } from 'motion/react';
import Link from 'next/link';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Menu01Icon from '@hugeicons/core-free-icons/Menu01Icon';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import { LiltLogo } from '@/components/shell/logo';

const links = [
  { href: '/charts/area', label: 'Charts' },
  { href: '/guides/installation', label: 'Docs' },
  { href: '/customize', label: 'Customize' },
];

export function HomeHeader() {
  const header = useRef<HTMLElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const width = useSpring(1152, { stiffness: 180, damping: 30, mass: 1 });
  const height = useSpring(64, { stiffness: 180, damping: 30, mass: 1 });

  useEffect(() => {
    const element = header.current;
    const scroller = element?.closest('.lilt-home');
    if (!element || !scroller) return;
    let expandedWidth = 1152;
    const update = (immediate = false) => {
      // Follow the first stretch of scroll continuously; springs preserve velocity
      // when the user changes direction instead of restarting a CSS transition.
      const progress = Math.min(1, Math.max(0, scroller.scrollTop / 180));
      const nextWidth = expandedWidth - (expandedWidth - Math.min(expandedWidth, 800)) * progress;
      const nextHeight = 64 - 6 * progress;
      if (immediate || reducedMotion) {
        width.jump(nextWidth);
        height.jump(nextHeight);
      } else {
        width.set(nextWidth);
        height.set(nextHeight);
      }
    };
    const measure = () => {
      const gutter = parseFloat(getComputedStyle(scroller).getPropertyValue('--home-gutter'));
      expandedWidth = Math.min(1152, Math.max(0, element.clientWidth - 2 * gutter));
      update(true);
    };
    const onScroll = () => update();
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', onScroll);
    };
  }, [height, reducedMotion, width]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 721px)');
    const closeOnDesktop = () => {
      if (desktop.matches) drawer.current?.close();
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  return (
    <header ref={header} className="lilt-home__bar">
      <motion.nav className="lilt-home__nav" aria-label="Main" style={{ width, height }}>
        <Link href="/" className="lilt-home__logo" aria-label="LiltUI home">
          <LiltLogo className="lilt-shell__brand-logo" />
        </Link>
        <div className="lilt-home__links">
          {links.map(({ href, label }) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
        <div className="lilt-home__actions">
          <Link href="/guides/installation" className="lilt-home__button" data-size="small">
            Get started
          </Link>
          <button
            type="button"
            className="lilt-home__menu-toggle"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            aria-controls="lilt-home-navigation"
            onClick={() => {
              drawer.current?.showModal();
              setMenuOpen(true);
            }}
          >
            <Icon icon={Menu01Icon} size={20} aria-hidden="true" />
          </button>
        </div>
      </motion.nav>
      <dialog
        ref={drawer}
        id="lilt-home-navigation"
        className="lilt-home__drawer"
        aria-labelledby="lilt-home-navigation-title"
        onClose={() => setMenuOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) drawer.current?.close();
        }}
      >
        <div className="lilt-home__drawer-content">
          <div className="lilt-home__drawer-heading">
            <strong id="lilt-home-navigation-title">Explore Lilt</strong>
            <button
              type="button"
              className="lilt-home__menu-toggle"
              aria-label="Close navigation"
              onClick={() => drawer.current?.close()}
            >
              <Icon icon={Cancel01Icon} size={20} aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Mobile navigation">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => drawer.current?.close()}>
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/guides/installation"
            className="lilt-home__button"
            onClick={() => drawer.current?.close()}
          >
            Get started
          </Link>
        </div>
      </dialog>
    </header>
  );
}
