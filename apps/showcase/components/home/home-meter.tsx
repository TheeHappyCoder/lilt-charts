import type { Downloads } from '@/lib/npm-downloads';

const DAYS = 63;
const LEVELS = 12;
const count = new Intl.NumberFormat('en-US');
const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/**
 * Lilt's level meter, drawn from real npm downloads: one column per day, lit in segmented cells
 * like the bar card's Cells style. Nothing here is invented; with no data it is not drawn.
 */
export function HomeMeter({ downloads }: { downloads: Downloads | null }) {
  const days = downloads?.days.slice(-DAYS) ?? [];
  const peak = Math.max(0, ...days.map((day) => day.downloads));
  if (!days.length || !peak) return null;
  const first = days[0]!;
  const last = days.at(-1)!;
  const recent = days.reduce((sum, day) => sum + day.downloads, 0);
  return (
    <figure className="lilt-meter">
      <div
        className="lilt-meter__columns"
        role="img"
        aria-label={`${count.format(recent)} npm downloads from ${date.format(new Date(first.day))} to ${date.format(new Date(last.day))}, ${count.format(peak)} on the busiest day.`}
      >
        {days.map((day) => {
          const lit = Math.max(
            day.downloads > 0 ? 1 : 0,
            Math.round((day.downloads / peak) * LEVELS),
          );
          return (
            <span
              key={day.day}
              className="lilt-meter__column"
              title={`${date.format(new Date(day.day))}: ${count.format(day.downloads)}`}
            >
              {Array.from({ length: LEVELS }, (_, level) => (
                <i
                  key={level}
                  data-lit={level < lit || undefined}
                  style={{ '--l': level / (LEVELS - 1) } as React.CSSProperties}
                />
              ))}
            </span>
          );
        })}
      </div>
      <figcaption>
        <span>{date.format(new Date(first.day))}</span>
        <span>npm downloads, daily</span>
        <span>{date.format(new Date(last.day))}</span>
      </figcaption>
    </figure>
  );
}
