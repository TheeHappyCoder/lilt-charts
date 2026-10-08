import { useEffect, useRef, type ReactNode } from 'react';
import {
  CircleArchipelagoCard,
  ClusterConstellationCard,
  HelixRibbonsCard,
  HorizonFoldsCard,
  IntersectionTowersCard,
  MarimekkoBlocksCard,
  SunburstTerracesCard,
  TernaryPrismCard,
  VoxelCloudCard,
  WindRoseCard,
} from '@lilt-ui/charts';
import { Camera, type Shot } from '../kit/camera';
import { Captions } from '../kit/captions';
import { Cursor } from '../kit/cursor';
import { EndCard } from '../kit/end-card';
import { Kick } from '../kit/kick';
import { useFrameStyle } from '../kit/overlay';
import { PropTicker, type PropChange } from '../kit/prop-ticker';
import {
  easeInOut,
  easeOut,
  film,
  progress,
  setCursor,
  useAfter,
  useFilmValue,
  type Aim,
  type CursorKey,
} from '../kit/runtime';
import { frameAt } from '../kit/stage';
import { Tilt, type TiltKey } from '../kit/tilt';
import {
  audienceIntersections,
  compassBands,
  cyclicRibbons,
  marketComposition,
  serviceHorizons,
  spatialCloud,
  spatialHierarchy,
  ternaryMix,
} from '../../../apps/showcase/lib/card-docs/spatial-data';
import './cool.css';

/**
 * Cool charts, part 2: charts you can turn. A constellation draws in and the camera orbits it by
 * its own `yaw` prop, then the tour visits the other nine, turning the ones with a camera.
 */

const T = {
  heroReady: 1300,
  orbit: 2300,
  orbitEnd: 5500,
  sweep: 5800,
  pin: 6700,
  tour: 7300,
  stop: 1500,
  wall: 20800,
  end: 25300,
  done: 28900,
};

/** Wrap an angle into the props' −180…180 range; the wrap lands on the same view. */
const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

interface Stop {
  name: string;
  tag: string;
  prop: { name: string; value: string; raw?: boolean };
  /** Turns on its own `yaw` while the camera is on it. */
  orbit?: boolean;
  hover: Aim[];
}

const marks = (name: string) => `[data-film="${name}"] .lilt-observations-card__mark`;
const nth = (name: string, index: number): Aim => ({ el: marks(name), nth: index, hit: true });

const stops: Stop[] = [
  {
    name: 'voxel',
    tag: 'VoxelCloudCard',
    prop: { name: 'yaw', value: '35', raw: true },
    orbit: true,
    hover: [nth('voxel', 3), nth('voxel', 11)],
  },
  {
    name: 'helix',
    tag: 'HelixRibbonsCard',
    prop: { name: 'yaw', value: '35', raw: true },
    orbit: true,
    hover: [nth('helix', 4), nth('helix', 20)],
  },
  {
    name: 'horizon',
    tag: 'HorizonFoldsCard',
    prop: { name: 'series', value: 'series' },
    hover: [nth('horizon', 20), nth('horizon', 90)],
  },
  {
    name: 'towers',
    tag: 'IntersectionTowersCard',
    prop: { name: 'members', value: 'sets' },
    hover: [nth('towers', 0), nth('towers', 2)],
  },
  {
    name: 'marimekko',
    tag: 'MarimekkoBlocksCard',
    prop: { name: 'segment', value: 'segment' },
    hover: [nth('marimekko', 1), nth('marimekko', 6)],
  },
  {
    name: 'archipelago',
    tag: 'CircleArchipelagoCard',
    prop: { name: 'path', value: 'path' },
    hover: [nth('archipelago', 0), nth('archipelago', 4)],
  },
  {
    name: 'ternary',
    tag: 'TernaryPrismCard',
    prop: { name: 'c', value: 'c' },
    hover: [nth('ternary', 2), nth('ternary', 6)],
  },
  {
    name: 'windrose',
    tag: 'WindRoseCard',
    prop: { name: 'band', value: 'band' },
    hover: [nth('windrose', 3), nth('windrose', 10)],
  },
  {
    name: 'sunburst',
    tag: 'SunburstTerracesCard',
    prop: { name: 'path', value: 'path' },
    hover: [nth('sunburst', 0), nth('sunburst', 2)],
  },
];

const stopAt = (index: number) => T.tour + index * T.stop;
const readyAt = (index: number) => stopAt(index) + 200;

