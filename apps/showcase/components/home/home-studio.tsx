'use client';

import PlayIcon from '@hugeicons/core-free-icons/PlayIcon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import {
  type ChartBarAppearance,
  type ChartLoadingStyle,
  type ChartPalette,
  type ChartSurface,
} from '@lilt-ui/charts';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { CardExamplePreview } from '@/components/docs/card-example-preview';
import { RevealTitle } from '@/components/home/home-reveal-title';
import { StoryIndex } from '@/components/home/home-story-index';
import { BlurFade } from '@/components/motion/blur-fade';
import { Segmented } from '@/components/ui/segmented';
import { useHomeLook } from '@/components/home/home-look';
import { HERO_LOOK, heroWithLook, type HeroLook } from '@/lib/home-hero';

type Look = HeroLook;
type LookKey = keyof Look;

/** The card's own defaults; the code shows only what differs from them. */
const DEFAULTS: Look = { palette: 'iris', barStyle: 'solid', depth: false, surface: 'elevated' };
const LOADS: readonly ChartLoadingStyle[] = ['breathe', 'draw', 'shimmer'];
const LOAD_TIME = 2400;

const swatches: Record<ChartPalette, [string, string]> = {
  iris: ['#7c5cff', '#e5489c'],
  cobalt: ['#2f6fed', '#0fb3d3'],
  emerald: ['#0e9a77', '#84cc16'],
};

interface Step {
  title: string;
  body: string;
  /** The prop this step owns, and what the card shows once the reader scrolls to it. */
  owns?: { key: LookKey; value: Look[LookKey] };
}

const steps: readonly Step[] = [
  {
    title: 'Palette',
    body: 'Three palettes, each tuned for light and dark. Series take their colours in order.',
    owns: { key: 'palette', value: 'emerald' },
  },
  {
    title: 'Bar style',
    body: 'Cells, like the level meter it arrived as, or solid, a fade or a line.',
    owns: { key: 'barStyle', value: 'solid' },
  },
  {
    title: 'Depth',
    body: 'One word stands the bars up in 3D, lit from one side, and hover still lands exactly.',
    owns: { key: 'depth', value: true },
  },
  {
    title: 'Surface',
    // Raised reads best here, so scrolling leaves it; the control is there to try the others.
    body: 'Raised, outlined or ghost, so the card sits on whatever page you put it on.',
  },
  {
    title: 'Loading',
    body: 'A first load breathes, draws or shimmers, then the data lands on that same card.',
  },
];

/** The card as a reader would write it, with every prop that differs from the default marked. */
function codeTokens(look: Look, loadingStyle: ChartLoadingStyle | null) {
  const changed = (key: LookKey) => look[key] !== DEFAULTS[key];
  return [
    { text: '<BarChartCard' },
    { text: 'data={sales}' },
    { text: 'x="date"' },
    { text: 'series={series}' },
    { text: 'stack' },
    ...(changed('palette') ? [{ text: `palette="${look.palette}"`, changed: true }] : []),
    ...(changed('barStyle') && !look.depth
      ? [{ text: `barStyle="${look.barStyle}"`, changed: true }]
      : []),
    ...(look.depth ? [{ text: 'depth', changed: true }] : []),
    ...(changed('surface') ? [{ text: `surface="${look.surface}"`, changed: true }] : []),
    ...(loadingStyle && loadingStyle !== 'shimmer'
      ? [{ text: `loadingStyle="${loadingStyle}"`, changed: true }]
      : []),
    { text: '/>' },
  ];
}

