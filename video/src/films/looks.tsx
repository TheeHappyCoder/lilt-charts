import { useEffect, type ReactNode } from 'react';
import {
  AreaChartCard,
  BarChartCard,
  FunnelChartCard,
  HorizontalBarChartCard,
  LineChartCard,
  ProgressCard,
  RadialChartCard,
  SlopeChartCard,
  StatCard,
  type ChartAxisStyle,
  type ChartBackground,
  type ChartBarAppearance,
  type ChartHoverStyle,
  type ChartPalette,
  type ChartSurface,
} from '@lilt-ui/charts';
import { Camera, type Shot } from '../kit/camera';
import { Captions } from '../kit/captions';
import { Cursor } from '../kit/cursor';
import { EndCard } from '../kit/end-card';
import { Kick } from '../kit/kick';
import { PropTicker, type PropChange } from '../kit/prop-ticker';
import { film, setCursor, useAfter, useCueIndex, type CursorKey } from '../kit/runtime';
import { frameAt } from '../kit/stage';
import { Tilt, type TiltKey } from '../kit/tilt';
import {
  channelRevenue,
  dailyKpis,
  dailySessions,
  orders,
  regionRevenue,
  signupFunnel,
  visitors,
} from '../data';
import './looks.css';

/**
 * One component, every look. An Orders card changes one prop on every beat (120 BPM), lingers on
 * the bar styles, lands on 3D and flips theme. Then the camera hops around it to eight other
 * chart families, each running through its own variants, and pulls back to the whole wall.
 */

// Main card ------------------------------------------------------------------------------------

interface Look {
  palette: ChartPalette;
  surface: ChartSurface;
  background: ChartBackground;
  axis: ChartAxisStyle;
  barStyle: ChartBarAppearance;
  stack: boolean | 'percent';
  theme: 'dark' | 'light';
  hoverStyle: ChartHoverStyle;
}

const base: Look = {
  palette: 'iris',
  surface: 'elevated',
  background: 'dots',
  axis: 'minimal',
  barStyle: 'solid',
  stack: false,
  theme: 'dark',
  hoverStyle: 'soft',
};

const T = {
  ready: 500,
  depth: 11900,
  light: 12900,
  hoverIn: 13200,
  hoverOut: 14700,
  tour: 15000,
  stop: 1500,
  wall: 27000,
  depthWave: 28200,
  end: 30600,
  done: 34200,
};

type Step = { t: number; look: Partial<Look>; prop: Omit<PropChange, 't'> };

const steps: Step[] = [
  { t: 2400, look: { palette: 'cobalt' }, prop: { name: 'palette', value: 'cobalt' } },
  { t: 2900, look: { palette: 'emerald' }, prop: { name: 'palette', value: 'emerald' } },
  { t: 3400, look: { palette: 'iris' }, prop: { name: 'palette', value: 'iris' } },
  { t: 3900, look: { surface: 'outline' }, prop: { name: 'surface', value: 'outline' } },
  { t: 4400, look: { surface: 'elevated' }, prop: { name: 'surface', value: 'elevated' } },
  { t: 4900, look: { background: 'grid' }, prop: { name: 'background', value: 'grid' } },
  { t: 5400, look: { background: 'dots' }, prop: { name: 'background', value: 'dots' } },
  { t: 5900, look: { axis: 'classic' }, prop: { name: 'axis', value: 'classic' } },
  { t: 6400, look: { axis: 'minimal' }, prop: { name: 'axis', value: 'minimal' } },
  // The bar styles get two beats each: they're the show.
  { t: 6900, look: { barStyle: 'gradient' }, prop: { name: 'barStyle', value: 'gradient' } },
  { t: 7900, look: { barStyle: 'outline' }, prop: { name: 'barStyle', value: 'outline' } },
  { t: 8900, look: { barStyle: 'segmented' }, prop: { name: 'barStyle', value: 'segmented' } },
  { t: 9900, look: { barStyle: 'needle' }, prop: { name: 'barStyle', value: 'needle' } },
  { t: 10400, look: { barStyle: 'gradient', stack: true }, prop: { name: 'stack' } },
  { t: 10900, look: { barStyle: 'segmented' }, prop: { name: 'barStyle', value: 'segmented' } },
  {
    t: 11400,
    look: { barStyle: 'solid', stack: false },
    prop: { name: 'barStyle', value: 'solid' },
  },
  { t: T.depth, look: { barStyle: 'isometric' }, prop: { name: 'depth' } },
  {
    t: T.light,
    look: { theme: 'light' },
    prop: { tag: 'html', name: 'data-theme', value: 'light' },
  },
  { t: 13700, look: { hoverStyle: 'solid' }, prop: { name: 'hoverStyle', value: 'solid' } },
  { t: 14200, look: { hoverStyle: 'accent' }, prop: { name: 'hoverStyle', value: 'accent' } },
  {
    t: T.hoverOut,
    look: { theme: 'dark', hoverStyle: 'soft' },
    prop: { tag: 'html', name: 'data-theme', value: 'dark' },
  },
];
const stepTimes = steps.map((step) => step.t);
const looks = steps.reduce<Look[]>(
  (list, step) => [...list, { ...list[list.length - 1]!, ...step.look }],
  [base],
);

