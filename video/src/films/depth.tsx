import { useEffect, useMemo } from 'react';
import {
  ActivityRingCard,
  BarChartCard,
  FunnelChartCard,
  HeatmapChartCard,
  LineChartCard,
  ProgressCard,
  RadialChartCard,
  SankeyChartCard,
  ScatterChartCard,
  StatCard,
  type CardRange,
} from '@lilt-ui/charts';
import { CandlestickChartCard } from '@lilt-ui/charts/finance';
import { Camera, type Shot } from '../kit/camera';
import { Captions } from '../kit/captions';
import { CodeChip } from '../kit/code-chip';
import { Cursor } from '../kit/cursor';
import { EndCard } from '../kit/end-card';
import { film, setCursor, useAfter, useCueIndex, type CursorKey } from '../kit/runtime';
import { frameAt } from '../kit/stage';
import { Tilt, type TiltKey } from '../kit/tilt';
import './depth.css';
import {
  campaignResults,
  channelRevenue,
  dailyKpis,
  dailySessions,
  requestRhythm,
  signupFunnel,
  solQuarter,
  visitorFlow,
  weeklyActivity,
  type WeekdayEarnings,
} from '../data';

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

/** Beats at 120 BPM: the cut points land on these. */
const T = {
  heroReady: 600,
  pullBack: 2300,
  sweepStart: 2900,
  sweepEnd: 4500,
  periodOpen: 5000,
  periodPick: 5650,
  depthOff: 7350,
  depthOn: 8100,
  reveal: 9000,
  revealEnd: 10600,
  wave: 9500,
  tour: 11400,
  stop: 1500,
  outro: 19100,
  end: 23100,
};

const thisWeek: WeekdayEarnings[] = [
  { day: 'Mon', earnings: 3420 },
  { day: 'Tue', earnings: 4180 },
  { day: 'Wed', earnings: 3860 },
  { day: 'Thu', earnings: 5240 },
  { day: 'Fri', earnings: 6120 },
  { day: 'Sat', earnings: 4630 },
  { day: 'Sun', earnings: 2980 },
];
const lastWeek: WeekdayEarnings[] = [
  { day: 'Mon', earnings: 2740 },
  { day: 'Tue', earnings: 3310 },
  { day: 'Wed', earnings: 4420 },
  { day: 'Thu', earnings: 3980 },
  { day: 'Fri', earnings: 4870 },
  { day: 'Sat', earnings: 5560 },
  { day: 'Sun', earnings: 3150 },
];
const earningsRanges: CardRange<WeekdayEarnings>[] = [
  { id: 'this', label: 'This week', data: thisWeek, delta: 0.092 },
  { id: 'last', label: 'Last week', data: lastWeek, delta: -0.031 },
];

const channelSeries = [
  { key: 'desktop', label: 'Desktop' },
  { key: 'mobile', label: 'Mobile' },
] as const;
const recentKpis = dailyKpis.slice(-12);
const recentCandles = solQuarter.slice(-28);

/** Wall cards, column by column; `order` is when each one finishes loading in the wave. */
const wall = [
  ['radial', 'funnel', 'heatmap', 'ring-stat'],
  ['line', 'hero', 'sankey'],
  ['candles', 'activity', 'scatter', 'progress'],
] as const;
const waveOrder: Record<string, number> = {
  line: 0,
  sankey: 0,
  funnel: 1,
  activity: 1,
  radial: 2,
  heatmap: 2,
  candles: 2,
  scatter: 2,
  'ring-stat': 3,
  progress: 3,
};

const card = (name: string) => `[data-film="${name}"]`;
const plot = (name: string) => `${card(name)} .lilt-card__chart`;
const face = (name: string) => `${card(name)} .lilt-card`;
const tourStops = ['radial', 'candles', 'funnel', 'heatmap', 'activity'] as const;
const stopAt = (index: number) => T.tour + index * T.stop;

const shots: Shot[] = [
  { t: 0, el: plot('hero'), fit: 1.9, fy: 0.62 },
  { t: T.heroReady + 150, el: plot('hero'), fit: 1.9, fy: 0.62 },
  { t: T.pullBack, el: card('hero'), fit: 0.9, move: 1500, dy: 18 },
  { t: T.sweepEnd, el: card('hero'), fit: 0.98, move: 1600, dy: 10 },
  { t: T.periodOpen + 200, el: card('hero'), fit: 0.92, move: 600, dy: 20 },
  { t: T.depthOff - 500, el: card('hero'), fit: 0.86, move: 700, dy: 46 },
  { t: T.reveal, el: card('hero'), fit: 0.86, dy: 46 },
  { t: T.revealEnd, el: '.film-wall', fit: 0.8, fitHeight: 0.8, move: 1600 },
  { t: T.tour - 350, el: '.film-wall', fit: 0.78, fitHeight: 0.78 },
  ...tourStops.flatMap((name, index): Shot[] => [
    // Hop: ease out to see where we're going, then push in on the next card.
    ...(index > 0
      ? [
          {
            t: stopAt(index) + 40,
            between: [card(tourStops[index - 1]!), card(name)],
            zoom: 0.92,
            move: 420,
          } as Shot,
        ]
      : []),
    {
      t: stopAt(index) + 520,
      el: card(name),
      fit: 0.84,
      fitHeight: 0.84,
      move: index > 0 ? 480 : 800,
    },
    { t: stopAt(index + 1) - 380, el: card(name), fit: 0.9, fitHeight: 0.9, move: 700 },
  ]),
  { t: T.outro + 1400, el: '.film-wall', fit: 0.86, fitHeight: 0.86, move: 1700 },
  { t: T.end, el: '.film-wall', fit: 0.8, fitHeight: 0.8, move: 2600 },
];

