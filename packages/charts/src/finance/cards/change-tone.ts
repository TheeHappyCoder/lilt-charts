import { tint } from '../../cards/sculpted-geometry';
import { CANDLE_DOWN, CANDLE_UP } from '../candle-geometry';

/**
 * A change's color: up green and down red, deeper the further it moved, reaching full strength at
 * `scale`. No change is a quiet neutral, so a flat tile never reads as a gain or a loss.
 */
export function changeTone(change: number | null, scale: number): string {
  if (change === null) return 'var(--lilt-muted)';
  if (change === 0) return tint('var(--lilt-muted)', 36);
  const strength = Math.min(1, Math.abs(change) / Math.max(Number.EPSILON, scale));
  return tint(change > 0 ? CANDLE_UP : CANDLE_DOWN, 28 + strength * 72);
}

const percentText = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** A signed percent with a true minus sign: +1.2%, −0.4%. */
export function signedPercent(
  change: number,
  format: (value: number) => string = (value) => percentText.format(value),
): string {
  return `${change < 0 ? '−' : '+'}${format(Math.abs(change))}`;
}

/** Percent text for a locale, one decimal place. */
export function percentFormat(locale: string): (value: number) => string {
  const format = new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return (value) => format.format(value);
}
