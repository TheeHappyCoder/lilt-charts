'use client';

import { usePathname } from 'next/navigation';
import { useChartSettings } from '@/components/docs/chart-settings';
import { ChartGlyph, hasGlyph } from '@/components/shell/chart-glyph';
import { routeFor } from '@/lib/routes';

/** A chart page's family, drawn as itself in the site's palette, beside its title. */
export function PageEmblem() {
  const pathname = usePathname();
  const { settings } = useChartSettings();
  const route = routeFor(pathname);
  if (route.pathname !== pathname || !hasGlyph(route.icon)) return null;
  return (
    <span
      className="lilt-emblem"
      data-lilt-palette={(settings.palette as string | undefined) ?? undefined}
      aria-hidden="true"
    >
      <ChartGlyph icon={route.icon} />
    </span>
  );
}