// The tour -------------------------------------------------------------------------------------

/** One stop: a card and the variants it runs through after the one it starts in. */
interface Stop {
  name: string;
  tag: string;
  prop: string;
  /** How the card starts, as the ticker prints it on arrival. */
  start: { name?: string; value?: string };
  /** Each later beat: a value, or `null` for a bare flag. `name` overrides the prop. */
  values: { value: string | null; name?: string }[];
  theme?: 'light';
}

const stops: Stop[] = [
  {
    name: 'radial',
    tag: 'RadialChartCard',
    prop: 'variant',
    start: { value: 'donut' },
    values: [{ value: 'pie' }, { value: 'semi' }, { value: 'rings' }],
  },
  {
    name: 'stat',
    tag: 'StatCard',
    prop: 'chart',
    start: { value: 'area' },
    values: [{ value: 'line' }, { value: 'bars' }, { value: 'ring' }],
  },
  {
    name: 'progress',
    tag: 'ProgressCard',
    prop: 'variant',
    start: { value: 'ring' },
    values: [{ value: 'thick' }, { value: 'gauge' }],
    theme: 'light',
  },
  {
    name: 'line',
    tag: 'LineChartCard',
    prop: 'curve',
    start: { value: 'smooth' },
    values: [{ value: 'linear' }, { value: 'step' }],
  },
  {
    name: 'hbar',
    tag: 'HorizontalBarChartCard',
    prop: 'barStyle',
    start: { value: 'inline' },
    values: [{ value: 'track' }, { value: 'isometric' }],
    theme: 'light',
  },
  {
    name: 'funnel',
    tag: 'FunnelChartCard',
    prop: 'curve',
    start: { value: 'smooth' },
    values: [{ value: 'linear' }, { name: 'colors', value: 'single' }],
  },
  {
    name: 'slope',
    tag: 'SlopeChartCard',
    prop: 'variant',
    start: { value: 'slope' },
    values: [{ value: 'dumbbell' }],
    theme: 'light',
  },
  {
    name: 'area',
    tag: 'AreaChartCard',
    prop: 'stack',
    start: { name: 'curve', value: 'smooth' },
    values: [{ value: null }, { value: 'percent' }],
  },
];
const stopAt = (index: number) => T.tour + index * T.stop;
/** Beats inside a stop: the camera lands around +500, then a change every 330–480ms. */
const beatsFor = (index: number) => {
  const count = stops[index]!.values.length;
  const gap = count >= 3 ? 330 : 480;
  return stops[index]!.values.map((_, i) => stopAt(index) + 600 + i * gap);
};

const changes: PropChange[] = [
  ...steps.map((step) => ({ t: step.t, ...step.prop })),
  ...stops.flatMap((stop, index): PropChange[] => [
    // Arriving names the card's current form.
    {
      t: stopAt(index) + 140,
      tag: stop.tag,
      name: stop.start.name ?? stop.prop,
      value: stop.start.value,
    },
    ...stop.values.map((beat, i) => ({
      t: beatsFor(index)[i]!,
      tag: stop.tag,
      name: beat.name ?? stop.prop,
      value: beat.value ?? undefined,
    })),
  ]),
];

// Wall layout: the main card in the middle, the tour around it.
//   line     progress  stat
//   hbar     MAIN      radial
//   funnel   slope     area
const grid = ['line', 'progress', 'stat', 'hbar', 'main', 'radial', 'funnel', 'slope', 'area'];

