'use client';

import { AsciiGlobe } from '@lilt-ui/registry';
import { useMemo, useState } from 'react';
import { asciiScenes, asciiShelves } from '@/lib/ascii-scenes';
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

const FEATURE_ID = 'globe';

const items: readonly RegistryTileItem[] = asciiScenes.map((scene) => ({
  id: scene.id,
  href: `/ascii/${scene.id}`,
  title: scene.title,
  shelf: scene.shelf,
  lede: scene.lede,
  component: scene.component,
  demo: scene.demo,
  kind: scene.kind ?? 'canvas',
  layout: scene.layout ?? 'fill',
  backdrop: scene.backdrop,
  controls: scene.controls,
  stage: scene.stage,
  line: 'ascii',
}));

const groups = asciiShelves
  .map((shelf) => ({
    key: shelf.toLowerCase(),
    label: shelf,
    items: items.filter((item) => item.shelf === shelf),
  }))
  .filter((group) => group.items.length > 0);

/**
 * The ASCII showroom: every scene, text effect, chart and interface piece drawn in type,
 * grouped by shelf with live lazy-mounted previews and adjustable grid density.
 */
export function AsciiShowroom() {
  const [active, setActive] = useState('all');
  const density = useGridCols('lilt-ascii-cols', 3);

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
        claim="Everything in type,"
        dim="alive on screen."
        lede="Living scenes, text effects, charts and interface pieces drawn in glyphs. Each installs as source you own, rests off screen, and holds still for reduced motion."
      />

      <ShowroomToolbar
        filters={filters}
        active={active}
        onSelect={setActive}
        label="Filter ASCII scenes"
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
            tag="Copy-in source · Zero dependencies"
            title={feature.title}
            line={feature.lede}
            cta={`Open ${feature.title}`}
            visualMode="full"
            visual={
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  color: '#e8e6f2',
                  fontFamily: 'var(--font-mono), monospace',
                }}
              >
                <AsciiGlobe cellSize={12} />
              </div>
            }
          />
        ) : null}

        {visibleGroups.map((group) => (
          <section
            key={group.key}
            className="lilt-showroom-group"
            id={group.key}
            aria-labelledby={`ascii-${group.key}-title`}
          >
            <ShowroomGroupHeader
              id={`ascii-${group.key}-title`}
              label={group.label}
              count={group.items.length}
              singular="piece"
              plural="pieces"
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
