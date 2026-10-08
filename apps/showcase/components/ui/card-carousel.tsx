'use client';

import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

export interface CarouselItem {
  id: string;
  title: string;
  /** A stat card draws narrow and a row of cards wide; each card keeps its own width. */
  size?: 'narrow' | 'wide';
}

/** The home gallery's looping card stage, shared by the chart studio. */
export function CardCarousel({
  items,
  active,
  onSelect,
  renderItem,
  label,
  footer,
  compact = false,
  fitViewport = false,
}: {
  items: readonly CarouselItem[];
  active: number;
  onSelect: (index: number) => void;
  renderItem: (index: number, active: boolean) => ReactNode;
  label: string;
  footer?: ReactNode;
  compact?: boolean;
  fitViewport?: boolean;
}) {
  const reduced = Boolean(useReducedMotion());
  const root = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; height: number } | null>(null);

  // Fit the whole card, including headers and legends, without changing chart geometry.
  useEffect(() => {
    const element = root.current;
    if (!element || !fitViewport) return;
    const example = element.closest<HTMLElement>('[data-badge-head]');
    const syncHeader = (scale: number) => {
      const card = element.querySelector<HTMLElement>('.lilt-card-carousel__card[data-active]');
      if (card && example)
        example.style.setProperty(
          '--lilt-stage-card-width',
          `${Math.floor(card.offsetWidth * scale)}px`,
        );
    };
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (window.innerWidth <= 960 || window.innerHeight <= 600) {
          setFit(null);
          syncHeader(1);
          return;
        }
        // Fit the card in focus; a taller neighbour is clipped at the stage's edge, not obeyed.
        const naturalHeight =
          element.querySelector<HTMLElement>('.lilt-card-carousel__card[data-active]')
            ?.offsetHeight ?? 0;
        const footer = element.querySelector<HTMLElement>('.lilt-card-carousel__footer');
        if (!naturalHeight || !footer) return;
        // Leave room for stage padding, navigation, and the shell's bottom edge.
        const available = Math.max(
          120,
          window.innerHeight -
            Math.max(0, element.getBoundingClientRect().top) -
            footer.offsetHeight -
            64,
        );
        const scale = Math.min(1, available / naturalHeight);
        syncHeader(scale);
        const next = { scale, height: Math.ceil(naturalHeight * scale) };
        setFit((previous) =>
          previous?.height === next.height && previous.scale === next.scale ? previous : next,
        );
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    const header = example?.querySelector('.lilt-docs-example__head');
    if (header) observer.observe(header);
    element
      .querySelectorAll('.lilt-card-carousel__card, .lilt-card-carousel__footer')
      .forEach((node) => observer.observe(node));
    window.addEventListener('resize', measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(frame);
    };
  }, [fitViewport, active, items]);
  // The header keeps its width while the effect above re-measures on every turn, so the tab never
  // snaps to a fallback width between cards; it lets go only when the stage leaves.
  useEffect(() => {
    const example = root.current?.closest<HTMLElement>('[data-badge-head]');
    if (!example || !fitViewport) return;
    return () => {
      example.style.removeProperty('--lilt-stage-card-width');
    };
  }, [fitViewport]);
  // The card in focus renders first; its neighbours join once the browser is idle, and stay
  // mounted while they remain on stage.
  const [shown, setShown] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    const near = new Set(
      items
        .filter((_, index) => {
          const offset = (index - active + items.length) % items.length;
          return offset <= 1 || offset === items.length - 1;
        })
        .map((item) => item.id),
    );
    setShown((previous) => {
      const kept = [...previous].filter((id) => near.has(id));
      return kept.length === previous.size ? previous : new Set(kept);
    });
    const reveal = () => setShown(near);
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(reveal, { timeout: 900 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = setTimeout(reveal, 300);
    return () => clearTimeout(handle);
  }, [active, items]);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const dragged = useRef(false);
  const wheelLock = useRef(0);
  const current = useRef({ active, onSelect, count: items.length });
  current.current = { active, onSelect, count: items.length };
  const go = (step: number) => {
    const value = current.current;
    if (value.count > 1) value.onSelect((value.active + step + value.count) % value.count);
  };

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 12) return;
      // Plot inspection owns gestures inside the live card.
      if ((event.target as Element).closest('[data-carousel-live], [data-carousel-ignore]')) return;
      event.preventDefault();
      const now = performance.now();
      if (now - wheelLock.current < 450) return;
      wheelLock.current = now;
      const value = current.current;
      if (value.count > 1)
        value.onSelect((value.active + (event.deltaX > 0 ? 1 : -1) + value.count) % value.count);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragged.current = false;
    swipe.current = null;
    if (!event.isPrimary || event.button !== 0) return;
    if (
      (event.target as Element).closest(
        '[data-carousel-live], [data-carousel-ignore], input, select, a',
      )
    )
      return;
    swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    dragged.current = false;
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId) return;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (Math.abs(x) < 32 || Math.abs(x) < Math.abs(y) * 1.4) return;
    dragged.current = true;
    go(x < 0 ? 1 : -1);
  };
  if (!items.length) return null;
  return (
    <div
      ref={root}
      className="lilt-card-carousel"
      data-single={items.length < 2 || undefined}
      data-compact={compact || undefined}
      data-fit-viewport={fitViewport || undefined}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          (event.target as Element).closest(
            '[data-carousel-live], [data-carousel-ignore], input, select',
          )
        )
          return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          go(event.key === 'ArrowRight' ? 1 : -1);
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          onSelect(event.key === 'Home' ? 0 : items.length - 1);
        }
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        swipe.current = null;
      }}
      onClickCapture={(event) => {
        if (dragged.current) {
          event.preventDefault();
          event.stopPropagation();
          dragged.current = false;
        }
      }}
    >
      <div
        className="lilt-card-carousel__stage"
        data-size={items[active]?.size}
        data-fitted={fit ? '' : undefined}
        style={fit ? { height: fit.height + 40 } : undefined}
      >
        {items.map((item, index) => {
          let offset = (index - active + items.length) % items.length;
          if (offset > items.length / 2) offset -= items.length;
          if (Math.abs(offset) > 1) return null;
          const selected = offset === 0;
          return (
            <motion.div
              key={item.id}
              className="lilt-card-carousel__card"
              data-active={selected || undefined}
              data-side={offset < 0 ? 'before' : offset > 0 ? 'after' : undefined}
              data-size={item.size}
              initial={false}
              animate={{
                x: `${offset * 63 * (fit?.scale ?? 1)}%`,
                y: selected ? 0 : 12,
                scale: (selected ? 1 : 0.9) * (fit?.scale ?? 1),
                opacity: selected ? 1 : 0.65,
              }}
              transition={
                reduced ? { duration: 0 } : { type: 'spring', duration: 0.55, bounce: 0.08 }
              }
              style={{ zIndex: selected ? 3 : 1 }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${item.title}, ${index + 1} of ${items.length}`}
            >
              <div
                className="lilt-card-carousel__preview"
                data-carousel-live={selected || undefined}
                data-pending={selected || shown.has(item.id) ? undefined : ''}
                inert={!selected || undefined}
                aria-hidden={!selected || undefined}
              >
                {selected || shown.has(item.id) ? renderItem(index, selected) : null}
              </div>
              {selected ? null : (
                <button
                  type="button"
                  className="lilt-card-carousel__pick"
                  tabIndex={-1}
                  aria-label={`Show ${item.title}`}
                  onClick={() => onSelect(index)}
                />
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="lilt-card-carousel__footer">
        <div className="lilt-card-carousel__navigation">
          <button
            type="button"
            className="lilt-card-carousel__arrow"
            aria-label={`Previous ${label.toLowerCase()}`}
            disabled={items.length < 2}
            onClick={() => go(-1)}
          >
            <Icon icon={ArrowLeft01Icon} size={18} aria-hidden="true" />
          </button>
          <div className="lilt-card-carousel__caption" aria-live="polite" aria-atomic="true">
            <span>{items[active]?.title}</span>
            <span className="lilt-card-carousel__count">
              {String(active + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </span>
          </div>
          <button
            type="button"
            className="lilt-card-carousel__arrow"
            aria-label={`Next ${label.toLowerCase()}`}
            disabled={items.length < 2}
            onClick={() => go(1)}
          >
            <Icon icon={ArrowRight01Icon} size={18} aria-hidden="true" />
          </button>
        </div>
        <div
          className="lilt-card-carousel__dots"
          role="group"
          aria-label={`Choose ${label.toLowerCase()}`}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.title}
              aria-pressed={index === active}
              onClick={() => onSelect(index)}
            >
              <span />
            </button>
          ))}
        </div>
        {footer ? <div className="lilt-card-carousel__extra">{footer}</div> : null}
      </div>
    </div>
  );
}
