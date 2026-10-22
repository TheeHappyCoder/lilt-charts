'use client';

import Link from 'next/link';
import { FittedPreview } from '@/components/gallery/fitted-preview';
import { chartDocs } from '@/lib/card-docs/registry';
import { featureCards } from '@/lib/home-showcase';
import { HomeTile } from './home-tile';

/**
 * A family's hero card, as the gallery shows it, live. Wide rooms let it rise from the floor;
 * tall or short ones hold the whole card, centred above the caption, so none ends mid-room.
 */
function Chart({
  href,
  width,
  height,
  fit = 'peek',
}: {
  href: string;
  width: number;
  height: number;
  fit?: 'peek' | 'contain';
}) {
  const doc = chartDocs[href];
  if (!doc) return null;
  const example = featureCards(doc.hero, { height })[0]!;
  return <FittedPreview example={example} width={width} fit={fit} />;
}

const builtIn = [
  { href: '/features/sync', name: 'Linked hover', line: 'One pointer reads every card' },
  { href: '/features/pin', name: 'Pin', line: 'Hold a reading in place' },
  { href: '/features/compare', name: 'Compare', line: 'Drag to see what changed' },
  { href: '/features/targets', name: 'Targets', line: 'Goals and forecasts' },
  { href: '/features/performance', name: 'Performance', line: 'Four points a pixel' },
] as const;

/** Chart cards in the gallery's rooms, then what every one of them can do. */
export function HomeCharts() {
  return (
    <div className="lilt-bento" data-layout="charts">
      <HomeTile
        area="sankey"
        href="/charts/sankey"
        name="Sankey"
        hint="Where visitors go next"
        tone="room"
      >
        <Chart href="/charts/sankey" width={560} height={340} />
      </HomeTile>
      <HomeTile
        area="skyline"
        href="/charts/skyline"
        name="Skyline"
        hint="A year, stood up in depth"
        tone="room"
      >
        <Chart href="/charts/skyline" width={600} height={340} />
      </HomeTile>
      <HomeTile
        area="radar"
        floor
        href="/charts/radar"
        name="Radar"
        hint="Strengths at a glance"
        tone="room"
      >
        <Chart href="/charts/radar" width={400} height={300} fit="contain" />
      </HomeTile>
      <HomeTile
        area="stat"
        floor
        href="/charts/stat-cards"
        name="Stat cards"
        hint="A number and its story"
        tone="room"
      >
        <Chart href="/charts/stat-cards" width={400} height={300} fit="contain" />
      </HomeTile>
      <HomeTile
        area="candle"
        floor
        href="/finance/candlestick"
        name="Candlestick"
        hint="Every session's range"
        tone="room"
      >
        <Chart href="/finance/candlestick" width={600} height={320} fit="contain" />
      </HomeTile>
      <HomeTile
        area="built"
        href="/features/sync"
        name="Built in"
        hint="What every card can do, with no code of yours"
        tone="room"
        floor
        live
      >
        <ol className="lilt-built">
          {builtIn.map((item, index) => (
            <li key={item.href}>
              <Link href={item.href}>
                <span className="lilt-built__index">{String(index + 1).padStart(2, '0')}</span>
                <strong>{item.name}</strong>
                <small>{item.line}</small>
              </Link>
            </li>
          ))}
        </ol>
      </HomeTile>
    </div>
  );
}
