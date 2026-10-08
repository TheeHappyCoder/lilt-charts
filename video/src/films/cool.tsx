import { useEffect, useRef, type ReactNode } from 'react';
import {
  ArcBridgesCard,
  BlockCityCard,
  ChordLoomCard,
  ContourIslandsCard,
  EventHelixCard,
  HexCityCard,
  ParallelRibbonsCard,
  RankRibbonsCard,
  RidgelineCard,
  SkylineCard,
  SpiralYearCard,
  TerrainCard,
  VoxelWaffleCard,
} from '@lilt-ui/charts';
import { Camera, type Shot } from '../kit/camera';
import { Captions } from '../kit/captions';
import { Cursor } from '../kit/cursor';
import { EndCard } from '../kit/end-card';
import { Kick } from '../kit/kick';
import { PropTicker, type PropChange } from '../kit/prop-ticker';
import { useFrameStyle } from '../kit/overlay';
import {
  easeOut,
  film,
  progress,
  setCursor,
  useAfter,
  type Aim,
  type CursorKey,
} from '../kit/runtime';
import { frameAt } from '../kit/stage';
import { Tilt, type TiltKey } from '../kit/tilt';
import {
  customerCloud,
  dailySteps,
  productLeague,
  productProfiles,
  regionSales,
  serverLoad,
  serviceEvents,
  storeRevenue,
  teamHandoffs,
  teamTime,
  weekdayTraffic,
  yearContributions,
} from './cool-data';
import './cool.css';

/**
 * The Cool charts: thirteen families drawn in depth. A year of contributions stands up as a
 * skyline and gets explored by hand; then the camera tours the twelve around it, each loading in
 * as the camera lands, and pulls back to the whole city of charts.
 */

const T = {
  heroReady: 1500,
  /** The drone pass along the skyline ends and the camera pulls back to the whole card. */
  pullBack: 4000,
  /** The wall of the other cards fades up around the hero, nearest first. */
  reveal: 4100,
  sweep: 4700,
  pin: 5350,
  tour: 5900,
  stop: 1500,
  wall: 23900,
  end: 28400,
  done: 32000,
};

/** One stop on the tour: a card, the line of code that names it, and where to hover. */
interface Stop {
  name: string;
  tag: string;
  prop: { name: string; value: string };
  /** Marks to hover once the card has drawn, by aria-label prefix or index. */
  hover: Aim[];
}

const marks = (name: string) => `[data-film="${name}"] .lilt-observations-card__mark`;
/** A mark by the start of its label, aimed at a point that really hits it. */
const mark = (name: string, label: string, fx = 0.5, fy = 0.5): Aim => ({
  el: `${marks(name)}[aria-label^="${label}"]`,
  fx,
  fy,
  hit: true,
});
const nth = (name: string, index: number, fx = 0.5, fy = 0.5): Aim => ({
  el: marks(name),
  nth: index,
  fx,
  fy,
  hit: true,
});

