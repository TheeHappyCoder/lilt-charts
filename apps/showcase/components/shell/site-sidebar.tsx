'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import DashboardSquare01Icon from '@hugeicons/core-free-icons/DashboardSquare01Icon';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useChartSettings } from '@/components/docs/chart-settings';
import type { RouteIcon } from '@/lib/routes';
import { ChartGlyph, hasGlyph } from './chart-glyph';
import { groupsByTab, icons, tabs, type Tab } from './nav-model';

const SPRING = { type: 'spring', stiffness: 560, damping: 44 } as const;
/** The chart gallery's own row, above the families; it has no route of its own in the nav. */
export const CHARTS_OVERVIEW = 'charts-overview';

/**
 * The open section's pages as a quiet list under small headings. The current page wears a soft
 * fill that glides from row to row.
 */
export function SiteSidebar({
  tab,
  activeId,
  mobile = false,
  onNavigate,
}: {
  tab: Tab;
  activeId: string;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const reduced = Boolean(useReducedMotion());
  const { settings } = useChartSettings();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const id = mobile ? 'mobile' : 'desktop';
  const label = tabs.find((option) => option.value === tab)!.label;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeId, tab]);

  const item = (
    href: string,
    key: string,
    text: string,
    icon: RouteIcon | 'overview',
    badge?: string,
    nested = false,
  ) => {
    const current = key === activeId;
    return (
      <li key={key}>
        <Link
          href={href}
          className="lilt-sidebar__item"
          aria-current={current ? 'page' : undefined}
          data-nested={nested || undefined}
          onClick={onNavigate}
          ref={current ? activeRef : undefined}
        >
          {current ? (
            <motion.span
              aria-hidden="true"
              className="lilt-sidebar__fill"
              layoutId={`lilt-sidebar-fill-${id}`}
              initial={false}
              transition={reduced ? { duration: 0 } : SPRING}
            />
          ) : null}
          <span className="lilt-sidebar__mark" data-glyph={icon !== 'overview' && hasGlyph(icon)}>
            {icon !== 'overview' && hasGlyph(icon) ? (
              <ChartGlyph icon={icon} />
            ) : (
              <Icon
                icon={icon === 'overview' ? DashboardSquare01Icon : icons[icon]}
                size={14}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            )}
          </span>
          <span className="lilt-sidebar__label">{text}</span>
          {badge ? <span className="lilt-sidebar__badge">{badge}</span> : null}
        </Link>
      </li>
    );
  };

  return (
    <nav
      className="lilt-sidebar"
      aria-label={`${label} pages`}
      data-mobile={mobile || undefined}
      data-lilt-palette={(settings.palette as string | undefined) ?? undefined}
    >
      {tab === 'charts' ? (
        <section className="lilt-sidebar__group" aria-label="Overview">
          <ul>{item('/charts', CHARTS_OVERVIEW, 'All charts', 'overview')}</ul>
        </section>
      ) : null}
      {groupsByTab[tab].map((group) => (
        <section
          key={group.key}
          className="lilt-sidebar__group"
          aria-label={group.heading ?? label}
        >
          {group.heading ? (
            <h3 className="lilt-sidebar__heading">
              <span>{group.heading}</span>
              <span className="lilt-sidebar__count">{group.routes.length}</span>
            </h3>
          ) : null}
          <ul>
            {group.routes.map((route) =>
              item(
                route.href,
                route.id,
                route.label,
                route.icon,
                route.badge,
                Boolean(route.parent),
              ),
            )}
          </ul>
        </section>
      ))}
    </nav>
  );
}
