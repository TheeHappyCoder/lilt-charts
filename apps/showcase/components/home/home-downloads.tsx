'use client';

import { StatCard } from '@lilt-ui/charts';
import { useMemo } from 'react';
import type { Downloads } from '@/lib/npm-downloads';

const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/**
 * Lilt's own npm downloads, drawn by Lilt: the running total in the fetched window, and
 * the total as it stood on any day the reader hovers.
 */
export function HomeDownloads({ downloads }: { downloads: Downloads }) {
  const rows = useMemo(
    () => downloads.days.map((day) => ({ ...day, date: new Date(`${day.day}T00:00:00Z`) })),
    [downloads],
  );
  return (
    <StatCard
      title="npm downloads"
      data={rows}
      x="date"
      value="total"
      aggregate="last"
      headline={downloads.total}
      caption={`since ${shortDate.format(new Date(`${downloads.since}T00:00:00Z`))}`}
      chart="area"
      height={64}
      numberStyle="flow"
      formatX={(value) => shortDate.format(value as Date)}
    />
  );
}