const stops: Stop[] = [
  {
    name: 'contour',
    tag: 'ContourIslandsCard',
    prop: { name: 'weight', value: 'seats' },
    hover: [nth('contour', 4), nth('contour', 40)],
  },
  {
    name: 'blockcity',
    tag: 'BlockCityCard',
    prop: { name: 'y', value: 'region' },
    hover: [mark('blockcity', 'Jun', 0.5, 0.2), mark('blockcity', 'Aug', 0.5, 0.2)],
  },
  {
    name: 'hexcity',
    tag: 'HexCityCard',
    prop: { name: 'group', value: 'region' },
    hover: [mark('hexcity', 'Soho', 0.5, 0.25), mark('hexcity', 'Marais', 0.5, 0.25)],
  },
  {
    name: 'voxel',
    tag: 'VoxelWaffleCard',
    prop: { name: 'category', value: 'work' },
    hover: [nth('voxel', 10), nth('voxel', 70)],
  },
  {
    name: 'terrain',
    tag: 'TerrainCard',
    prop: { name: 'value', value: 'load' },
    hover: [nth('terrain', 30), nth('terrain', 42)],
  },
  {
    name: 'ridgeline',
    tag: 'RidgelineCard',
    prop: { name: 'series', value: 'day' },
    hover: [nth('ridgeline', 14), nth('ridgeline', 110)],
  },
  {
    name: 'spiral',
    tag: 'SpiralYearCard',
    prop: { name: 'date', value: 'date' },
    hover: [nth('spiral', 900), nth('spiral', 560)],
  },
  {
    name: 'helix',
    tag: 'EventHelixCard',
    prop: { name: 'cycle', value: 'day' },
    hover: [nth('helix', 22), nth('helix', 27)],
  },
  {
    name: 'chord',
    tag: 'ChordLoomCard',
    prop: { name: 'source', value: 'from' },
    hover: [nth('chord', 0), nth('chord', 2)],
  },
  {
    name: 'arcs',
    tag: 'ArcBridgesCard',
    prop: { name: 'target', value: 'to' },
    hover: [nth('arcs', 0), nth('arcs', 4)],
  },
  {
    name: 'rank',
    tag: 'RankRibbonsCard',
    prop: { name: 'series', value: 'product' },
    hover: [nth('rank', 17), nth('rank', 18)],
  },
  {
    name: 'parallel',
    tag: 'ParallelRibbonsCard',
    prop: { name: 'label', value: 'product' },
    hover: [nth('parallel', 1), nth('parallel', 7)],
  },
];

const stopAt = (index: number) => T.tour + index * T.stop;
/** Each card holds its skeleton until the camera is nearly there, then draws as it lands. */
const readyAt = (index: number) => stopAt(index) + 200;

// Wall: the skyline in the middle, the tour clockwise around it from its right.
//   chord     arcs      rank     parallel
//   helix     SKYLINE            contour
//   spiral                       blockcity
//   ridgeline terrain   voxel    hexcity
const area: Record<string, string> = {
  contour: '2 / 4',
  blockcity: '3 / 4',
  hexcity: '4 / 4',
  voxel: '4 / 3',
  terrain: '4 / 2',
  ridgeline: '4 / 1',
  spiral: '3 / 1',
  helix: '2 / 1',
  chord: '1 / 1',
  arcs: '1 / 2',
  rank: '1 / 3',
  parallel: '1 / 4',
  skyline: '2 / 2 / 4 / 4',
};

const hero = '[data-film="skyline"]';
const heroCard = `${hero} .lilt-card`;
const cell = (name: string) => `[data-film="${name}"] .lilt-card`;

const shots: Shot[] = [
  // A drone pass: close on the start of the year while the skeleton breathes, then along the
  // city as it rises, back rows first.
  { t: 0, el: `${hero} .lilt-observations-card__plot`, fit: 1.75, fx: 0.25, fy: 0.36 },
  {
    t: T.heroReady + 600,
    el: `${hero} .lilt-observations-card__plot`,
    fit: 1.85,
    fx: 0.27,
    fy: 0.37,
  },
  { t: T.pullBack - 300, el: `${hero} .lilt-observations-card__plot`, fit: 1.95, fx: 0.7, fy: 0.6 },
  // Pull back far enough to read the headline beside the spring's towers.
  { t: T.sweep - 200, el: heroCard, fit: 1.22, fx: 0.4, fy: 0.5, move: 800 },
  { t: T.tour - 60, el: heroCard, fit: 1.26, fx: 0.41, fy: 0.5 },
  ...stops.flatMap((stop, index): Shot[] => [
    {
      t: stopAt(index) + 240,
      between: [index === 0 ? heroCard : cell(stops[index - 1]!.name), cell(stop.name)] as [
        string,
        string,
      ],
      zoom: index === 0 ? 0.42 : 0.78,
      move: 400,
    },
    { t: stopAt(index) + 560, el: cell(stop.name), fit: 0.84, fitHeight: 0.8, dy: 26, move: 320 },
    { t: stopAt(index + 1) - 40, el: cell(stop.name), fit: 0.88, fitHeight: 0.84, dy: 26 },
  ]),
  { t: T.wall + 1800, el: '.cool-wall', fit: 0.9, fitHeight: 0.9, move: 1800 },
  { t: T.done, el: '.cool-wall', fit: 0.82, fitHeight: 0.82, move: 6000 },
];