/** Depth arrives across the wall, the nearest cards first. */
const depthDelay: Record<string, number> = {
  progress: 0,
  hbar: 0,
  radial: 0,
  slope: 0,
  line: 260,
  stat: 260,
  funnel: 260,
  area: 260,
};

const series = [
  { key: 'online', label: 'Online' },
  { key: 'retail', label: 'Retail' },
] as const;
const ordersData = orders.slice(-8);
const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;
const recentKpis = dailyKpis.slice(-14);

const main = '[data-film="main"]';
const cell = (name: string) => `[data-film="${name}"] .lilt-card`;

const shots: Shot[] = [
  { t: 0, el: `${main} .lilt-card`, fit: 0.86, dy: 26 },
  { t: T.depth - 200, el: `${main} .lilt-card`, fit: 0.86, dy: 26 },
  { t: T.depth + 300, el: `${main} .lilt-card__chart`, fit: 1.0, dy: 10, move: 500 },
  { t: T.light - 50, el: `${main} .lilt-card__chart`, fit: 1.04, dy: 10 },
  { t: T.light + 350, el: `${main} .lilt-card`, fit: 0.86, dy: 26, move: 400 },
  { t: T.tour, el: `${main} .lilt-card`, fit: 0.86, dy: 26 },
  ...stops.flatMap((stop, index): Shot[] => [
    {
      t: stopAt(index) + 240,
      between: [index === 0 ? `${main} .lilt-card` : cell(stops[index - 1]!.name), cell(stop.name)],
      zoom: 0.8,
      move: 400,
    },
    { t: stopAt(index) + 560, el: cell(stop.name), fit: 0.82, fitHeight: 0.8, dy: 22, move: 320 },
    { t: stopAt(index + 1) - 40, el: cell(stop.name), fit: 0.86, fitHeight: 0.84, dy: 22 },
  ]),
  { t: T.wall + 1800, el: '.looks-wall', fit: 0.86, fitHeight: 0.86, move: 1800 },
  { t: T.done, el: '.looks-wall', fit: 0.78, fitHeight: 0.78, move: 5000 },
];

const tilts: TiltKey[] = [
  { t: 0, rx: 0, rz: 0 },
  { t: T.wall, rx: 0, rz: 0 },
  { t: T.wall + 2000, rx: 20, rz: -7, z: 30, move: 2000 },
  { t: T.done, rx: 27, rz: -10, z: 20, move: 4800 },
];

const bar = (fx: number, fy: number) => ({ el: `${main} .lilt-card__chart`, fx, fy });
const cursorKeys: CursorKey[] = [
  { t: 0, at: frameAt(1.15, 1.1) },
  { t: T.hoverIn - 600, at: frameAt(1.15, 1.1) },
  { t: T.hoverIn, at: bar(0.62, 0.55), move: 600 },
  { t: T.hoverIn + 600, at: bar(0.74, 0.5), move: 500 },
  { t: 14000, at: bar(0.86, 0.45), move: 500 },
  { t: T.hoverOut - 100, at: bar(0.92, 0.42), move: 500 },
  { t: T.hoverOut + 500, at: frameAt(1.15, 1.12), move: 500 },
];

// Cards ----------------------------------------------------------------------------------------

function Themed({ theme, children }: { theme: 'dark' | 'light'; children: ReactNode }) {
  return (
    <div className="looks-theme" data-theme={theme}>
      {children}
    </div>
  );
}

function MainCard() {
  const ready = useAfter(T.ready);
  const look = looks[useCueIndex(stepTimes) + 1]!;
  return (
    <Themed theme={look.theme}>
      <BarChartCard
        title="Orders"
        data={ordersData}
        x="month"
        series={series}
        delta={0.143}
        range="Last 8 months"
        palette={look.palette}
        surface={look.surface}
        background={look.background}
        axis={look.axis}
        barStyle={look.barStyle}
        stack={look.stack}
        depth={look.barStyle === 'isometric'}
        hoverStyle={look.hoverStyle}
        height={250}
        loading={!ready}
      />
    </Themed>
  );
}

