'use client';
import {
  streamgraphExample,
  divergingExample,
  mirroredExample,
  comparativefunnelExample,
  nesteddonutExample,
  goalpacingExample,
  milestoneprogressExample,
  violinExample,
  correlationExample,
} from '@/lib/card-docs/expansion-variants';
import {
  sunburstTerracesDoc,
  clusterConstellationDoc,
  ternaryPrismDoc,
  windRoseDoc,
  marimekkoBlocksDoc,
  intersectionTowersDoc,
  horizonFoldsDoc,
  circleArchipelagoDoc,
  helixRibbonsDoc,
  voxelCloudDoc,
} from '@/lib/card-docs/spatial';

import {
  chordLoomDoc,
  rankRibbonsDoc,
  eventHelixDoc,
  contourIslandsDoc,
  parallelRibbonsDoc,
  arcBridgesDoc,
} from '@/lib/card-docs/sculpted';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CardExamplePreview } from '@/components/docs/card-example-preview';
import { activityRingDoc } from '@/lib/card-docs/activity-ring';
import { areaDoc } from '@/lib/card-docs/area';
import { barDoc } from '@/lib/card-docs/bar';
import { comboDoc } from '@/lib/card-docs/combo';
import type { CardDocContent } from '@/lib/card-docs/content';
import { isExampleRow, type CardExample } from '@/lib/card-docs/examples';
import { funnelDoc } from '@/lib/card-docs/funnel';
import { heatmapDoc } from '@/lib/card-docs/heatmap';
import { horizontalBarDoc } from '@/lib/card-docs/horizontal-bar';
import { lineDoc } from '@/lib/card-docs/line';
import { progressDoc } from '@/lib/card-docs/progress';
import { radarDoc } from '@/lib/card-docs/radar';
import { radialDoc } from '@/lib/card-docs/radial';
import { sankeyDoc } from '@/lib/card-docs/sankey';
import { scatterDoc } from '@/lib/card-docs/scatter';
import { slopeDoc } from '@/lib/card-docs/slope';
import { statDoc } from '@/lib/card-docs/stat';
import { treemapDoc } from '@/lib/card-docs/treemap';
import {
  blockCityDoc,
  hexCityDoc,
  ridgelineDoc,
  skylineDoc,
  spiralYearDoc,
  terrainDoc,
  voxelWaffleDoc,
} from '@/lib/card-docs/cool';
import {
  calendarExample,
  timelineExample,
  stripExample,
  beeswarmExample,
} from '@/lib/card-docs/observation-variants';
import { useChartSettings } from '@/components/docs/chart-settings';

const docs: readonly CardDocContent[] = [
  treemapDoc,
  areaDoc,
  lineDoc,
  barDoc,
  comboDoc,
  statDoc,
  progressDoc,
  horizontalBarDoc,
  radialDoc,
  funnelDoc,
  heatmapDoc,
  scatterDoc,
  sankeyDoc,
  radarDoc,
  slopeDoc,
  activityRingDoc,
  sunburstTerracesDoc,
  clusterConstellationDoc,
  ternaryPrismDoc,
  windRoseDoc,
  marimekkoBlocksDoc,
  intersectionTowersDoc,
  horizonFoldsDoc,
  circleArchipelagoDoc,
  helixRibbonsDoc,
  voxelCloudDoc,
  chordLoomDoc,
  rankRibbonsDoc,
  eventHelixDoc,
  contourIslandsDoc,
  parallelRibbonsDoc,
  arcBridgesDoc,
  terrainDoc,
  hexCityDoc,
  voxelWaffleDoc,
  skylineDoc,
  blockCityDoc,
  ridgelineDoc,
  spiralYearDoc,
];

/** Each family's hero card; a row of stat tiles contributes its first tile. */
export const heroes: readonly { title: string; example: CardExample }[] = [
  ...docs.map((doc) => ({
    title: doc.title.replace(/ chart$/, ''),
    example: isExampleRow(doc.hero) ? doc.hero.row[0]! : doc.hero,
  })),
  ...[
    calendarExample,
    timelineExample,
    stripExample,
    beeswarmExample,
    streamgraphExample,
    divergingExample,
    mirroredExample,
    comparativefunnelExample,
    nesteddonutExample,
    goalpacingExample,
    milestoneprogressExample,
    violinExample,
    correlationExample,
  ].map((example) => ({
    title: example.title,
    example,
  })),
];

/** How long the first card waits, and the gap between each card's data arriving. */
const FIRST = 1100;
const STAGGER = 170;

/**
 * Every card's loading state in one place. Simulate a fetch to watch each skeleton hand over to
 * its chart as the data lands, or hold them all in loading to study the shimmer.
 */
export function LoadingLab() {
  const { settings } = useChartSettings();
  const [mount, setMount] = useState(0);
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(new Set());
  const [hold, setHold] = useState(false);
  const timers = useRef<number[]>([]);

  const clear = () => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  };
  const simulate = useCallback(() => {
    clear();
    setMount((current) => current + 1);
    setLoaded(new Set());
    timers.current = heroes.map((_, index) =>
      window.setTimeout(
        () => setLoaded((current) => new Set(current).add(index)),
        FIRST + index * STAGGER,
      ),
    );
  }, []);

  useEffect(() => {
    if (hold) {
      clear();
      setMount((current) => current + 1);
      setLoaded(new Set());
    } else simulate();
    return clear;
  }, [hold, simulate]);

  const ready = loaded.size;
  return (
    <section className="lilt-studio" aria-label="Loading states">
      <div className="lilt-studio__bar">
        <button type="button" className="lilt-studio__primary" onClick={simulate} disabled={hold}>
          Simulate fetch
        </button>
        <label className="lilt-studio__switch">
          <input
            type="checkbox"
            checked={hold}
            onChange={(event) => setHold(event.currentTarget.checked)}
          />
          <span aria-hidden="true" className="lilt-studio__switch-track" />
          Hold in loading
        </label>
        <p className="lilt-studio__note" aria-live="polite">
          {hold
            ? 'Every card held in loading'
            : ready === heroes.length
              ? `All ${heroes.length} loaded`
              : `${ready} of ${heroes.length} loaded`}
        </p>
        <div className="lilt-studio__progress" aria-hidden="true">
          <span style={{ width: `${(ready / heroes.length) * 100}%` }} />
        </div>
      </div>

      <div className="lilt-studio__stage">
        <div className="lilt-studio__loading-grid">
          {heroes.map(({ title, example }, index) => {
            const loading = !loaded.has(index);
            return (
              <figure className="lilt-studio__cell" key={`${example.kind}-${example.id}-${mount}`}>
                <figcaption>
                  <span className="lilt-studio__chip">
                    <span
                      className="lilt-studio__status"
                      data-loading={loading || undefined}
                      aria-hidden="true"
                    />
                    {title}
                  </span>
                </figcaption>
                <CardExamplePreview
                  example={{
                    ...example,
                    props: {
                      ...example.props,
                      ...(settings.depth === undefined ? {} : { depth: settings.depth }),
                      ...(settings.palette ? { palette: settings.palette } : {}),
                      ...(settings.surface ? { surface: settings.surface } : {}),
                      ...(settings.loadingStyle ? { loadingStyle: settings.loadingStyle } : {}),
                      loading,
                    },
                  }}
                />
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
