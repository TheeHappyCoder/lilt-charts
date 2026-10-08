'use client';

import { AreaChartCard, LineChartCard, type ChartMotion } from '@lilt-ui/charts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useChartSettings } from '@/components/docs/chart-settings';
import { CopyButton } from '@/components/docs/docs-example';
import { Segmented } from '@/components/ui/segmented';
import {
  benchRows,
  drawnPoints,
  nextFrame,
  percentile,
  settle,
  sweepHover,
  whenVisible,
  type BenchRow,
} from '@/lib/benchmark';

const SIZES = [1_000, 10_000, 50_000, 100_000] as const;
type Size = (typeof SIZES)[number];
const sizeLabel = (size: number) => `${size / 1000}k`;
const count = new Intl.NumberFormat('en-US');
const ms = {
  style: 'unit',
  unit: 'millisecond',
  unitDisplay: 'short',
  maximumFractionDigits: 0,
} as const;
/** Measuring render cost, not animation length, so measured cards never animate. */
const STILL: ChartMotion = 'none';

/** Every card here follows the site-wide look, as every other example does. */
function useLook() {
  const { settings } = useChartSettings();
  return {
    palette: settings.palette,
    surface: settings.surface,
    background: settings.background,
    axis: settings.axis,
    numberStyle: settings.numberStyle,
  };
}

type Kind = 'line' | 'lines' | 'stacked' | 'every';

const kinds: Record<Kind, { label: string; decimate: boolean }> = {
  line: { label: 'Line', decimate: true },
  lines: { label: '3 lines', decimate: true },
  stacked: { label: 'Stacked area', decimate: true },
  every: { label: 'Line, every row drawn', decimate: false },
};

const three = [
  { key: 'a', label: 'A' },
  { key: 'b', label: 'B' },
  { key: 'c', label: 'C' },
] as const;

/** The card a case measures. Line and 3 lines share a card; stacked area stacks the three. */
function BenchCard({
  kind,
  rows,
  height,
  decimate = kinds[kind].decimate,
}: {
  kind: Kind;
  rows: readonly BenchRow[];
  height: number;
  decimate?: boolean;
}) {
  const look = useLook();
  const common = {
    ...look,
    data: rows,
    x: 't' as const,
    height,
    motion: STILL,
    decimate,
    // A reading, not a total: the headline and tiles show the latest value.
    aggregate: 'last' as const,
    valueFormat: { maximumFractionDigits: 0 },
  };
  if (kind === 'stacked')
    return (
      <AreaChartCard {...common} title={`${count.format(rows.length)} rows`} stack series={three} />
    );
  return (
    <LineChartCard
      {...common}
      title={`${count.format(rows.length)} rows`}
      series={kind === 'lines' ? three : [{ key: 'a', label: 'A' }]}
    />
  );
}

/**
 * Hover the card to read its frame time live. Only frames that follow a pointer move count, so a
 * resting pointer cannot flatter the number; the last reading stays until the pointer leaves.
 */
function useFrameMeter() {
  const [frame, setFrame] = useState<number | null>(null);
  const active = useRef(false);
  const moved = useRef(false);
  const handle = useRef(0);
  useEffect(() => () => cancelAnimationFrame(handle.current), []);
  const start = () => {
    if (active.current) return;
    active.current = true;
    const deltas: number[] = [];
    let last = 0;
    let shown = 0;
    // A move is handled in the frame it arrives; that frame's length shows at the next tick.
    let measuring = false;
    const tick = (time: number) => {
      if (!active.current) return;
      if (last && measuring) {
        deltas.push(time - last);
        if (deltas.length > 30) deltas.shift();
      }
      measuring = moved.current;
      moved.current = false;
      last = time;
      if (time - shown > 250 && deltas.length >= 5) {
        shown = time;
        setFrame(
          percentile(
            [...deltas].sort((a, b) => a - b),
            0.5,
          ),
        );
      }
      handle.current = requestAnimationFrame(tick);
    };
    handle.current = requestAnimationFrame(tick);
  };
  const stop = () => {
    active.current = false;
    cancelAnimationFrame(handle.current);
    setFrame(null);
  };
  const move = () => {
    moved.current = true;
  };
  return { frame, start, stop, move };
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="lilt-perf__stat">
      <dt>{label}</dt>
      <dd>
        {value}
        {note ? <span>{note}</span> : null}
      </dd>
    </div>
  );
}