// Wall: the constellation top centre, the tour snaking right, along the bottom, and back.
//   windrose  sunburst     CONSTELLATION  voxel    helix
//   ternary   archipelago  marimekko      towers   horizon
const area: Record<string, string> = {
  hero: '1 / 3',
  voxel: '1 / 4',
  helix: '1 / 5',
  horizon: '2 / 5',
  towers: '2 / 4',
  marimekko: '2 / 3',
  archipelago: '2 / 2',
  ternary: '2 / 1',
  windrose: '1 / 1',
  sunburst: '1 / 2',
};

/** The hero's yaw: a full turn eased in and out, then a slow drift through the wall. */
const heroYaw = (t: number) =>
  wrap(35 + easeInOut(progress(t, T.orbit, T.orbitEnd)) * 360 + Math.max(0, t - T.wall) * 0.02);
const heroElevation = (t: number) => 25 + Math.sin(Math.PI * progress(t, T.orbit, T.orbitEnd)) * 22;

/** A tour card's yaw: half a turn while the camera is on it, a slow drift on the wall. */
const stopYaw = (index: number) => (t: number) =>
  wrap(
    35 +
      easeInOut(progress(t, stopAt(index) + 500, stopAt(index + 1))) * 160 +
      Math.max(0, t - T.wall) * 0.02,
  );

const hero = '[data-film="hero"]';
const heroCard = `${hero} .lilt-card`;
const cell = (name: string) => `[data-film="${name}"] .lilt-card`;

