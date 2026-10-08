/**
 * Pure finance helpers. Each takes values in time order and returns an array of the same length,
 * with `null` wherever the input is missing or the window has not filled yet, so results line up
 * with the rows they came from.
 */

export type Series = readonly (number | null | undefined)[];

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function checkPeriod(name: string, period: number): void {
  if (!Number.isInteger(period) || period < 1)
    throw new Error(`Lilt ${name} period must be a positive integer; received ${period}.`);
}

/** Simple moving average over the last `period` values; a gap in the window yields null. */
export function sma(values: Series, period: number): (number | null)[] {
  checkPeriod('sma', period);
  const result: (number | null)[] = [];
  let sum = 0;
  let count = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (finite(value)) {
      sum += value;
      count += 1;
    }
    const leaving = index - period >= 0 ? values[index - period] : undefined;
    if (index - period >= 0 && finite(leaving)) {
      sum -= leaving;
      count -= 1;
    }
    result.push(index >= period - 1 && count === period ? sum / period : null);
  }
  return result;
}

/**
 * Exponential moving average, seeded with the simple average of the first `period` values.
 * A missing value reads null and leaves the average where it was.
 */
export function ema(values: Series, period: number): (number | null)[] {
  checkPeriod('ema', period);
  const alpha = 2 / (period + 1);
  const result: (number | null)[] = [];
  let average: number | null = null;
  const seed: number[] = [];
  for (const value of values) {
    if (!finite(value)) {
      result.push(null);
      continue;
    }
    if (average === null) {
      seed.push(value);
      if (seed.length === period) average = seed.reduce((sum, item) => sum + item, 0) / period;
      result.push(average);
      continue;
    }
    average = value * alpha + average * (1 - alpha);
    result.push(average);
  }
  return result;
}

/**
 * Relative strength index with Wilder's smoothing, from 0 to 100. The first reading needs
 * `period` changes, so it lands on index `period`.
 */
export function rsi(values: Series, period = 14): (number | null)[] {
  checkPeriod('rsi', period);
  const result: (number | null)[] = values.map(() => null);
  let previous: number | null = null;
  let gains = 0;
  let losses = 0;
  let changes = 0;
  let averageGain = 0;
  let averageLoss = 0;
  values.forEach((value, index) => {
    if (!finite(value)) return;
    if (previous === null) {
      previous = value;
      return;
    }
    const change = value - previous;
    previous = value;
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    changes += 1;
    if (changes <= period) {
      gains += gain;
      losses += loss;
      if (changes < period) return;
      averageGain = gains / period;
      averageLoss = losses / period;
    } else {
      averageGain = (averageGain * (period - 1) + gain) / period;
      averageLoss = (averageLoss * (period - 1) + loss) / period;
    }
    result[index] =
      averageLoss === 0
        ? averageGain === 0
          ? 50
          : 100
        : 100 - 100 / (1 + averageGain / averageLoss);
  });
  return result;
}

export interface MacdResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

/** Moving average convergence divergence: fast EMA minus slow EMA, its signal EMA, and the gap. */
export function macd(values: Series, fast = 12, slow = 26, signal = 9): MacdResult {
  if (fast >= slow) throw new Error('Lilt macd needs a fast period shorter than the slow period.');
  const fastLine = ema(values, fast);
  const slowLine = ema(values, slow);
  const line = values.map((_, index) => {
    const a = fastLine[index];
    const b = slowLine[index];
    return a === null || b === null ? null : a - b;
  });
  const signalLine = ema(line, signal);
  return {
    macd: line,
    signal: signalLine,
    histogram: line.map((value, index) => {
      const other = signalLine[index];
      return value === null || other === null ? null : value - other;
    }),
  };
}

