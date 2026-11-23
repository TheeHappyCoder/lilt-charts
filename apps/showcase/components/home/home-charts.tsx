'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowDataTransferHorizontalIcon from '@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon';
import DashboardSpeed02Icon from '@hugeicons/core-free-icons/DashboardSpeed02Icon';
import Link01Icon from '@hugeicons/core-free-icons/Link01Icon';
import Pin02Icon from '@hugeicons/core-free-icons/Pin02Icon';
import Target03Icon from '@hugeicons/core-free-icons/Target03Icon';
import Link from 'next/link';
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
  {
    href: '/features/sync',
    icon: Link01Icon,
    prop: 'sync',
    name: 'Linked hover',
    line: 'One pointer reads every card',
  },
  {
    href: '/features/pin',
    icon: Pin02Icon,
    prop: 'pin',
    name: 'Pin',
    line: 'Hold any reading in place',
  },
  {
    href: '/features/compare',
    icon: ArrowDataTransferHorizontalIcon,
    prop: 'compare',
    name: 'Compare',
    line: 'Drag across to measure delta',
  },
  {
    href: '/features/targets',
    icon: Target03Icon,
    prop: 'target',
    name: 'Targets',
    line: 'Goals, bands and forecasts',
  },
  {
    href: '/features/performance',
    icon: DashboardSpeed02Icon,
    prop: 'decimate',
    name: 'Performance',
    line: 'Four points per pixel column',
  },
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
        <div className="lilt-built__head">
          <div className="lilt-built__title">
            <span className="lilt-built__eyebrow">Built in</span>
            <span className="lilt-built__aside">What every chart card does out of the box</span>
          </div>
          <Link href="/features/sync" className="lilt-built__all">
            All features
            <ArrowSwap direction="right" />
          </Link>
        </div>
        <ol data-rv="kids">
          {builtIn.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="lilt-built__row">
                <span className="lilt-built__top">
                  <span className="lilt-built__ico" aria-hidden="true">
                    <Icon icon={item.icon} size={15} strokeWidth={1.7} />
                  </span>
                  <code className="lilt-built__prop">{item.prop}</code>
                  <ArrowSwap />
                </span>
                <span className="lilt-built__text">
                  <strong>{item.name}</strong>
                  <small>{item.line}</small>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