const tilts: TiltKey[] = [
  { t: 0, rx: 0, rz: 0 },
  { t: T.wall, rx: 0, rz: 0 },
  { t: T.wall + 2000, rx: 24, rz: -9, z: 30, move: 2000 },
  { t: T.done, rx: 30, rz: -12, z: 20, move: 6000 },
];

/** A day on the skyline, aimed at its roof. */
const day = (date: string): Aim => ({
  el: `${marks('skyline')}[aria-label^="${date}:"]`,
  fx: 0.5,
  fy: 0.12,
  hit: true,
});

const cursorKeys: CursorKey[] = [
  { t: 0, at: frameAt(1.15, 1.1) },
  { t: T.sweep - 500, at: frameAt(1.15, 1.1) },
  { t: T.sweep, at: day('2026-03-14'), move: 600 },
  { t: T.sweep + 330, at: day('2026-03-18'), move: 280 },
  { t: T.pin, at: day('2026-03-15'), move: 300 },
  ...stops.flatMap((stop, index): CursorKey[] => [
    { t: stopAt(index) + 1000, at: stop.hover[0]!, move: 700 },
    { t: stopAt(index) + 1420, at: stop.hover[1]!, move: 360 },
  ]),
  { t: T.wall + 300, at: frameAt(1.15, 1.12), move: 600 },
];
const clicks = [{ t: T.pin + 60, hold: 110 }];

const changes: PropChange[] = [
  { t: 1600, tag: 'SkylineCard', name: 'value', value: 'commits' },
  ...stops.map((stop, index) => ({ t: stopAt(index) + 140, tag: stop.tag, ...stop.prop })),
];

// Cards ----------------------------------------------------------------------------------------

const eur = { style: 'currency', currency: 'EUR', notation: 'compact' } as const;
const usd = { style: 'currency', currency: 'USD', notation: 'compact' } as const;