/** The step whose top has crossed the reading line; -1 above the first. */
function useActiveStep(
  list: RefObject<HTMLOListElement | null>,
  stage: RefObject<HTMLDivElement | null>,
) {
  const [active, setActive] = useState(-1);
  useEffect(() => {
    const element = list.current;
    const scroller = element?.closest<HTMLElement>('.lilt-home');
    if (!element || !scroller) return;
    const items = [...element.children] as HTMLElement[];
    const narrow = window.matchMedia('(max-width: 900px)');
    let frame = 0;
    const update = () => {
      frame = 0;
      const height = scroller.clientHeight;
      // On a phone the card is pinned above the steps, so the line sits in the space below it.
      const below = narrow.matches ? (stage.current?.getBoundingClientRect().bottom ?? 0) : 0;
      const line = below + (height - below) * 0.5;
      let next = -1;
      items.forEach((item, index) => {
        if (item.getBoundingClientRect().top < line) next = index;
      });
      setActive(next);
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
  }, [list, stage]);
  return active;
}

/**
 * "One chart, every look", told by scrolling: the card stays pinned while each step restyles it
 * with one prop, and the line of code under it grows to match. Every step keeps its own control,
 * and a reader's own choice wins over the scroll.
 */
export function HomeStudio() {
  const list = useRef<HTMLOListElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const active = useActiveStep(list, stage);
  const { setLook } = useHomeLook();
  const [chosen, setChosen] = useState<Partial<Look>>({});
  const [loadingStyle, setLoadingStyle] = useState<ChartLoadingStyle>('breathe');
  const [loading, setLoading] = useState(false);
  // A card that already has data treats loading as a refresh and shows a quiet "Updating" note.
  // A press here shows a first load instead, so it starts a fresh card; the data then lands on
  // that same card, which is the real handover.
  const [mount, setMount] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const look = { ...HERO_LOOK };
  steps.forEach((step, index) => {
    if (step.owns && index <= active) Object.assign(look, { [step.owns.key]: step.owns.value });
  });
  Object.assign(look, chosen);
  // The rest of the page carries whatever look the reader leaves the studio with.
  const { palette, barStyle, depth, surface } = look;
  useEffect(() => {
    setLook({ palette, barStyle, depth, surface });
  }, [setLook, palette, barStyle, depth, surface]);
  const choose = <Key extends LookKey>(key: Key, value: Look[Key]) =>
    setChosen((current) => ({ ...current, [key]: value }));

  const playLoad = (style = loadingStyle) => {
    window.clearTimeout(timer.current);
    setLoadingStyle(style);
    if (!loading) setMount((count) => count + 1);
    setLoading(true);
    timer.current = window.setTimeout(() => setLoading(false), LOAD_TIME);
  };

  // Reaching the last step plays a load once each time it is reached.
  const loadStep = steps.length - 1;
  const reachedLoad = useRef(false);
  useEffect(() => {
    if (active === loadStep && !reachedLoad.current) {
      reachedLoad.current = true;
      playLoad();
    }
    if (active < loadStep) reachedLoad.current = false;
    // playLoad reads the latest state when it runs; only reaching the step should trigger it.
  }, [active]);

  const controls: readonly ReactNode[] = [
    <div key="palette" className="lilt-story-swatches" role="radiogroup" aria-label="Palette">
      {(Object.keys(swatches) as ChartPalette[]).map((palette) => (
        <button
          key={palette}
          type="button"
          role="radio"
          aria-checked={look.palette === palette}
          aria-label={`${palette} palette`}
          className="lilt-story-swatch"
          onClick={() => choose('palette', palette)}
          style={{
            background: `linear-gradient(135deg, ${swatches[palette][0]} 50%, ${swatches[palette][1]} 50%)`,
          }}
        />
      ))}
    </div>,
    <Segmented
      key="bar"
      label="Bar style"
      value={look.barStyle}
      options={[
        { value: 'solid', label: 'Solid' },
        { value: 'segmented', label: 'Cells' },
        { value: 'gradient', label: 'Fade' },
        { value: 'outline', label: 'Line' },
      ]}
      onChange={(value) =>
        setChosen((current) => ({
          ...current,
          barStyle: value as ChartBarAppearance,
          depth: false,
        }))
      }
    />,
    <Segmented
      key="depth"
      label="Depth"
      value={look.depth ? '3d' : 'flat'}
      options={[
        { value: 'flat', label: 'Flat' },
        { value: '3d', label: '3D' },
      ]}
      onChange={(value) => choose('depth', value === '3d')}
    />,
    <Segmented
      key="surface"
      label="Surface"
      value={look.surface}
      options={[
        { value: 'elevated', label: 'Raised' },
        { value: 'outline', label: 'Outline' },
        { value: 'ghost', label: 'Ghost' },
      ]}
      onChange={(value) => choose('surface', value as ChartSurface)}
    />,
    <div key="load" className="lilt-story-step__load">
      <Segmented
        label="Loading style"
        value={loadingStyle}
        options={LOADS.map((style) => ({
          value: style,
          label: style[0]!.toUpperCase() + style.slice(1),
        }))}
        onChange={(value) => playLoad(value as ChartLoadingStyle)}
      />
      <button
        type="button"
        className="lilt-story-play"
        onClick={() => playLoad()}
        aria-pressed={loading}
        aria-label={`Play a ${loadingStyle} load`}
      >
        <Icon icon={PlayIcon} size={14} strokeWidth={2} aria-hidden="true" />
        Replay
      </button>
    </div>,
  ];

  return (
    <section className="lilt-story-studio" aria-labelledby="studio-title">
      <StoryIndex>The looks</StoryIndex>
      <div className="lilt-story-head">
        <RevealTitle id="studio-title">
          One chart.
          <br />
          Every <em>look.</em>
        </RevealTitle>
        <BlurFade trigger="scroll" delay={120}>
          <p className="lilt-story-lede">
            Scroll, and the card restyles itself. Every step is one prop, and every control is yours
            to play with.
          </p>
        </BlurFade>
      </div>

      <div className="lilt-story-studio__scrolly">
        <ol ref={list} className="lilt-story-steps">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="lilt-story-step"
              data-active={index === active || undefined}
              data-past={index < active || undefined}
            >
              <span className="lilt-story-step__count">
                {String(index + 1).padStart(2, '0')}
                <i aria-hidden="true" />
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              {controls[index]}
            </li>
          ))}
        </ol>

        <div
          ref={stage}
          className="lilt-story-studio__stage"
          data-palette={look.palette}
          data-depth={look.depth || undefined}
        >
          <span className="lilt-story-studio__light" aria-hidden="true" />
          <div data-flight-slot="studio" data-lit className="lilt-story-studio__card">
            <CardExamplePreview
              key={mount}
              example={heroWithLook(look, { loading, loadingStyle })}
            />
          </div>
          <span className="lilt-story-studio__floor" aria-hidden="true" />
          <div className="lilt-story-codeline">
            <div className="lilt-story-codeline__bar" aria-hidden="true">
              <span>sales.tsx</span>
              <span className="lilt-story-codeline__steps">
                {steps.map((step, index) => (
                  <i key={step.title} data-on={index <= active || undefined} />
                ))}
              </span>
            </div>
            <code aria-label="The code for this card">
              {codeTokens(look, active >= loadStep || mount > 0 ? loadingStyle : null).map(
                (token) => (
                  <span key={token.text} data-changed={token.changed || undefined}>
                    {token.text}
                  </span>
                ),
              )}
              <span className="lilt-story-codeline__caret" aria-hidden="true" />
            </code>
          </div>
        </div>
      </div>
    </section>
  );
}
