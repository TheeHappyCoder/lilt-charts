'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Count } from '@/components/craft/label';
import { ArrowSwap, Roll } from '@/components/craft/roll';
import { IconLive } from '@/components/craft/status-icon';

const LEVELS = [2, 3, 4] as const;
export type GridCols = (typeof LEVELS)[number];

/** Remembers the reader's preferred showroom column density across visits. */
export function useGridCols(storageKey: string, initial: GridCols = 3) {
  const [cols, setCols] = useState<GridCols>(initial);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (saved === 2 || saved === 3 || saved === 4) {
        setCols(saved);
      }
    } catch {
      // Storage unavailable in private mode.
    }
  }, [storageKey]);

  const step = (delta: -1 | 1) => {
    setCols((current) => {
      const index = LEVELS.indexOf(current);
      const next = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, index + delta))]!;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // Ignore storage write errors.
      }
      return next;
    });
  };

  return {
    cols,
    canNarrow: cols > LEVELS[0],
    canWiden: cols < LEVELS[LEVELS.length - 1]!,
    narrow: () => step(-1),
    widen: () => step(1),
  };
}

/** Spacious two-tone showroom heading with a right-side summary, matching marksteyn.dev/work. */
export function ShowroomIntro({
  claim,
  dim,
  lede,
  action,
}: {
  claim: ReactNode;
  dim: ReactNode;
  lede: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="lilt-showroom-intro">
      <h1>
        <span className="lilt-rise">
          <span>{claim}</span>
        </span>
        <span className="lilt-rise">
          <span className="lilt-dim">{dim}</span>
        </span>
      </h1>
      <div className="lilt-showroom-intro__side">
        <p>{lede}</p>
        {action}
      </div>
    </section>
  );
}

export interface ShowroomFilter {
  id: string;
  label: string;
  count: number;
}

/** Sticky filter strip and grid-density control spanning `--gut`. */
export function ShowroomToolbar({
  filters,
  active,
  onSelect,
  label,
  cols,
  canNarrow,
  canWiden,
  onNarrow,
  onWiden,
}: {
  filters: readonly ShowroomFilter[];
  active: string;
  onSelect: (id: string) => void;
  label: string;
  cols: GridCols;
  canNarrow: boolean;
  canWiden: boolean;
  onNarrow: () => void;
  onWiden: () => void;
}) {
  return (
    <div className="lilt-showroom-toolbar">
      <div className="lilt-showroom-filters" role="group" aria-label={label}>
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            aria-pressed={active === filter.id}
            onClick={() => onSelect(filter.id)}
          >
            {filter.label}
            <Count n={filter.count} />
          </button>
        ))}
      </div>
      <div className="lilt-showroom-sizes" role="group" aria-label="Grid density">
        <button type="button" aria-label="Fewer per row" disabled={!canNarrow} onClick={onNarrow}>
          −
        </button>
        <span>{cols} wide</span>
        <button type="button" aria-label="More per row" disabled={!canWiden} onClick={onWiden}>
          +
        </button>
      </div>
    </div>
  );
}

/** The one dark hero card leading a showroom wall when unfiltered. */
export function ShowroomFeature({
  href,
  tag,
  title,
  line,
  cta,
  visual,
  visualMode = 'full',
}: {
  href: string;
  tag: string;
  title: string;
  line: string;
  cta: string;
  visual: ReactNode;
  visualMode?: 'full' | 'right' | 'chart';
}) {
  return (
    <Link href={href} className="lilt-showroom-feature lilt-dusk dark">
      <div
        className={[
          'lilt-showroom-feature__visual',
          visualMode === 'right' ? 'lilt-showroom-feature__visual--right' : '',
          visualMode === 'chart' ? 'lilt-showroom-feature__visual--chart' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      >
        {visual}
      </div>
      <div className="lilt-showroom-feature__scrim" aria-hidden="true" />
      <div className="lilt-showroom-feature__body">
        <span className="lilt-showroom-feature__copy">
          <span className="lilt-showroom-feature__tag">
            <IconLive />
            {tag}
          </span>
          <strong>{title}</strong>
          <span className="lilt-showroom-feature__line">{line}</span>
        </span>
        <span className="lilt-btn" data-tone="light">
          <Roll>{cta}</Roll>
          <ArrowSwap />
        </span>
      </div>
    </Link>
  );
}

/** Hairline group divider: title left, rule across, tabular count right. */
export function ShowroomGroupHeader({
  id,
  label,
  count,
  singular,
  plural,
}: {
  id?: string;
  label: string;
  count: number;
  singular: string;
  plural: string;
}) {
  return (
    <h2 id={id} className="lilt-showroom-group__head">
      <span>{label}</span>
      <i aria-hidden="true" />
      <em>
        {count} {count === 1 ? singular : plural}
      </em>
    </h2>
  );
}

/** Wall container driving `--cols` and dense mode. */
export function ShowroomWall({ cols, children }: { cols: GridCols; children: ReactNode }) {
  return (
    <div
      className="lilt-showroom-wall"
      style={{ '--cols': cols } as CSSProperties}
      data-size={cols >= 4 ? 'dense' : 'regular'}
    >
      {children}
    </div>
  );
}
