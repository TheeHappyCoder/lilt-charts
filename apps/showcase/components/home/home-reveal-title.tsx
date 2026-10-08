'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';

/** Splits text into word spans, numbering each so the reveal can stagger them in reading order. */
function splitWords(node: ReactNode, counter: { index: number }): ReactNode {
  if (typeof node === 'string') {
    return node.split(/(\s+)/).map((part, position) => {
      if (!part) return null;
      if (/^\s+$/.test(part)) return part;
      const index = counter.index++;
      return (
        <span
          key={`${index}-${position}`}
          className="lilt-reveal-word"
          style={{ '--word': index } as CSSProperties}
        >
          {part}
        </span>
      );
    });
  }
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children !== undefined) {
    const element = node as ReactElement<{ children?: ReactNode }>;
    return cloneElement(element, undefined, splitWords(element.props.children, counter));
  }
  if (Array.isArray(node)) {
    return Children.map(node, (child) => splitWords(child, counter));
  }
  return node;
}

interface RevealTitleProps {
  id: string;
  children: ReactNode;
  className?: string;
}

/**
 * A section headline that arrives word by word the first time it scrolls into view: each word
 * rises a little and comes into focus. Copy already on screen at hydration is never hidden, and
 * reduced motion shows it at once.
 */
export function RevealTitle({ id, children, className }: RevealTitleProps) {
  const root = useRef<HTMLHeadingElement>(null);
  const [phase, setPhase] = useState<'shown' | 'waiting' | 'entering'>('shown');

  useLayoutEffect(() => {
    const element = root.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = element.getBoundingClientRect();
    if (bounds.top < window.innerHeight - 16 && bounds.bottom > 0) return;
    setPhase('waiting');
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setPhase('entering');
        observer.disconnect();
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <h2 ref={root} id={id} className={className} data-reveal={phase}>
      {splitWords(children, { index: 0 })}
    </h2>
  );
}
