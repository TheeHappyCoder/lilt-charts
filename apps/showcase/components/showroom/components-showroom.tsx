'use client';

import { ToolTraceDemo } from '@lilt-ui/registry/ui';
import { useMemo, useState } from 'react';
import { componentDocs, componentPath, componentShelves } from '@/lib/component-docs';
import { RegistryTile, type RegistryTileItem } from './registry-tile';
import {
  ShowroomFeature,
  ShowroomGroupHeader,
  ShowroomIntro,
  ShowroomToolbar,
  ShowroomWall,
  useGridCols,
  type ShowroomFilter,
} from './showroom-wall';

const FEATURE_ID = 'tool-trace';

const items: readonly RegistryTileItem[] = componentDocs.map((doc) => ({
  id: doc.id,
  href: componentPath(doc),
  title: doc.title,
  shelf: doc.shelf,
  lede: doc.lede,
  component: doc.component,
  demo: doc.demo,
  kind: 'dom',
  layout: 'center',
  backdrop: doc.backdrop,
  controls: doc.controls,
  stage: doc.stage,
  surfaceProp: doc.surfaceProp,
  line: 'components',
}));

const groups = componentShelves
  .map((shelf) => ({
    key: shelf.toLowerCase(),
    label: shelf,
    items: items.filter((item) => item.shelf === shelf),
  }))
  .filter((group) => group.items.length > 0);

/**
 * The Components showroom: every copy-in interface piece, live on its own plinth, grouped by
 * shelf with filter tabs and adjustable grid density.
 */
export function ComponentsShowroom() {
  const [active, setActive] = useState('all');
  const density = useGridCols('lilt-components-cols', 3);

  const filters: ShowroomFilter[] = useMemo(
    () => [
      { id: 'all', label: 'All', count: items.length },
      ...groups.map((group) => ({ id: group.key, label: group.label, count: group.items.length })),
    ],
    [],
  );

  const visibleGroups = useMemo(
    () => (active === 'all' ? groups : groups.filter((group) => group.key === active)),
    [active],
  );

  const feature = items.find((item) => item.id === FEATURE_ID);
  let seen = 0;

  return (
    <div className="lilt-showroom">
      <ShowroomIntro
        claim="Interface pieces,"
        dim="built to steal."
        lede="Real product spots with one detail worth keeping — never generic primitives. Copy the source in with the shadcn CLI; React and Motion are the only dependencies."
      />

      <ShowroomToolbar
        filters={filters}
        active={active}
        onSelect={setActive}
        label="Filter components"
        cols={density.cols}
        canNarrow={density.canNarrow}
        canWiden={density.canWiden}
        onNarrow={density.narrow}
        onWiden={density.widen}
      />

      <ShowroomWall cols={density.cols}>
        {active === 'all' && feature ? (
          <ShowroomFeature
            href={feature.href}
            tag="Copy-in source · React + Motion"
            title={feature.title}
            line={feature.lede}
            cta={`Open ${feature.title}`}
            visualMode="right"
            visual={<ToolTraceDemo />}
          />
        ) : null}

        {visibleGroups.map((group) => (
          <section
            key={group.key}
            className="lilt-showroom-group"
            id={group.key}
            aria-labelledby={`components-${group.key}-title`}
          >
            <ShowroomGroupHeader
              id={`components-${group.key}-title`}
              label={group.label}
              count={group.items.length}
              singular="component"
              plural="components"
            />
            <div className="lilt-showroom-grid">
              {group.items.map((item, position) => (
                <RegistryTile key={item.id} item={item} eager={seen++ < 6} index={position} />
              ))}
            </div>
          </section>
        ))}
      </ShowroomWall>
    </div>
  );
}
