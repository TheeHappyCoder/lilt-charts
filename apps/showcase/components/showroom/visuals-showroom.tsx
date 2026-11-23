'use client';

import * as visuals from '@lilt-ui/registry/visuals';
import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from 'react';
import { ArrowSwap } from '@/components/craft/roll';
import { visualDocs, visualPath, visualShelves, type VisualDoc } from '@/lib/visual-docs';
import {
  ShowroomFeature,
  ShowroomGroupHeader,
  ShowroomIntro,
  ShowroomToolbar,
  ShowroomWall,
  useGridCols,
  type ShowroomFilter,
} from './showroom-wall';

type VisualRegistry = Record<string, ComponentType<Record<string, unknown>>>;
const registry = visuals as unknown as VisualRegistry;

const FEATURE_ID = 'effort-dial';

const groups = visualShelves
  .map((shelf) => ({
    key: shelf.toLowerCase(),
    label: shelf,
    items: visualDocs.filter((doc) => doc.shelf === shelf),
  }))
  .filter((group) => group.items.length > 0);

/**
 * One Visual tile: a warm plinth holding the self-scaling 3:2 visual natively via container
 * queries, lazy-mounted as it nears the viewport.
 */
function VisualTile({
  doc,
  eager = false,
  index = 0,
}: {
  doc: VisualDoc;
  eager?: boolean;
  index?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(eager);
  const Comp = registry[doc.component];

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '220px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <Link
      href={visualPath(doc)}
      className="lilt-plinth lilt-showroom-tile"
      data-rv="media"
      style={{ '--i': index % 4 } as CSSProperties}
    >
      <span ref={ref} className="lilt-media lilt-visual-tile__media" aria-hidden="true">
        {visible && Comp ? (
          <span className="lilt-visual-tile__mount">
            <Comp />
          </span>
        ) : null}
      </span>

      <span className="lilt-cap">
        <span className="lilt-cap__top">
          <span className="lilt-cap__title">
            <strong>{doc.title}</strong>
            <span className="lilt-chip" data-tone="wall">
              {doc.shelf}
            </span>
          </span>
          <span className="lilt-cap__end">
            <ArrowSwap />
          </span>
        </span>
        <span className="lilt-cap__desc">{doc.lede}</span>
      </span>
    </Link>
  );
}

/**
 * The Visuals showroom: all 14 tactile glass-and-metal living visuals on plinths, grouped by
 * domain with filter tabs and adjustable grid density.
 */
export function VisualsShowroom() {
  const [active, setActive] = useState('all');
  const density = useGridCols('lilt-visuals-cols', 3);

  const filters: ShowroomFilter[] = useMemo(
    () => [
      { id: 'all', label: 'All', count: visualDocs.length },
      ...groups.map((group) => ({ id: group.key, label: group.label, count: group.items.length })),
    ],
    [],
  );

  const visibleGroups = useMemo(
    () => (active === 'all' ? groups : groups.filter((group) => group.key === active)),
    [active],
  );

  const feature = visualDocs.find((doc) => doc.id === FEATURE_ID);
  let seen = 0;

  return (
    <div className="lilt-showroom">
      <ShowroomIntro
        claim="Living visuals,"
        dim="machined in glass."
        lede="Self-contained 3:2 product artworks for feature cards and landing pages. Copy one file with the shadcn CLI — React 19 is the only dependency."
      />

      <ShowroomToolbar
        filters={filters}
        active={active}
        onSelect={setActive}
        label="Filter visuals"
        cols={density.cols}
        canNarrow={density.canNarrow}
        canWiden={density.canWiden}
        onNarrow={density.narrow}
        onWiden={density.widen}
      />

      <ShowroomWall cols={density.cols}>
        {active === 'all' && feature ? (
          <ShowroomFeature
            href={visualPath(feature)}
            tag="Copy-in source · Zero dependencies"
            title={feature.title}
            line={feature.lede}
            cta={`Open ${feature.title}`}
            visualMode="right"
            visual={
              <div style={{ width: 'min(520px, 100%)' }}>
                <visuals.EffortDial />
              </div>
            }
          />
        ) : null}

        {visibleGroups.map((group) => (
          <section
            key={group.key}
            className="lilt-showroom-group"
            id={group.key}
            aria-labelledby={`visuals-${group.key}-title`}
          >
            <ShowroomGroupHeader
              id={`visuals-${group.key}-title`}
              label={group.label}
              count={group.items.length}
              singular="visual"
              plural="visuals"
            />
            <div className="lilt-showroom-grid">
              {group.items.map((doc, position) => (
                <VisualTile key={doc.id} doc={doc} eager={seen++ < 6} index={position} />
              ))}
            </div>
          </section>
        ))}
      </ShowroomWall>
    </div>
  );
}
