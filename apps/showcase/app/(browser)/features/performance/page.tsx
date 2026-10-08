import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import {
  PerformanceBenchmark,
  PerformancePlayground,
} from '@/components/performance/performance-lab';

export const metadata: Metadata = { title: 'Performance · Features' };

const reasons = [
  {
    title: 'Four points per pixel',
    body: 'A line with more points than the plot has pixels draws each pixel column’s first, last, lowest and highest point. The ink is identical, every drawn point is a real reading, and gaps and forecasts keep their edges.',
    code: 'decimate',
  },
  {
    title: 'Hover never re-reads your data',
    body: 'Moving the pointer finds the nearest row by binary search and updates only the marks that follow it. The plot, its paths and every formatted value are built once per data change.',
    code: null,
  },
  {
    title: 'Every number is real',
    body: 'Thinning only changes what is drawn. The headline, tiles, hover readouts, comparisons and exports read every row you pass.',
    code: null,
  },
] as const;

export default function Page() {
  return (
    <LabShell
      title="Performance"
      lede="Smooth from a hundred points to a hundred thousand. Every number on this page is measured in your browser."
    >
      <PerformancePlayground />
      <PerformanceBenchmark />
      <section className="lilt-perf-why" aria-labelledby="perf-why">
        <h2 id="perf-why">How it stays fast</h2>
        <div className="lilt-perf-why__grid">
          {reasons.map((reason) => (
            <article key={reason.title} className="lilt-perf-why__card">
              <h3>{reason.title}</h3>
              <p>{reason.body}</p>
              {reason.code ? <code>{reason.code}</code> : null}
            </article>
          ))}
        </div>
        <p className="lilt-perf-why__method">
          How we measure: each card mounts with motion off, and the time runs until its last change
          reaches the screen. Then a pointer sweeps across it for 60 frames, and the median frame is
          reported. A frame can be no shorter than your display allows: 8 ms at 120 Hz, 17 ms at 60
          Hz. Results vary with your device, browser and what else is running.
        </p>
      </section>
    </LabShell>
  );
}
