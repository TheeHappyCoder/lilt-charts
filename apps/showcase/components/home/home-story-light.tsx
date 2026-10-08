'use client';

import { useEffect } from 'react';

/**
 * One delegated listener lights whichever `[data-lit]` frame the pointer is over: its edge catches
 * the light where the pointer is, like a material under a lamp. Nothing moves; only fine pointers
 * that can hover take part.
 */
export function HomeStoryLight() {
  useEffect(() => {
    const story = document.querySelector<HTMLElement>('.lilt-story');
    if (!story || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let lit: HTMLElement | null = null;
    let frame = 0;
    let last: PointerEvent | null = null;
    const update = () => {
      frame = 0;
      if (!last) return;
      const target = (last.target as Element | null)?.closest<HTMLElement>('[data-lit]') ?? null;
      if (target !== lit) {
        lit?.removeAttribute('data-lit-on');
        lit = target;
        lit?.setAttribute('data-lit-on', '');
      }
      if (!lit) return;
      const bounds = lit.getBoundingClientRect();
      lit.style.setProperty('--lit-x', `${last.clientX - bounds.left}px`);
      lit.style.setProperty('--lit-y', `${last.clientY - bounds.top}px`);
    };
    const move = (event: PointerEvent) => {
      // The interaction scenes drive their cards with a demonstration pointer; only people light.
      if (!event.isTrusted || event.pointerType === 'touch') return;
      last = event;
      if (!frame) frame = requestAnimationFrame(update);
    };
    const leave = () => {
      lit?.removeAttribute('data-lit-on');
      lit = null;
    };
    story.addEventListener('pointermove', move, { passive: true });
    story.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      story.removeEventListener('pointermove', move);
      story.removeEventListener('pointerleave', leave);
    };
  }, []);
  return null;
}
