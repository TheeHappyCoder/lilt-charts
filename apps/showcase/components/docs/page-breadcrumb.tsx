'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tabHref, tabOf, tabs } from '@/components/shell/nav-model';
import { routeFor } from '@/lib/routes';

/** The page's section, and its group within it, above the title. */
export function PageBreadcrumb() {
  const route = routeFor(usePathname());
  const tab = tabOf(route.group);
  const section = tabs.find((option) => option.value === tab)!.label;
  // Inside a product, the rail heading the page sits under.
  const group =
    route.group === 'Finance' ||
    route.group === 'Customize' ||
    route.group === 'Features' ||
    route.group === 'Reference'
      ? route.group
      : route.group === 'Start'
        ? 'Get started'
        : route.job;
  return (
    <nav className="lilt-breadcrumb" aria-label="Breadcrumb">
      <Link href={tabHref[tab]}>{section}</Link>
      {group ? (
        <>
          <Icon icon={ArrowRight01Icon} size={12} strokeWidth={2} aria-hidden="true" />
          <span>{group}</span>
        </>
      ) : null}
    </nav>
  );
}