/** A tour card: its variant follows the stop's beats; depth arrives with the wall's wave. */
function TourCard({ index }: { index: number }) {
  const stop = stops[index]!;
  const step = useCueIndex(beatsFor(index)) + 1;
  const depth = useAfter(T.depthWave + depthDelay[stop.name]!);
  const value = step === 0 ? stop.start.value : (stop.values[step - 1]!.value ?? undefined);
  let card: ReactNode;
  switch (stop.name) {
    case 'radial':
      card = (
        <RadialChartCard
          title="Revenue by channel"
          data={channelRevenue}
          category="channel"
          value="revenue"
          valueFormat={usd}
          legend="inline"
          variant={value as 'donut' | 'pie' | 'semi' | 'rings'}
          depth={depth}
        />
      );
      break;
    case 'stat':
      card = (
        <StatCard
          title="Orders"
          data={recentKpis}
          value="orders"
          x="date"
          chart={value as 'area' | 'line' | 'bars' | 'ring'}
          target={value === 'ring' ? 2400 : undefined}
          delta={0.153}
          caption="vs last month"
          height={200}
          depth={depth}
        />
      );
      break;
    case 'progress':
      card = (
        <ProgressCard
          title="Visitors"
          value={1260}
          target={2000}
          range="Last 7 days"
          variant={value as 'ring' | 'thick' | 'gauge'}
          depth={depth}
        />
      );
      break;
    case 'line':
      card = (
        <LineChartCard
          title="Active users"
          data={dailySessions}
          x="date"
          series={[
            { key: 'desktop', label: 'Desktop' },
            { key: 'mobile', label: 'Mobile' },
          ]}
          delta={0.126}
          curve={value as 'smooth' | 'linear' | 'step'}
          height={220}
          depth={depth}
        />
      );
      break;
    case 'hbar':
      card = (
        <HorizontalBarChartCard
          title="Revenue by channel"
          data={channelRevenue}
          category="channel"
          value="revenue"
          valueFormat={usd}
          barStyle={depth ? 'isometric' : (value as 'inline' | 'track' | 'isometric')}
          depth={depth || value === 'isometric'}
        />
      );
      break;
    case 'funnel':
      card = (
        <FunnelChartCard
          title="Sign-up funnel"
          data={signupFunnel}
          category="stage"
          value="people"
          delta={0.052}
          curve={step >= 1 ? 'linear' : 'smooth'}
          colors={step >= 2 ? 'single' : 'stages'}
          depth={depth}
        />
      );
      break;
    case 'slope':
      card = (
        <SlopeChartCard
          title="Revenue by region"
          data={regionRevenue}
          category="region"
          from="lastYear"
          to="thisYear"
          fromLabel="Last year"
          toLabel="This year"
          valueFormat={usd}
          variant={value as 'slope' | 'dumbbell'}
          depth={depth}
        />
      );
      break;
    default:
      card = (
        <AreaChartCard
          title="Visitors"
          data={visitors}
          x="month"
          series={[
            { key: 'organic', label: 'Organic' },
            { key: 'referral', label: 'Referral' },
            { key: 'paid', label: 'Paid' },
          ]}
          delta={0.118}
          stack={step === 0 ? false : step === 1 ? true : 'percent'}
          height={220}
          depth={depth}
        />
      );
  }
  return <Themed theme={stop.theme ?? 'dark'}>{card}</Themed>;
}

const beats = [T.ready, ...changes.map((change) => change.t), T.depthWave, T.depthWave + 260];

export function LooksFilm() {
  const stage = useCueIndex([T.light, T.hoverOut]);

  useEffect(() => {
    film.duration = T.done;
    setCursor(cursorKeys);
  }, []);

  return (
    <main className="film looks" data-stage={stage === 0 ? 'light' : 'dark'}>
      <div className="film-light" aria-hidden />
      <Kick beats={beats}>
        <Tilt keys={tilts}>
          <Camera shots={shots} width={1900} height={1900}>
            <div className="looks-wall">
              {grid.map((name) => (
                <div className="looks-cell" data-film={name} key={name}>
                  {name === 'main' ? (
                    <MainCard />
                  ) : (
                    <TourCard index={stops.findIndex((stop) => stop.name === name)} />
                  )}
                </div>
              ))}
            </div>
          </Camera>
        </Tilt>
      </Kick>
      <PropTicker changes={changes} show={[2250, T.wall + 200]} />
      <Captions
        lines={[
          { from: 700, to: 2200, text: 'One component.' },
          { from: T.wall + 1200, to: T.end - 100, text: 'Every chart. Every look.' },
        ]}
      />
      <EndCard from={T.end} line="One component. Every look." />
      <Cursor />
    </main>
  );
}