/** Change the size and drawing, then hover: the numbers below the card are measured live. */
export function PerformancePlayground() {
  const [size, setSize] = useState<Size>(50_000);
  const [lines, setLines] = useState<'1' | '3'>('1');
  const [decimate, setDecimate] = useState(true);
  const [rows, setRows] = useState<BenchRow[] | null>(null);
  const [drawMs, setDrawMs] = useState<number | null>(null);
  const [drawn, setDrawn] = useState<number | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const pending = useRef<number | null>(null);
  const meter = useFrameMeter();

  // The first card waits for the page, so its time is the card's alone.
  useEffect(() => {
    const data = benchRows(50_000);
    pending.current = performance.now();
    setRows(data);
  }, []);

  // After each change has committed, time it to the screen and count what was drawn.
  useEffect(() => {
    const host = hostRef.current;
    const start = pending.current;
    if (!host || start === null || !rows) return;
    pending.current = null;
    let live = true;
    void settle(host, start).then((time) => {
      if (!live) return;
      setDrawMs(time);
      setDrawn(drawnPoints(host));
    });
    return () => {
      live = false;
    };
  }, [rows, lines, decimate]);

  const change = (apply: () => void) => {
    pending.current = performance.now();
    apply();
  };
  const total = rows ? rows.length * Number(lines) : 0;
  const fps = meter.frame ? Math.round(1000 / meter.frame) : null;

  return (
    <section className="lilt-studio lilt-perf" aria-labelledby="perf-playground">
      <div className="lilt-studio__bar lilt-perf__bar">
        <h2 id="perf-playground" className="lilt-perf__title">
          Try it
        </h2>
        <div className="lilt-perf__control">
          <Segmented
            label="Points"
            value={String(size)}
            options={SIZES.map((value) => ({ value: String(value), label: sizeLabel(value) }))}
            onChange={(value) => {
              const next = Number(value) as Size;
              const data = benchRows(next);
              setSize(next);
              change(() => setRows(data));
            }}
          />
        </div>
        <div className="lilt-perf__control" data-narrow="">
          <Segmented
            label="Series"
            value={lines}
            options={[
              { value: '1', label: '1 line' },
              { value: '3', label: '3 lines' },
            ]}
            onChange={(value) => change(() => setLines(value))}
          />
        </div>
        <label className="lilt-studio__switch">
          <input
            type="checkbox"
            checked={decimate}
            onChange={(event) => {
              const next = event.currentTarget.checked;
              change(() => setDecimate(next));
            }}
          />
          <span className="lilt-studio__switch-track" aria-hidden="true" />
          Decimate
        </label>
        <span className="lilt-studio__code lilt-perf__code">
          <code>{`decimate={${decimate}}`}</code>
        </span>
      </div>

      <div
        className="lilt-studio__stage lilt-perf__stage"
        onPointerEnter={meter.start}
        onPointerMove={meter.move}
        onPointerLeave={meter.stop}
      >
        <div ref={hostRef} className="lilt-perf__subject">
          {rows ? (
            <BenchCard
              kind={lines === '3' ? 'lines' : 'line'}
              rows={rows}
              height={300}
              decimate={decimate}
            />
          ) : null}
        </div>
        <dl className="lilt-perf__stats" aria-live="polite">
          <Stat label="Points" value={count.format(total)} />
          <Stat
            label="Drawn"
            value={drawn === null ? '…' : count.format(drawn)}
            note={drawn !== null && total ? `${Math.round((drawn / total) * 100)}%` : undefined}
          />
          <Stat
            label="Ready in"
            value={drawMs === null ? '…' : `${count.format(Math.round(drawMs))} ms`}
          />
          <Stat
            label="Hover frame"
            value={meter.frame === null ? 'Hover the chart' : `${Math.round(meter.frame)} ms`}
            note={fps ? `${fps} fps` : undefined}
          />
        </dl>
      </div>
    </section>
  );
}

interface CaseResult {
  kind: Kind;
  points: number;
  drawMs: number | null;
  hoverP50: number | null;
  hoverP95: number | null;
  longTaskMs: number | null;
}

