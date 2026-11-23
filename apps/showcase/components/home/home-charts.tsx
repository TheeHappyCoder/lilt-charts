'use client';

import Link from 'next/link';
import { Label } from '@/components/craft/label';
import { ArrowSwap } from '@/components/craft/roll';
import { FittedPreview } from '@/components/gallery/fitted-preview';
import { chartDocs } from '@/lib/card-docs/registry';
import { featureCards } from '@/lib/home-showcase';
import { HomeTile } from './home-tile';

/**
 * A family's card rendered on the ghost surface so it sits directly on the tile without
 * nesting a second card frame inside the bento cell.
 */
function Chart({
  href,
  variantId,
  width,
  height,
  fit = 'contain',
}: {
  href: string;
  variantId?: string;
  width: number;
  height: number;
  fit?: 'peek' | 'contain';
}) {
  const doc = chartDocs[href];
  if (!doc) return null;
  const source = variantId
    ? (doc.examples.find((item) => item.id === variantId) ?? doc.hero)
    : doc.hero;
  const example = featureCards(source, { height, surface: 'ghost' })[0]!;
  return <FittedPreview example={example} width={width} fit={fit} />;
}

const builtIn = [
  { href: '/features/sync', name: 'Linked hover', line: 'One pointer reads every card' },
  { href: '/features/pin', name: 'Pin', line: 'Hold a reading in place' },
  { href: '/features/compare', name: 'Compare', line: 'Drag to see what changed' },
  { href: '/features/targets', name: 'Targets', line: 'Goals and forecasts' },
  { href: '/features/performance', name: 'Performance', line: 'Four points a pixel' },
] as const;

/** Three hero chart cards on plinths (two on top, full-width finance below), then built-in capabilities. */
export function HomeCharts() {
  return (
    <div className="lilt-bento" data-layout="charts">
      <HomeTile
        area="bar"
        floor
        href="/charts/bar"
        name="Segmented bar"
        hint="Thirty days of stacked sales, cell by cell"
        tone="room"
      >
        <Chart href="/charts/bar" variantId="segmented" width={580} height={310} />
      </HomeTile>
      <HomeTile
        area="funnel"
        floor
        href="/charts/funnel"
        name="Funnel"
        hint="Follow conversion from first step to last"
        tone="room"
      >
        <Chart href="/charts/funnel" width={580} height={220} />
      </HomeTile>
      <HomeTile
        area="candle"
        floor
        href="/finance/candlestick"
        name="Candlestick"
        hint="Every session's range and volume"
        tone="room"
      >
        <Chart href="/finance/candlestick" width={1140} height={330} />
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
