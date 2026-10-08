'use client';

import {
  createElement,
  useLayoutEffect,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type ReactNode,
} from 'react';

interface BlurFadeProps {
  children: ReactNode;
  as?: 'div' | 'span';
  trigger?: 'mount' | 'scroll';
  /** A short reading-order offset, capped at 160ms. */
  delay?: number;
  className?: string;
}

/** One finite entrance. Key the helper by text when an in-place title changes. */
export function BlurFade({
  children,
  as = 'div',
  trigger = 'mount',
  delay = 0,
  className,
}: BlurFadeProps) {
  const root = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<'waiting' | 'entering' | 'settled'>('entering');

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;
    const settle = () => {
      if (!preference.matches) return;
      observer?.disconnect();
      setPhase('settled');
    };
    preference.addEventListener('change', settle);
    if (preference.matches) {
      setPhase('settled');
    } else if (trigger === 'scroll' && typeof IntersectionObserver !== 'undefined') {
      const bounds = element.getBoundingClientRect();
      // Never hide already-visible server-rendered copy during hydration.
      if (bounds.top >= window.innerHeight - 16 || bounds.bottom <= 0) {
        setPhase('waiting');
        observer = new IntersectionObserver(
          (entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            setPhase('entering');
            observer?.disconnect();
          },
          { rootMargin: '0px 0px -16px 0px', threshold: 0 },
        );
        observer.observe(element);
      }
    }
    return () => {
      observer?.disconnect();
      preference.removeEventListener('change', settle);
    };
  }, [trigger]);

  return createElement(
    as,
    {
      ref: root,
      className: ['t-stagger', 'lilt-blur-fade', phase !== 'waiting' && 'is-shown', className]
        .filter(Boolean)
        .join(' '),
      'data-reveal': phase,
      'data-trigger': trigger,
      style: { '--lilt-reveal-delay': `${Math.max(0, Math.min(160, delay))}ms` } as CSSProperties,
      onFocusCapture: () => setPhase('settled'),
      onAnimationEnd: (event: AnimationEvent<HTMLElement>) => {
        if (event.target === event.currentTarget.firstElementChild) setPhase('settled');
      },
    },
    createElement(as, { className: 't-stagger-line' }, children),
  );
}
