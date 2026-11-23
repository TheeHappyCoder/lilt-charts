import type { ReactNode } from 'react';
import { HomeFooter, type FooterColumn } from '@/components/home/home-footer';
import {
  customizeRoutes,
  familyGroups,
  featureRoutes,
  groupsByTab,
  referenceRoutes,
  startRoutes,
  type TileGroup,
} from '@/components/shell/nav-model';
import { GITHUB_URL } from '@/lib/github-stars';

const shelf = (group: TileGroup) => ({ label: group.heading!, href: group.routes[0]!.href });

/**
 * Shared footer columns: ways into every showroom, key shelves and the docs.
 */
export const footerColumns: FooterColumn[] = [
  {
    heading: 'Charts',
    links: [
      { label: 'All charts', href: '/charts' },
      { label: 'Finance', href: familyGroups.at(-1)!.routes[0]!.href },
      { label: 'Customize', href: customizeRoutes[0]!.href },
      { label: 'Features', href: featureRoutes[0]!.href },
    ],
  },
  {
    heading: 'Components',
    links: [{ label: 'All components', href: '/components' }, ...groupsByTab.components.map(shelf)],
  },
  {
    heading: 'ASCII',
    links: [
      { label: 'All scenes', href: '/ascii' },
      ...groupsByTab.ascii
        .filter((group) =>
          ['Text', 'Interface', 'Backgrounds', 'Media', 'Data'].includes(group.heading!),
        )
        .map(shelf),
    ],
  },
  {
    heading: 'Docs',
    links: [
      ...[...startRoutes, ...referenceRoutes].map((route) => ({
        label: route.label,
        href: route.href,
      })),
      { label: 'llms.txt', href: '/llms.txt' },
    ],
  },
];

/** The dark closing panel shared by the home page and every showroom/detail page. */
export function SiteFooter({ children }: { children?: ReactNode }) {
  return (
    <HomeFooter github={GITHUB_URL} columns={footerColumns}>
      {children}
    </HomeFooter>
  );
}
