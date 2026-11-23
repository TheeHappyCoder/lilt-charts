'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowSwap } from '@/components/craft/roll';
import { GalleryTile } from '@/components/gallery/chart-gallery';
import { FittedPreview } from '@/components/gallery/fitted-preview';
import {
  customizeRoutes,
  familyGroups,
  featureRoutes,
  referenceRoutes,
  startRoutes,
} from '@/components/shell/nav-model';
import { chartDocs } from '@/lib/card-docs/registry';
import { featureCards } from '@/lib/home-showcase';
import {
  ShowroomFeature,
  ShowroomGroupHeader,
  ShowroomIntro,
  ShowroomToolbar,
  ShowroomWall,
  useGridCols,
  type ShowroomFilter,
} from './showroom-wall';

const FEATURE_HREF = '/charts/skyline';

const DIRECTORY = [
  {
    href: startRoutes[0]!.href,
    title: 'Getting started',
    detail: 'Install @lilt-ui/charts, add one stylesheet, and drop in a finished card.',
  },
  {
    href: customizeRoutes[0]!.href,
    title: `Customize (${customizeRoutes.length})`,
    detail: 'Palettes, surfaces, 3D depth, axes, legends, hover, numbers and loading.',
  },
  {
    href: featureRoutes[0]!.href,
    title: `Features (${featureRoutes.length})`,
    detail: 'Linked hover, pin, drag-to-compare, targets & forecasts, and performance.',
  },
  {
    href: referenceRoutes[0]!.href,
    title: 'API & Motion guides',
    detail: 'Compose your own charts from the model, plot and marks, plus motion principles.',
  },
] as const;

/**
 * The Charts showroom: filterable wall of every chart and finance family on plinths, grouped by
 * job, with grid density and a quiet directory to Customize, Features and Guides at its foot.
 */
export function ChartsShowroom() {
  const [active, setActive] = useState('all');
  const density = useGridCols('lilt-charts-cols', 3);

  const total = useMemo(
    () => familyGroups.reduce((sum, group) => sum + group.routes.length, 0),
    [],
  );

  const filters: ShowroomFilter[] = useMemo(
    () => [
      { id: 'all', label: 'All', count: total },
      ...familyGroups.map((group) => ({
        id: group.key,
        label: group.heading!,
        count: group.routes.length,
      })),
    ],
    [total],
  );

  const visibleGroups = useMemo(
    () => (active === 'all' ? familyGroups : familyGroups.filter((group) => group.key === active)),
    [active],
  );

  const featureDoc = chartDocs[FEATURE_HREF];
  const featureExample = useMemo(
    () => (featureDoc ? featureCards(featureDoc.hero, { height: 260 })[0]! : null),
    [featureDoc],
  );

  let seen = 0;

  return (
    <div className="lilt-showroom">
      <ShowroomIntro
        claim="Every chart,"
        dim="by the job it does."
        lede="Each family is one finished card with the same props, motion and inspection. Filter by job, change density, or open any card to tune its props and copy its code."
      />

      <ShowroomToolbar
        filters={filters}
        active={active}
        onSelect={setActive}
        label="Filter chart families"
        cols={density.cols}
        canNarrow={density.canNarrow}
        canWiden={density.canWiden}
        onNarrow={density.narrow}
        onWiden={density.widen}
      />

      <ShowroomWall cols={density.cols}>
        {active === 'all' && featureDoc && featureExample ? (
          <ShowroomFeature
            href={FEATURE_HREF}
            tag="@lilt-ui/charts · 3D depth"
            title={featureDoc.title}
            line={featureDoc.lede}
            cta={`Open ${featureDoc.title}`}
            visualMode="chart"
            visual={<FittedPreview example={featureExample} eager width={640} fit="peek" />}
          />
        ) : null}

        {visibleGroups.map((group) => (
          <section
            key={group.key}
            className="lilt-showroom-group"
            id={group.key}
            aria-labelledby={`${group.key}-title`}
          >
            <ShowroomGroupHeader
              id={`${group.key}-title`}
              label={group.heading!}
              count={group.routes.length}
              singular="chart"
              plural="charts"
            />
            <div className="lilt-showroom-grid">
              {group.routes.map((route, position) => (
                <GalleryTile key={route.id} href={route.href} eager={seen++ < 6} index={position} />
              ))}
            </div>
          </section>
        ))}

        {active === 'all' ? (
          <section className="lilt-showroom-directory" aria-labelledby="charts-more-title">
            <ShowroomGroupHeader
              id="charts-more-title"
              label="Guides & capabilities"
              count={DIRECTORY.length}
              singular="section"
              plural="sections"
            />
            <ol className="lilt-showroom-list">
              {DIRECTORY.map((entry, index) => (
                <li key={entry.href}>
                  <Link href={entry.href} className="lilt-showroom-row">
                    <span className="lilt-showroom-row__n">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="lilt-showroom-row__main">
                      <strong>{entry.title}</strong>
                      <span>{entry.detail}</span>
                    </span>
                    <ArrowSwap />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </ShowroomWall>
    </div>
  );
}