const tilts: TiltKey[] = [
  { t: 0, rx: 0, rz: 0 },
  { t: T.reveal, rx: 0, rz: 0 },
  { t: T.revealEnd - 100, rx: 22, rz: -8, z: 40, move: 1500 },
  { t: T.tour - 200, rx: 18, rz: -6, z: 30 },
  { t: T.tour + 520, rx: 0, rz: 0, move: 820 },
  { t: T.outro, rx: 0, rz: 0 },
  { t: T.outro + 2200, rx: 26, rz: -9, z: 30, move: 2200 },
  { t: T.end, rx: 30, rz: -11, z: 20, move: 1800 },
];

const cursorKeys: CursorKey[] = [
  { t: 0, at: frameAt(1.14, 1.06) },
  { t: T.sweepStart - 1000, at: frameAt(1.06, 0.97) },
  { t: T.sweepStart, at: { el: `${plot('hero')}`, fx: 0.08, fy: 0.62 }, move: 800 },
  // Sweep across the week.
  ...[0.22, 0.36, 0.5, 0.64, 0.78, 0.92].map(
    (fx, i): CursorKey => ({
      t: T.sweepStart + ((i + 1) * (T.sweepEnd - T.sweepStart)) / 6,
      at: { el: plot('hero'), fx, fy: 0.58 - (i % 2) * 0.05 },
      move: 240,
    }),
  ),
  {
    t: T.periodOpen - 80,
    at: { el: `${card('hero')} .lilt-range-select__trigger`, fx: 0.4, fy: 0.55 },
    move: 520,
  },
  {
    t: T.periodPick - 80,
    at: { el: `${card('hero')} .lilt-range-select__option`, nth: 1, fx: 0.35, fy: 0.55 },
    move: 420,
  },
  {
    t: T.periodPick + 600,
    at: { el: `${card('hero')} .lilt-range-select__option`, nth: 1, fx: 0.35, fy: 0.55 },
  },
  {
    t: T.depthOff - 80,
    at: { el: '.film-code [data-token="depth"]', fx: 0.45, fy: 0.6 },
    move: 900,
  },
  {
    t: T.depthOn + 200,
    at: { el: '.film-code [data-token="depth"]', fx: 0.5, fy: 0.62 },
    move: 300,
  },
  { t: T.reveal + 900, at: frameAt(0.89, 0.96), move: 1100 },
  { t: T.tour - 100, at: frameAt(0.83, 0.92) },
  ...tourKeys(),
  { t: T.outro + 900, at: frameAt(1.08, 1.08), move: 900 },
];

/** Inside each stop the cursor reads the chart the way a person would. */
function tourKeys(): CursorKey[] {
  const paths: Record<(typeof tourStops)[number], [number, number][]> = {
    radial: [
      [0.565, 0.258],
      [0.687, 0.468],
      [0.467, 0.62],
      [0.313, 0.402],
    ],
    candles: [
      [0.12, 0.62],
      [0.4, 0.58],
      [0.66, 0.6],
      [0.9, 0.55],
    ],
    funnel: [
      [0.14, 0.48],
      [0.38, 0.48],
      [0.62, 0.48],
      [0.86, 0.48],
    ],
    heatmap: [
      [0.3, 0.3],
      [0.52, 0.42],
      [0.7, 0.55],
      [0.86, 0.68],
    ],
    activity: [
      [0.5, 0.312],
      [0.665, 0.49],
      [0.5, 0.668],
      [0.335, 0.49],
    ],
  };
  return tourStops.flatMap((name, index) => {
    const start = stopAt(index) + 480;
    const span = T.stop - 600;
    return paths[name].map(
      ([fx, fy], step): CursorKey => ({
        t: start + (step * span) / (paths[name].length - 1),
        at: { el: face(name), fx, fy },
        move: step === 0 ? 620 : span / (paths[name].length - 1),
      }),
    );
  });
}

