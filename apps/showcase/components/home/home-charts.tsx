'use client';

import Link from 'next/link';
import { Label } from '@/components/craft/label';
import { ArrowSwap } from '@/components/craft/roll';
import { FittedPreview } from '@/components/gallery/fitted-preview';
import { chartDocs } from '@/lib/card-docs/registry';
import { featureCards } from '@/lib/home-showcase';
import { HomeTile } from './home-tile';

/**
 * A family's hero card rendered on the ghost surface so it sits directly on the tile without
 * nesting a second card frame inside the bento cell.
 */
function Chart({
  href,
  width,
  height,
  fit = 'contain',
}: {
  href: string;
  width: number;
  height: number;
  fit?: 'peek' | 'contain';
}) {
  const doc = chartDocs[href];
  if (!doc) return null;
  const example = featureCards(doc.hero, { height, surface: 'ghost' })[0]!;
  return <FittedPreview example={example} width={width} fit={fit} />;
}

const builtIn = [
  { href: '/features/sync', name: 'Linked hover', line: 'One pointer reads every card' },
  { href: '/features/pin', name: 'Pin', line: 'Hold a reading in place' },
  { href: '/features/compare', name: 'Compare', line: 'Drag to see what changed' },
  { href: '/features/targets', name: 'Targets', line: 'Goals and forecasts' },
  { href: '/features/performance', name: 'Performance', line: 'Four points a pixel' },
] as const;

/** Chart cards on plinths, then what every one of them can do, as a list of rows. */
export function HomeCharts() {
  return (
    <div className="lilt-bento" data-layout="charts">
      <HomeTile
        area="sankey"
        floor
        href="/charts/sankey"
        name="Sankey"
        hint="Where visitors go next"
        tone="room"
      >
        <Chart href="/charts/sankey" width={560} height={320} />
      </HomeTile>
      <HomeTile
        area="skyline"
        floor
        href="/charts/skyline"
        name="Skyline"
        hint="A year, stood up in depth"
        tone="room"
      >
        <Chart href="/charts/skyline" width={600} height={320} />
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
      <div className="lilt-built" style={{ gridArea: 'built' }}>
        <Label as="h3" reveal={false}>
          Built in
          <span className="lilt-built__aside">What every card can do, with no code of yours</span>
        </Label>
        <ol data-rv="kids">
          {builtIn.map((item, index) => (
            <li key={item.href}>
              <Link href={item.href} className="lilt-built__row">
                <span className="lilt-built__index">{String(index + 1).padStart(2, '0')}</span>
                <span className="lilt-built__text">
                  <strong>{item.name}</strong>
                  <small>{item.line}</small>
                </span>
                <ArrowSwap />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
