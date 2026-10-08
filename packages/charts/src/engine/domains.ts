import { extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import type { ChartSeries, ChartYConfig } from '../types';
import type { NormalizedData } from './normalize';

/** A row's finite companion values for one series; fields share the series' unit. */
export function fieldValues(fields: Readonly<Record<string, number | null>> | undefined): number[] {
  const values: number[] = [];
  for (const id in fields) {
    const value = fields[id];
    if (value !== null && value !== undefined) values.push(value);
  }
  return values;
}

export function computeYDomain<T>(
  data: NormalizedData<T>,
  series: readonly ChartSeries<T>[],
  config: ChartYConfig = {},
): readonly [number, number] {
  if (config.domain) {
    const [min, max] = config.domain;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      throw new Error('Invalid y domain: expected two finite values in strictly ascending order.');
    }
    return [min, max];
  }

  const values = data.rows.flatMap((row) =>
    series.flatMap((descriptor) => {
      const value = row.values[descriptor.id];
      return [
        // A series these rows do not carry yet (mid-transition) has no value, not a zero.
        ...(value === null || value === undefined ? [] : [value]),
        ...fieldValues(row.fields[descriptor.id]),
      ];
    }),
  );
  if (values.length === 0) throw new Error('No values for this period.');
  for (const value of config.include ?? []) if (Number.isFinite(value)) values.push(value);
  if (config.scale === 'log') return logDomain(values);

  const includeZero = config.includeZero ?? true;
  // A loop, not Math.min(...values): spreading a large series overflows the call stack.
  let [min, max] = extent(values) as [number, number];

  if (min === 0 && max === 0) return [0, 1];

  if (min === max) {
    if (includeZero) {
      if (min > 0) {
        min = 0;
        max += Math.max(max * 0.08, 1e-6);
      } else {
        max = 0;
        min -= Math.max(Math.abs(min) * 0.08, 1e-6);
      }
    } else if (min === 0) {
      return [-1, 1];
    } else {
      const pad = Math.max(Math.abs(min) * 0.05, 1e-6);
      min -= pad;
      max += pad;
    }
  } else {
    if (includeZero) {
      min = Math.min(min, 0);
      max = Math.max(max, 0);
    }
    const span = max - min;
    if (min < 0) min -= span * 0.08;
    if (max > 0) max += span * 0.08;
  }

  const nice = scaleLinear()
    .domain([min, max])
    .nice(config.ticks ?? 5)
    .domain();
  return [nice[0], nice[1]];
}

/** A log domain padded by a few percent each way; ticks come from the scale itself. */
function logDomain(values: readonly number[]): readonly [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value <= 0)
      throw new Error(
        `Invalid y value ${value} for a log scale: every plotted value must be positive.`,
      );
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (min === max) return [min / 1.1, max * 1.1];
  const pad = Math.pow(max / min, 0.06);
  return [min / pad, max * pad];
}

/** The smallest of 1, 2, 2.5, 5 × 10ⁿ at or above `value`. */
export function niceCeil(value: number): number {
  if (!(value > 0) || !Number.isFinite(value)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const multiple of [1, 2, 2.5, 5, 10]) {
    if (multiple * power >= value * (1 - 1e-9)) return multiple * power;
  }
  return 10 * power;
}

/**
 * A second value scale that shares the primary scale's gridlines: every secondary value is the
 * primary value times one factor, so zero and every tick line up, and the factor is chosen so
 * the secondary ticks land on round numbers. Returns null when the primary domain excludes zero
 * or the secondary values cannot fit on the same side of it.
 */
export function alignedSecondaryFactor(
  primary: readonly [number, number],
  primaryStep: number,
  values: readonly number[],
): number | null {
  if (!values.length || !(primaryStep > 0) || primary[0] > 0 || primary[1] < 0) return null;
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  if ((max > 0 && primary[1] <= 0) || (min < 0 && primary[0] >= 0)) return null;
  // A little headroom so the highest point never touches the plot edge.
  const needed = Math.max(
    max > 0 ? (max * 1.05) / primary[1] : 0,
    min < 0 ? (min * 1.05) / primary[0] : 0,
  );
  if (needed === 0) return 1 / primaryStep;
  return niceCeil(needed * primaryStep) / primaryStep;
}
