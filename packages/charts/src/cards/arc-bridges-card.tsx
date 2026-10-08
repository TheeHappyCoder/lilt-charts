'use client';

import type { NumericKey, TextKey } from './keys';
import {
  ObservationsCard,
  seriesColor,
  type ObservationsCardProps,
  type ObservationScene,
} from './observations-card';
import { clamp, frame, ribbonMark, strokeRibbon, type Point } from './sculpted-geometry';
import { linkReadings, placeholderLinks } from './link-readings';
import { EmptyShapeContext } from '../lifecycle/chart-empty';

export interface ArcBridgesCardProps<Row, Key extends NumericKey<Row>>
  extends ObservationsCardProps<Row> {
  source: TextKey<Row>;
  target: TextKey<Row>;
  value: Key;
  /** Arch height as a fraction of the available plot height, 0.3–1. Default 0.85. */
  rise?: number;
  /** Maximum ribbon width in pixels, 4–28. Default 18. */
  thickness?: number;
}

export function arcBridgesLayout<Row>(
  data: readonly Row[],
  source: string,
  target: string,
  value: string,
  width: number,
  height: number,
  options: { rise?: number; thickness?: number; color?: string } = {},
): ObservationScene<Row> {
  const { names, links, error } = linkReadings(data, source, target, value);
  if (error) return { marks: [], error };
  if (!links.length) return { marks: [] };
  const size = frame(Math.max(width, names.length * 62), height);
  const base = size.height - 40;
  const x = (name: string) =>
    30 + (names.indexOf(name) / Math.max(1, names.length - 1)) * (size.width - 60);
  const max = Math.max(1, ...links.map((link) => link.value ?? 0));
  const rise = clamp(options.rise, 0.85, 0.3, 1),
    thickness = clamp(options.thickness, 18, 4, 28);
  const marks = links.flatMap((link, index) => {
    if (link.value === null || link.value === 0) return [];
    const a = x(link.source),
      b = x(link.target);
    const peak = Math.max(25, (Math.abs(a - b) / (size.width - 60)) * (base - 25) * rise);
    // Offset reverse links slightly so both directed rows remain inspectable.
    const sign = a < b ? 1 : 0.78;
    const points: Point[] = Array.from({ length: 49 }, (_, i) => {
      const t = i / 48;
      return [a + (b - a) * t, base - Math.sin(Math.PI * t) * peak * sign];
    });
    return [
      ribbonMark(
        {
          id: link.id,
          label: `${link.source} → ${link.target}`,
          datum: link.datum,
          value: link.value,
          group: link.source,
          color: options.color ?? seriesColor(names.indexOf(link.source)),
          layer: links.length - Math.abs(names.indexOf(link.source) - names.indexOf(link.target)),
          wave: index / links.length,
        },
        strokeRibbon(points, Math.max(2, (link.value / max) * thickness)),
      ),
    ];
  });
  return {
    ...size,
    marks,
    readings: links.map((link) => ({
      id: link.id,
      label: `${link.source} → ${link.target}`,
      value: link.value,
    })),
    labels: names.map((name) => ({ x: x(name), y: base + 24, text: name, anchor: 'middle' })),
    paths: [
      {
        id: 'baseline',
        d: `M30,${base + 5} H${size.width - 30}`,
        stroke: 'var(--lilt-muted)',
        enter: 'draw',
      },
    ],
    groups: names.map((name, i) => ({
      id: name,
      label: name,
      color: options.color ?? seriesColor(i),
      value: links
        .filter((link) => link.source === name)
        .reduce((sum, link) => sum + (link.value ?? 0), 0),
    })),
    note: 'Thicker bridges: more flow · Color follows the source · Nodes stay in first-seen order',
  };
}

export function ArcBridgesCard<Row, const Key extends NumericKey<Row>>({
  source,
  target,
  value,
  rise,
  thickness,
  color,
  height = 300,
  ...props
}: ArcBridgesCardProps<Row, Key>) {
  const options = { rise, thickness, color };
  return (
    <EmptyShapeContext.Provider value="wave">
      <ObservationsCard
        {...props}
        color={color}
        height={height}
        family="arc-bridges"
        layout={(data, width, h) =>
          arcBridgesLayout(data, source, target, value, width, h, options)
        }
        placeholder={(width, h) =>
          arcBridgesLayout(
            placeholderLinks,
            'source',
            'target',
            'value',
            width,
            h,
            options,
          ) as ObservationScene<Row>
        }
      />
    </EmptyShapeContext.Provider>
  );
}
