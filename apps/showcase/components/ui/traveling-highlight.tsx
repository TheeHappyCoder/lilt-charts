'use client';

import { motion, useReducedMotion } from 'motion/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

interface HighlightScope {
  activeItemId: string | null;
  layoutId: string;
}

const HighlightContext = createContext<HighlightScope | null>(null);

/** Share one moving highlight across pointer, focus, and Base UI keyboard navigation. */
export function TravelingHighlightScope({
  activationMode = 'base-ui',
  children,
  className,
}: {
  activationMode?: 'base-ui' | 'pointer-and-focus';
  children: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const layoutId = `lilt-ui-hover-${useId()}`;

  useEffect(() => {
    const container = containerRef.current;
    if (activationMode !== 'base-ui' || !container) return;
    const sync = () => {
      const item = container.querySelector<HTMLElement>(
        '[data-lilt-highlight][data-highlighted]:not([data-disabled]):not([aria-disabled="true"])',
      );
      setActiveItemId(item?.dataset.liltHighlight ?? null);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(container, {
      attributes: true,
      attributeFilter: ['data-highlighted', 'data-disabled', 'aria-disabled'],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [activationMode]);

  const activate = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) return;
    const item = target.closest<HTMLElement>('[data-lilt-highlight]');
    const container = containerRef.current;
    setActiveItemId(
      item &&
        container?.contains(item) &&
        !item.matches(':disabled, [data-disabled], [aria-disabled="true"]')
        ? (item.dataset.liltHighlight ?? null)
        : null,
    );
  }, []);
  const value = useMemo(() => ({ activeItemId, layoutId }), [activeItemId, layoutId]);

  return (
    <HighlightContext.Provider value={value}>
      <div
        ref={containerRef}
        className={className}
        onPointerMove={(event) => {
          if (activationMode === 'pointer-and-focus' && event.pointerType !== 'touch')
            activate(event.target);
        }}
        onPointerLeave={() => {
          if (activationMode === 'pointer-and-focus') {
            const focused = containerRef.current?.contains(document.activeElement);
            activate(focused ? document.activeElement : containerRef.current);
          }
        }}
        onFocusCapture={(event) => {
          if (activationMode === 'pointer-and-focus') activate(event.target);
        }}
        onBlurCapture={(event) => {
          if (activationMode === 'pointer-and-focus') activate(event.relatedTarget);
        }}
      >
        {children}
      </div>
    </HighlightContext.Provider>
  );
}

export function TravelingHighlightTarget({
  itemId,
  className,
}: {
  itemId: string;
  className?: string;
}) {
  const scope = useContext(HighlightContext);
  const reduced = useReducedMotion();
  if (!scope || scope.activeItemId !== itemId) return null;
  return (
    <motion.span
      aria-hidden="true"
      className={cn('lilt-ui-highlight', className)}
      initial={false}
      layoutId={scope.layoutId}
      transition={reduced ? { duration: 0 } : { duration: 0.08, ease: 'easeOut' }}
    />
  );
}