export function DepthFilm() {
  const heroReady = useAfter(T.heroReady);
  const depthStep = useCueIndex([T.depthOff, T.depthOn]);
  const depth = depthStep !== 0;
  const waveStep = useCueIndex([T.wave, T.wave + 260, T.wave + 520, T.wave + 780]);

  useEffect(() => {
    film.duration = T.end;
    setCursor(cursorKeys, [
      { t: T.periodOpen, hold: 110 },
      { t: T.periodPick, hold: 110 },
      { t: T.depthOff, hold: 110 },
      { t: T.depthOn, hold: 110 },
    ]);
  }, []);

  const cards = useMemo(
    () => ({
      radial: (loading: boolean) => (
        <RadialChartCard
          title="Revenue by channel"
          data={channelRevenue}
          category="channel"
          value="revenue"
          valueFormat={usd}
          legend="inline"
          depth
          loading={loading}
        />
      ),
      funnel: (loading: boolean) => (
        <FunnelChartCard
          title="Sign-up funnel"
          data={signupFunnel}
          category="stage"
          value="people"
          delta={0.052}
          depth
          loading={loading}
        />
      ),
      heatmap: (loading: boolean) => (
        <HeatmapChartCard
          title="Audience activity"
          data={weeklyActivity}
          x="hour"
          y="day"
          value="sessions"
          depth
          loading={loading}
        />
      ),
      'ring-stat': (loading: boolean) => (
        <StatCard
          title="Orders"
          data={recentKpis}
          value="orders"
          x="date"
          chart="ring"
          target={2400}
          delta={0.153}
          depth
          loading={loading}
        />
      ),
      line: (loading: boolean) => (
        <LineChartCard
          title="Active users"
          data={dailySessions}
          x="date"
          series={channelSeries}
          delta={0.126}
          height={170}
          depth
          loading={loading}
        />
      ),
      sankey: (loading: boolean) => (
        <SankeyChartCard
          title="Visitor flow"
          data={visitorFlow}
          source="from"
          target="to"
          value="visitors"
          depth
          loading={loading}
        />
      ),
      candles: (loading: boolean) => (
        <CandlestickChartCard
          title="SOL · USDC"
          data={recentCandles}
          x="date"
          open="open"
          high="high"
          low="low"
          close="close"
          valueFormat={usd}
          height={190}
          depth
          loading={loading}
        />
      ),
      activity: (loading: boolean) => (
        <ActivityRingCard
          title="Request rhythm"
          data={requestRhythm}
          hour="hour"
          value="requests"
          bucketMinutes={40}
          height={230}
          depth
          loading={loading}
        />
      ),
      scatter: (loading: boolean) => (
        <ScatterChartCard
          title="Campaign results"
          data={campaignResults}
          x="spend"
          y="signups"
          size="reach"
          sizeLabel="Reach"
          group="channel"
          label="campaign"
          xLabel="Spend"
          yLabel="Sign-ups"
          xFormat={usd}
          depth
          loading={loading}
        />
      ),
      progress: (loading: boolean) => (
        <ProgressCard
          title="Visitors"
          value={1260}
          target={2000}
          range="Last 7 days"
          variant="thick"
          depth
          loading={loading}
        />
      ),
    }),
    [],
  );

  return (
    <main className="film" data-theme="dark">
      <div className="film-light" aria-hidden />
      <Tilt keys={tilts}>
        <Camera shots={shots} width={1500} height={1500}>
          <div className="film-wall">
            {wall.map((column, index) => (
              <div className="film-column" key={index}>
                {column.map((name) =>
                  name === 'hero' ? (
                    <div className="film-slot film-slot--hero" data-film="hero" key={name}>
                      <BarChartCard
                        title="Earnings"
                        ranges={earningsRanges}
                        x="day"
                        series={[{ key: 'earnings', label: 'Earnings' }]}
                        valueFormat={usd}
                        depth={depth}
                        barWidth={44}
                        height={250}
                        tiles={false}
                        loading={!heroReady}
                      />
                    </div>
                  ) : (
                    <div className="film-slot" data-film={name} key={name}>
                      {cards[name](waveStep < (waveOrder[name] ?? 0))}
                    </div>
                  ),
                )}
              </div>
            ))}
          </div>
        </Camera>
      </Tilt>
      <CodeChip show={[T.depthOff - 650, T.reveal + 200]} off={!depth}>
        <span className="film-code__punct">&lt;</span>
        <span className="film-code__tag">BarChartCard</span>{' '}
        <span className="film-code__attr">data</span>
        <span className="film-code__punct">={'{'}</span>
        <span className="film-code__value">earnings</span>
        <span className="film-code__punct">{'}'}</span>{' '}
        <span className="film-code__token" data-token="depth">
          depth
        </span>{' '}
        <span className="film-code__punct">/&gt;</span>
      </CodeChip>
      <Captions
        lines={[
          { from: 1150, to: 3100, text: '3D charts for React.' },
          { from: 5850, to: 6600, text: 'Live data. Physical motion.' },
          { from: T.revealEnd - 500, to: T.tour + 200, text: 'Every chart. One prop.' },
        ]}
      />
      <EndCard from={T.outro} line="Every chart, in 3D. One prop." />
      <Cursor />
    </main>
  );
}