const shots: Shot[] = [
  { t: 0, el: heroCard, fit: 0.9, fitHeight: 0.86, dy: 20 },
  { t: T.orbit, el: heroCard, fit: 0.86, fitHeight: 0.84, dy: 20, move: T.orbit },
  // Push in while it turns, so the depth reads.
  { t: T.orbitEnd - 300, el: `${hero} .lilt-observations-card__plot`, fit: 1.05, fitHeight: 1.0 },
  { t: T.sweep, el: heroCard, fit: 0.88, fitHeight: 0.84, dy: 22, move: 600 },
  { t: T.tour - 60, el: heroCard, fit: 0.9, fitHeight: 0.86, dy: 22 },
  ...stops.flatMap((stop, index): Shot[] => [
    {
      t: stopAt(index) + 240,
      between: [index === 0 ? heroCard : cell(stops[index - 1]!.name), cell(stop.name)],
      zoom: 0.78,
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

const cursorKeys: CursorKey[] = [
  { t: 0, at: frameAt(1.15, 1.1) },
  { t: T.sweep - 300, at: frameAt(1.15, 1.1) },
  { t: T.sweep + 300, at: nth('hero', 2), move: 600 },
  { t: T.pin, at: nth('hero', 14), move: 420 },
  ...stops.flatMap((stop, index): CursorKey[] => [
    { t: stopAt(index) + 1000, at: stop.hover[0]!, move: 700 },
    { t: stopAt(index) + 1420, at: stop.hover[1]!, move: 360 },
  ]),
  { t: T.wall + 300, at: frameAt(1.15, 1.12), move: 600 },
];
const clicks = [{ t: T.pin + 60, hold: 110 }];

/** The yaw rolls in the code pill on the beat while the camera turns. */
const orbitBeats = [2500, 3000, 3500, 4000, 4500, 5000, 5500];
const changes: PropChange[] = [
  { t: 1500, tag: 'ClusterConstellationCard', name: 'yaw', value: '35', raw: true },
  ...orbitBeats.map((t) => ({
    t,
    tag: 'ClusterConstellationCard',
    name: 'yaw',
    value: String(Math.round(heroYaw(t))),
    raw: true,
  })),
  ...stops.flatMap((stop, index): PropChange[] => [
    { t: stopAt(index) + 140, tag: stop.tag, ...stop.prop },
    ...(stop.orbit
      ? [900, 1300].map((offset) => ({
          t: stopAt(index) + offset,
          tag: stop.tag,
          name: 'yaw',
          value: String(Math.round(stopYaw(index)(stopAt(index) + offset))),
          raw: true,
        }))
      : []),
  ]),
];

// Cards ----------------------------------------------------------------------------------------

/** Rounded to a tenth of a degree, so the card re-renders only when the view really moves. */
const tenth = (value: number) => Math.round(value * 10) / 10;

function HeroCard() {
  const ready = useAfter(T.heroReady);
  const yaw = useFilmValue((t) => tenth(heroYaw(t)));
  const elevation = useFilmValue((t) => tenth(heroElevation(t)));
  return (
    <ClusterConstellationCard
      title="Service map"
      data={spatialCloud}
      label="name"
      x="x"
      y="y"
      z="z"
      value="value"
      connections="links"
      group="group"
      yaw={yaw}
      elevation={elevation}
      height={360}
      loading={!ready}
    />
  );
}

function TourCard({ index }: { index: number }) {
  const stop = stops[index]!;
  const loading = !useAfter(readyAt(index));
  const yaw = useFilmValue((t) => (stop.orbit ? tenth(stopYaw(index)(t)) : 35));
  switch (stop.name) {
    case 'voxel':
      return (
        <VoxelCloudCard
          title="Usage in three dimensions"
          data={spatialCloud}
          label="name"
          x="x"
          y="y"
          z="z"
          value="value"
          group="group"
          yaw={yaw}
          loading={loading}
        />
      );
    case 'helix':
      return (
        <HelixRibbonsCard
          title="Weekly rhythm"
          data={cyclicRibbons}
          series="series"
          cycle="cycle"
          phase="phase"
          value="value"
          yaw={yaw}
          loading={loading}
        />
      );
    case 'horizon':
      return (
        <HorizonFoldsCard
          title="Service latency"
          data={serviceHorizons}
          series="series"
          time="time"
          value="value"
          loading={loading}
        />
      );
    case 'towers':
      return (
        <IntersectionTowersCard
          title="Audience overlap"
          data={audienceIntersections}
          members="sets"
          value="value"
          loading={loading}
        />
      );
    case 'marimekko':
      return (
        <MarimekkoBlocksCard
          title="Market share"
          data={marketComposition}
          category="category"
          segment="segment"
          value="value"
          loading={loading}
        />
      );
    case 'archipelago':
      return (
        <CircleArchipelagoCard
          title="Headcount by team"
          data={spatialHierarchy}
          path="path"
          value="value"
          loading={loading}
        />
      );
    case 'ternary':
      return (
        <TernaryPrismCard
          title="Revenue mix"
          data={ternaryMix}
          label="name"
          a="a"
          b="b"
          c="c"
          value="value"
          loading={loading}
        />
      );
    case 'windrose':
      return (
        <WindRoseCard
          title="Traffic by direction"
          data={compassBands}
          direction="direction"
          band="band"
          value="value"
          loading={loading}
        />
      );
    default:
      return (
        <SunburstTerracesCard
          title="Spend by team"
          data={spatialHierarchy}
          path="path"
          value="value"
          loading={loading}
        />
      );
  }
}

/** Every card but the hero waits in the dark, then fades up around it, nearest first. */
function Cell({ name, children }: { name: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const index = stops.findIndex((stop) => stop.name === name);
  const ring = index === -1 ? 0 : Math.min(index + 1, stops.length - index);
  useFrameStyle(ref, (t, element) => {
    if (index === -1) return;
    const start = T.sweep - 200 + ring * 70;
    const k = easeOut(progress(t, start, start + 700));
    element.style.opacity = String(k);
    element.style.transform = k < 1 ? `translate3d(0, ${(1 - k) * 24}px, 0)` : '';
  });
  return (
    <div className="cool-cell" data-film={name} ref={ref} style={{ gridArea: area[name] }}>
      {children}
    </div>
  );
}

const beats = [T.heroReady, T.pin + 60, ...stops.map((_, index) => readyAt(index)), T.wall + 2000];

export function Cool2Film() {
  useEffect(() => {
    film.duration = T.done;
    setCursor(cursorKeys, clicks);
  }, []);

  return (
    <main className="film cool">
      <div className="film-light" aria-hidden />
      <Kick beats={beats} amount={0.012}>
        <Tilt keys={tilts}>
          <Camera shots={shots} width={3300} height={1500}>
            <div className="cool-wall cool-wall--five" data-theme="dark">
              <Cell name="hero">
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
      <PropTicker changes={changes} show={[1500, T.wall + 200]} />
      <Captions
        lines={[
          { from: 200, to: 1400, text: 'Part 2: charts you can turn.' },
          { from: T.wall + 1300, to: T.end - 100, text: 'Ten more charts, drawn in depth.' },
        ]}
      />
      <EndCard from={T.end} line="Twenty-three new charts in 0.13." />
      <Cursor />
    </main>
  );
}