function TourCard({ index }: { index: number }) {
  const stop = stops[index]!;
  const loading = !useAfter(readyAt(index));
  const common = { loading };
  switch (stop.name) {
    case 'blockcity':
      return (
        <BlockCityCard
          {...common}
          title="Sales by region"
          data={regionSales}
          x="month"
          y="region"
          value="sales"
          valueFormat={usd}
        />
      );
    case 'hexcity':
      return (
        <HexCityCard
          {...common}
          title="Store revenue"
          data={storeRevenue}
          label="store"
          value="revenue"
          group="region"
          valueFormat={eur}
        />
      );
    case 'voxel':
      return (
        <VoxelWaffleCard
          {...common}
          title="Where the time went"
          data={teamTime}
          category="work"
          value="hours"
          valueFormat={{ style: 'unit', unit: 'hour' }}
        />
      );
    case 'terrain':
      return (
        <TerrainCard
          {...common}
          title="Server load"
          data={serverLoad}
          x="hour"
          y="day"
          value="load"
          aggregate="max"
          valueFormat={{ style: 'unit', unit: 'percent' }}
        />
      );
    case 'ridgeline':
      return (
        <RidgelineCard
          {...common}
          title="Traffic by hour"
          data={weekdayTraffic}
          series="day"
          x="hour"
          value="visits"
        />
      );
    case 'spiral':
      return (
        <SpiralYearCard
          {...common}
          title="Daily steps"
          data={dailySteps}
          date="date"
          value="steps"
          aggregate="mean"
          valueFormat={{ maximumFractionDigits: 0 }}
        />
      );
    case 'helix':
      return (
        <EventHelixCard
          {...common}
          title="Service activity"
          data={serviceEvents}
          label="event"
          date="at"
          value="requests"
          group="service"
          legend="inline"
        />
      );
    case 'chord':
      return (
        <ChordLoomCard
          {...common}
          title="Team handoffs"
          data={teamHandoffs}
          source="from"
          target="to"
          value="count"
        />
      );
    case 'arcs':
      return (
        <ArcBridgesCard
          {...common}
          title="Workflow handoffs"
          data={teamHandoffs}
          source="from"
          target="to"
          value="count"
          legend="inline"
        />
      );
    case 'rank':
      return (
        <RankRibbonsCard
          {...common}
          title="Product league"
          data={productLeague}
          series="product"
          period="month"
          value="score"
          legend="inline"
        />
      );
    case 'parallel':
      return (
        <ParallelRibbonsCard
          {...common}
          title="Product profiles"
          data={productProfiles}
          label="product"
          metrics={['speed', 'quality', 'cost', 'reach']}
          metricLabels={{ speed: 'Speed', quality: 'Quality', cost: 'Cost', reach: 'Reach' }}
          legend="inline"
        />
      );
    default:
      return (
        <ContourIslandsCard
          {...common}
          title="Seats behind the activity"
          data={customerCloud}
          label="account"
          x="sessions"
          y="actions"
          weight="seats"
        />
      );
  }
}

function HeroCard() {
  const ready = useAfter(T.heroReady);
  return (
    <SkylineCard
      title="Contributions"
      data={yearContributions}
      date="date"
      value="commits"
      from="2025-10-08"
      to="2026-10-07"
      today="2026-10-07"
      height={600}
      loading={!ready}
    />
  );
}

/** Every card but the hero waits in the dark, then fades up around it, nearest first. */
function Cell({ name, children }: { name: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const index = stops.findIndex((stop) => stop.name === name);
  const ring = index === -1 ? 0 : Math.min(index, stops.length - index);
  useFrameStyle(ref, (t, element) => {
    if (index === -1) return;
    const k = easeOut(progress(t, T.reveal + ring * 70, T.reveal + ring * 70 + 700));
    element.style.opacity = String(k);
    element.style.transform = k < 1 ? `translate3d(0, ${(1 - k) * 24}px, 0)` : '';
  });
  return (
    <div className="cool-cell" data-film={name} ref={ref} style={{ gridArea: area[name] }}>
      {children}
    </div>
  );
}

const beats = [
  T.heroReady,
  T.pullBack,
  T.pin + 60,
  ...stops.map((_, index) => readyAt(index)),
  T.wall + 2000,
];

export function CoolFilm() {
  useEffect(() => {
    film.duration = T.done;
    setCursor(cursorKeys, clicks);
  }, []);

  return (
    <main className="film cool">
      <div className="film-light" aria-hidden />
      <Kick beats={beats} amount={0.012}>
        <Tilt keys={tilts}>
          <Camera shots={shots} width={2800} height={2600}>
            <div className="cool-wall" data-theme="dark">
              <Cell name="skyline">
                <HeroCard />
              </Cell>
              {stops.map((stop, index) => (
                <Cell name={stop.name} key={stop.name}>
                  <TourCard index={index} />
                </Cell>
              ))}
            </div>
          </Camera>
        </Tilt>
      </Kick>
      <PropTicker changes={changes} show={[1600, T.wall + 200]} />
      <Captions
        lines={[
          { from: 300, to: 1500, text: 'Charts, drawn in depth.' },
          { from: T.wall + 1300, to: T.end - 100, text: 'Thirteen charts you can walk around.' },
        ]}
      />
      <EndCard from={T.end} line="Thirteen new ways to see your data." />
      <Cursor />
    </main>
  );
}
