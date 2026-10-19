/** Up to about `count` evenly spaced round values covering the domain, such as axis ticks. */
export function niceTicks(low: number, high: number, count: number): number[] {
  const span = high - low || Math.abs(high) || 1;
  const raw = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((value) => value >= raw)!;
  const ticks: number[] = [];
  for (let value = Math.ceil(low / step) * step; value <= high + step * 1e-9; value += step)
    ticks.push(Number(value.toFixed(10)));
  return ticks;
}