export interface BollingerResult {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

/** Bollinger bands: a simple average with bands `deviations` population deviations either side. */
export function bollinger(values: Series, period = 20, deviations = 2): BollingerResult {
  const middle = sma(values, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  middle.forEach((mean, index) => {
    if (mean === null) {
      upper.push(null);
      lower.push(null);
      return;
    }
    let squares = 0;
    for (let offset = index - period + 1; offset <= index; offset += 1)
      squares += ((values[offset] as number) - mean) ** 2;
    const spread = Math.sqrt(squares / period) * deviations;
    upper.push(mean + spread);
    lower.push(mean - spread);
  });
  return { middle, upper, lower };
}

/** How far each value sits below the highest so far: 0 at a new high, −0.05 five percent below. */
export function drawdown(values: Series): (number | null)[] {
  let peak = -Infinity;
  return values.map((value) => {
    if (!finite(value)) return null;
    peak = Math.max(peak, value);
    return peak > 0 ? value / peak - 1 : 0;
  });
}

/** Change from the first present value as a fraction, so series of different sizes compare. */
export function rebase(values: Series): (number | null)[] {
  const base = values.find(finite);
  return values.map((value) =>
    finite(value) && base !== undefined && base !== 0 ? value / base - 1 : null,
  );
}

export interface BookLevel {
  price: number;
  size: number;
}

export interface DepthLevel {
  price: number;
  /** Cumulative bid size from the best bid down to this price; null on the ask side. */
  bid: number | null;
  /** Cumulative ask size from the best ask up to this price; null on the bid side. */
  ask: number | null;
  /** Size resting at exactly this price. */
  size: number;
  side: 'bid' | 'ask';
}

export interface DepthSummary {
  /** Every level in ascending price, bids then asks. */
  levels: DepthLevel[];
  bestBid: number | null;
  bestAsk: number | null;
  mid: number | null;
  spread: number | null;
  bidDepth: number;
  askDepth: number;
}

function checkBook(side: string, levels: readonly BookLevel[]): void {
  for (const level of levels)
    if (!finite(level.price) || !finite(level.size) || level.size < 0)
      throw new Error(
        `Lilt order book ${side} need finite prices and non-negative sizes; received ${level.price} × ${level.size}.`,
      );
}

/**
 * Cumulative depth on each side of the book. Bids accumulate from the best (highest) bid down,
 * asks from the best (lowest) ask up. Prices at one level merge.
 */
export function depthLevels(bids: readonly BookLevel[], asks: readonly BookLevel[]): DepthSummary {
  checkBook('bids', bids);
  checkBook('asks', asks);
  const merge = (levels: readonly BookLevel[]) => {
    const sizes = new Map<number, number>();
    for (const level of levels) sizes.set(level.price, (sizes.get(level.price) ?? 0) + level.size);
    return [...sizes].map(([price, size]) => ({ price, size }));
  };
  const bidLevels = merge(bids).sort((a, b) => b.price - a.price);
  const askLevels = merge(asks).sort((a, b) => a.price - b.price);
  const bestBid = bidLevels[0]?.price ?? null;
  const bestAsk = askLevels[0]?.price ?? null;
  if (bestBid !== null && bestAsk !== null && bestBid >= bestAsk)
    throw new Error(`Lilt order book is crossed: best bid ${bestBid} ≥ best ask ${bestAsk}.`);
  let bidTotal = 0;
  const bidRows: DepthLevel[] = bidLevels.map((level) => {
    bidTotal += level.size;
    return { price: level.price, bid: bidTotal, ask: null, size: level.size, side: 'bid' };
  });
  let askTotal = 0;
  const askRows: DepthLevel[] = askLevels.map((level) => {
    askTotal += level.size;
    return { price: level.price, bid: null, ask: askTotal, size: level.size, side: 'ask' };
  });
  return {
    levels: [...bidRows.reverse(), ...askRows],
    bestBid,
    bestAsk,
    mid: bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null,
    spread: bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null,
    bidDepth: bidTotal,
    askDepth: askTotal,
  };
}
