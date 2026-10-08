'use client';

import { useEffect, useRef } from 'react';
import { useHomeLook } from '@/components/home/home-look';

/**
 * The story frame's left rail as a level meter: its cells light from violet to pink down to the
 * middle of the reader's screen, a playhead rides the tip, and each section is marked reached as
 * the playhead crosses its line. Scroll-linked only, so it never moves on its own, and coloured
 * by the palette the reader picks in the looks studio.
 */
export function HomeStoryRail() {
  const meter = useRef<HTMLDivElement>(null);
  const { look } = useHomeLook();

  // The track takes the colours of the palette the reader has chosen.
  useEffect(() => {
    meter.current?.parentElement?.setAttribute('data-palette', look.palette);
  }, [look.palette]);

  useEffect(() => {
    const story = meter.current?.parentElement;
    const scroller = story?.closest<HTMLElement>('.lilt-home');
    if (!story || !scroller) return;
    const sections = [...story.querySelectorAll<HTMLElement>(':scope > section')];
    // Reveals that wait for a section to be reached only hide their content once this runs.
    story.setAttribute('data-ready', '');
    let frame = 0;
    const update = () => {
      frame = 0;
      const bounds = story.getBoundingClientRect();
      const reach = scroller.clientHeight * 0.55;
      const head = Math.max(0, Math.min(bounds.height, reach - bounds.top));
      story.style.setProperty('--story-head', `${head}px`);
      story.style.setProperty('--story-progress', (head / bounds.height).toFixed(4));
      for (const section of sections) {
        const reached = section.getBoundingClientRect().top < reach;
        section.toggleAttribute('data-reached', reached);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return (
    <div ref={meter} className="lilt-story-rail" aria-hidden="true">
      <span className="lilt-story-rail__fill" />
      <span className="lilt-story-rail__head" />
    </div>
  );
}
