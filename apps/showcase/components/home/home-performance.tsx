'use client';

import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import { AnimatedNumber, AreaChartCard } from '@lilt-ui/charts';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HomeSheet } from '@/components/home/home-sheet';
import { RevealTitle } from '@/components/home/home-reveal-title';
import { StoryIndex } from '@/components/home/home-story-index';
import { BlurFade } from '@/components/motion/blur-fade';

const MINUTE = 60_000;
const POINTS = 100_800;
const count = new Intl.NumberFormat('en-US');

/** Flows the figure up from zero the first time it comes into view, using Lilt's own numbers. */
function RollingCount() {
  const ref = useRef<HTMLParagraphElement>(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return setValue(POINTS);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setValue(POINTS);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <p
      ref={ref}
      className="lilt-story-band__number"
      role="img"
      aria-label={`${count.format(POINTS)} points`}
    >
      {/* Violet beneath, rose above it fading downwards: one gradient, drawn by two counts that
          move in step, so no text clipping is needed over NumberFlow's animated digits. */}
      <span className="lilt-story-band__digits">
        <AnimatedNumber value={value} format={count} variant="flow" />
      </span>
      <span className="lilt-story-band__digits" data-tint aria-hidden="true">
        <AnimatedNumber value={value} format={count} variant="flow" />
      </span>
    </p>
  );
}

/**
 * Ten weeks of requests per minute with a shape worth reading at a glance: steady growth, quiet
 * weekends, a launch that lifts the baseline for good, and one short incident. The daily rhythm
 * and minute-to-minute noise stay as texture, which is what a hundred thousand rows look like.
 */
function requests() {
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const start = Date.UTC(2026, 6, 20);
  const smoothstep = (from: number, to: number, value: number) => {
    const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
    return t * t * (3 - 2 * t);
  };
  return Array.from({ length: POINTS }, (_, index) => {
    const time = start + index * MINUTE;
    const u = index / POINTS;
    const day = (index / 1440) % 1;
    const weekday = new Date(time).getUTCDay();
    const daily = 0.96 + 0.04 * Math.sin((day - 0.3) * Math.PI * 2);
    const weekly = weekday === 0 || weekday === 6 ? 0.91 : 1;
    const growth = 1 + 0.9 * u + 0.55 * smoothstep(0.58, 0.64, u);
    const incident = index > 74_000 && index < 74_400 ? 1.45 : 1;
    return {
      time: new Date(time),
      requests: Math.round(1400 * daily * weekly * growth * incident * (0.97 + next() * 0.06)),
    };
  });
}

/** Frames per second while the pointer is on the chart, from the browser's own frame clock. */
function useFrameRate() {
  const [fps, setFps] = useState<number | null>(null);
  const frame = useRef(0);
  const live = useRef(false);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const start = () => {
    if (live.current) return;
    live.current = true;
    let frames = 0;
    let since = performance.now();
    const tick = (now: number) => {
      frames += 1;
      if (now - since >= 500) {
        setFps(Math.round((frames * 1000) / (now - since)));
        frames = 0;
        since = now;
      }
      if (live.current) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };
  const stop = () => {
    live.current = false;
    cancelAnimationFrame(frame.current);
  };
  return { fps, start, stop };
}

/**
 * A hundred thousand points on one card, smooth to scrub, with the frame rate the reader's own
 * browser reaches while they do.
 */
export function HomePerformance() {
  const data = useMemo(requests, []);
  const { fps, start, stop } = useFrameRate();
  return (
    <section className="lilt-story-band" aria-labelledby="band-title">
      <StoryIndex>Scale</StoryIndex>
      <div className="lilt-story-band__head">
        <BlurFade trigger="scroll">
          <p className="lilt-story-overline">And when your data grows?</p>
        </BlurFade>
        <div className="lilt-story-band__figure">
          <span className="lilt-story-band__glow" aria-hidden="true" />
          <RollingCount />
        </div>
        <RevealTitle id="band-title" className="lilt-story-band__title">
          points. Still a light touch.
        </RevealTitle>
      </div>
      <div data-rise>
        <HomeSheet
          className="lilt-story-band__sheet"
          notch={
            <div className="lilt-story-meter" data-live={fps !== null || undefined}>
              <span className="lilt-story-meter__dot" aria-hidden="true" />
              <span className="lilt-story-meter__label">Your browser</span>
              <strong aria-live="off">
                {fps === null ? (
                  'Hover the chart'
                ) : (
                  <>
                    <AnimatedNumber value={fps} variant="flow" format={count} /> fps
                  </>
                )}
              </strong>
            </div>
          }
        >
          <div
            className="lilt-story-band__chart"
            data-lit
            onPointerEnter={start}
            onPointerLeave={stop}
            onFocusCapture={start}
            onBlurCapture={stop}
          >
            <AreaChartCard
              title="Requests per minute"
              data={data}
              x="time"
              series={[{ key: 'requests', label: 'Requests' }]}
              aggregate="mean"
              valueFormat={{ maximumFractionDigits: 0 }}
              tiles={false}
              surface="ghost"
              background="none"
              height={260}
            />
          </div>
          <dl className="lilt-story-facts">
            <div>
              <dt>Rows</dt>
              <dd>{count.format(POINTS)}</dd>
            </div>
            <div>
              <dt>Drawn</dt>
              <dd>4 per pixel</dd>
            </div>
            <div>
              <dt>Inspected</dt>
              <dd>Every row</dd>
            </div>
            <div>
              <dt>Span</dt>
              <dd>10 weeks</dd>
            </div>
          </dl>
        </HomeSheet>
      </div>
      <div className="lilt-story-band__foot">
        <p>
          Ten weeks. Every minute. A launch in week six, one incident after. Scrub through it.
          <br />
          The area draws four points per pixel; hover, keys and exports keep every row.
        </p>
        <Link href="/features/performance" className="lilt-story-link">
          Run the benchmark
          <Icon icon={ArrowRight02Icon} aria-hidden="true" size={15} />
        </Link>
      </div>
    </section>
  );
}