/** One row per size, one field per kind, for the results cards. */
function resultRows(results: readonly CaseResult[], field: 'drawMs' | 'hoverP50') {
  return SIZES.map((size) => {
    const row: Record<string, string | number | null> = { size: sizeLabel(size) };
    for (const kind of Object.keys(kinds) as Kind[])
      row[kind] =
        results.find((item) => item.kind === kind && item.points === size)?.[field] ?? null;
    return row as { size: string } & Record<Kind, number | null>;
  });
}

/**
 * Every case mounts a fresh card on the stage, waits until it is on screen, then sweeps a pointer
 * across it for 60 frames. Results fill the cards as each case finishes.
 */
export function PerformanceBenchmark() {
  const look = useLook();
  const [withEvery, setWithEvery] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CaseResult[]>([]);
  const [bench, setBench] = useState<{ kind: Kind; rows: BenchRow[]; id: number } | null>(null);
  const [step, setStep] = useState<{ index: number; total: number; label: string } | null>(null);
  const [device, setDevice] = useState('');
  const [hidden, setHidden] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    const update = () => setHidden(document.visibilityState !== 'visible');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    const cores = navigator.hardwareConcurrency;
    setDevice(
      [cores ? `${cores} cores` : null, `${window.devicePixelRatio}× display`]
        .filter(Boolean)
        .join(' · '),
    );
    return () => {
      cancelled.current = true;
    };
  }, []);

  /** Mounts one case on the stage, times it to the screen, then sweeps a pointer across it. */
  async function measure(kind: Kind, points: number, id: number) {
    const host = hostRef.current!;
    setBench(null);
    await nextFrame();
    await nextFrame();
    const rows = benchRows(points);
    const start = performance.now();
    setBench({ kind, rows, id });
    const drawMs = await settle(host, start);
    const hover = drawMs === null || cancelled.current ? null : await sweepHover(host);
    return { drawMs, hover };
  }

  async function run() {
    const host = hostRef.current;
    if (!host || running) return;
    cancelled.current = false;
    setRunning(true);
    setResults([]);
    // Browsers skip painting what is off screen, which would flatter every number.
    host.scrollIntoView({ block: 'center' });
    const cases = (['line', 'lines', 'stacked', ...(withEvery ? ['every'] : [])] as Kind[]).flatMap(
      (kind) => SIZES.map((points) => ({ kind, points })),
    );
    // One unmeasured card first, so the first result is not the page warming up.
    setStep({ index: 0, total: cases.length, label: 'Warming up' });
    await measure('line', 1_000, -1);
    for (const [index, { kind, points }] of cases.entries()) {
      if (cancelled.current) break;
      const label = `${kinds[kind].label} · ${sizeLabel(points)}`;
      let measured: Awaited<ReturnType<typeof measure>> | null = null;
      // A case measured while the page was hidden or held back is thrown away and run again.
      for (let attempt = 0; attempt < 3 && !cancelled.current; attempt += 1) {
        if (document.visibilityState !== 'visible') {
          setStep({
            index: index + 1,
            total: cases.length,
            label: 'Paused until this tab is back',
          });
          await whenVisible();
        }
        setStep({ index: index + 1, total: cases.length, label });
        measured = await measure(kind, points, index * 3 + attempt);
        if (measured.drawMs !== null && !measured.hover?.throttled) break;
      }
      if (!measured || cancelled.current) break;
      const { drawMs, hover } = measured;
      setResults((all) => [
        ...all,
        {
          kind,
          points,
          drawMs: drawMs === null ? null : Math.round(drawMs),
          hoverP50: hover && !hover.throttled ? hover.p50 : null,
          hoverP95: hover && !hover.throttled ? hover.p95 : null,
          longTaskMs: hover?.longTaskMs ?? null,
        },
      ]);
    }
    setBench(null);
    setStep(null);
    setRunning(false);
  }

  const hoverRows = useMemo(() => resultRows(results, 'hoverP50'), [results]);
  const drawRows = useMemo(() => resultRows(results, 'drawMs'), [results]);
  const shownKinds = (Object.keys(kinds) as Kind[]).filter(
    (kind) => kind !== 'every' || withEvery || results.some((item) => item.kind === 'every'),
  );
  const resultSeries = shownKinds.map((kind) => ({
    key: kind,
    label: kinds[kind].label,
    dashed: kind === 'every' ? true : undefined,
  }));
  const idle = !running && results.length === 0;

  return (
    <section className="lilt-studio lilt-perf" aria-labelledby="perf-benchmark">
      <div className="lilt-studio__bar lilt-perf__bar">
        <h2 id="perf-benchmark" className="lilt-perf__title">
          Benchmark
        </h2>
        <button
          type="button"
          className="lilt-studio__primary"
          onClick={() => {
            if (running) cancelled.current = true;
            else void run();
          }}
        >
          {running ? 'Stop' : results.length ? 'Run again' : 'Run benchmark'}
        </button>
        <label className="lilt-studio__switch" data-disabled={running || undefined}>
          <input
            type="checkbox"
            checked={withEvery}
            disabled={running}
            onChange={(event) => setWithEvery(event.currentTarget.checked)}
          />
          <span className="lilt-studio__switch-track" aria-hidden="true" />
          Also draw every row
        </label>
        <p className="lilt-studio__note lilt-perf__note" role="status">
          {step && hidden
            ? 'Paused until this tab is back'
            : step
              ? step.index
                ? `${step.label} (${step.index} of ${step.total})`
                : step.label
              : results.length
                ? `Measured on this device${device ? ` · ${device}` : ''}`
                : 'About a minute. Keep the test card on screen while it runs.'}
        </p>
        {step ? (
          <span className="lilt-studio__progress" aria-hidden="true">
            <span style={{ width: `${(step.index / step.total) * 100}%` }} />
          </span>
        ) : null}
      </div>

      <div className="lilt-studio__stage lilt-perf__stage">
        <div className="lilt-perf__grid">
          <figure className="lilt-perf__cell">
            <figcaption>
              <span className="lilt-studio__chip">{step ? 'Measuring' : 'Test card'}</span>
            </figcaption>
            <div ref={hostRef} className="lilt-perf__bench">
              {bench ? (
                <BenchCard key={bench.id} kind={bench.kind} rows={bench.rows} height={220} />
              ) : (
                <p className="lilt-perf__placeholder">
                  {idle ? 'Each case appears here while it is measured.' : ' '}
                </p>
              )}
            </div>
          </figure>
          {idle ? (
            <div className="lilt-perf__waiting">
              <p>Hover frame time and time to draw, for every card and size, appear here.</p>
            </div>
          ) : (
            <>
              <LineChartCard
                {...look}
                title="Hover frame time"
                data={hoverRows}
                x="size"
                series={resultSeries}
                headlineSeries="line"
                aggregate="max"
                valueFormat={ms}
                target={{ value: 16.7, label: '60 fps' }}
                deltaTone="inverse"
                points
                loading={!results.length}
                height={220}
              />
              <LineChartCard
                {...look}
                title="Ready in"
                data={drawRows}
                x="size"
                series={resultSeries}
                headlineSeries="line"
                aggregate="max"
                valueFormat={ms}
                points
                loading={!results.length}
                height={220}
              />
            </>
          )}
          {idle ? null : <ResultsTable results={results} />}
        </div>
      </div>
    </section>
  );
}

function ResultsTable({ results }: { results: readonly CaseResult[] }) {
  const text = JSON.stringify(results, null, 2);
  return (
    <div className="lilt-perf__table">
      <div className="lilt-perf__table-head">
        <h3>Every case</h3>
        {results.length ? <CopyButton text={text} label="Copy results as JSON" compact /> : null}
      </div>
      {results.length ? (
        <table>
          <thead>
            <tr>
              <th scope="col">Card</th>
              <th scope="col">Points</th>
              <th scope="col">Ready</th>
              <th scope="col">Hover p50</th>
              <th scope="col">Hover p95</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={`${result.kind}-${result.points}`}>
                <th scope="row">{kinds[result.kind].label}</th>
                <td>{sizeLabel(result.points)}</td>
                <td>{result.drawMs === null ? '—' : `${count.format(result.drawMs)} ms`}</td>
                <td>{result.hoverP50 === null ? '—' : `${Math.round(result.hoverP50)} ms`}</td>
                <td>{result.hoverP95 === null ? '—' : `${Math.round(result.hoverP95)} ms`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="lilt-perf__placeholder">Times for every card and size land here.</p>
      )}
    </div>
  );
}
