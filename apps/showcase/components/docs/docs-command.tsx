'use client';

import type { ReactNode, Ref } from 'react';
import {
  Command,
  CommandEmpty,
  CommandFooter,
  CommandGroupedList,
  CommandInput,
  CommandItem,
  type CommandSection,
} from '@/components/ui/command';
import { apiTopicHref, apiTopics } from '@/lib/api-topics';
import { appRoutes, type AppRoute } from '@/lib/routes';

/** Each API topic is its own page, so it is found by name and by the exports it documents. */
const apiTopicRoutes: readonly AppRoute[] = apiTopics.map((topic) => ({
  id: `api-${topic.slug}`,
  group: 'Reference',
  label: topic.title,
  title: topic.title,
  href: apiTopicHref(topic.slug),
  pathname: apiTopicHref(topic.slug),
  icon: 'api',
  parent: 'api',
  navigation: false,
}));

const sections: readonly CommandSection<AppRoute>[] = [
  ...(['Start', 'Charts', 'Finance', 'Customize', 'Features', 'Reference'] as const).map(
    (group) => ({
      label: group === 'Start' ? 'Get started' : group,
      items: appRoutes.filter((route) => route.navigation && route.group === group),
    }),
  ),
  { label: 'API topics', items: apiTopicRoutes },
];
const items = sections.flatMap((section) => section.items);
const apiExports = new Map(
  apiTopics.map((topic) => [`api-${topic.slug}`, topic.exports.join(' ')]),
);

/** Docs navigation in the same groups and order as the sidebar. The consumer owns navigation. */
export function DocsCommand({
  onSelect,
  inputRef,
  closeAction,
}: {
  onSelect: (route: AppRoute) => void;
  inputRef?: Ref<HTMLInputElement>;
  closeAction?: ReactNode;
}) {
  return (
    <>
      <Command
        items={items}
        itemToStringValue={(route) =>
          `${route.label} ${route.group} ${apiExports.get(route.id) ?? ''}`.trim()
        }
      >
        <CommandInput
          ref={inputRef}
          aria-label="Search documentation"
          placeholder="Search charts, features, and guides…"
        />
        <CommandEmpty>No matching pages.</CommandEmpty>
        <CommandGroupedList sections={sections}>
          {(route) => (
            <CommandItem key={route.id} value={route} onClick={() => onSelect(route)}>
              {route.label}
            </CommandItem>
          )}
        </CommandGroupedList>
      </Command>
      <CommandFooter>
        <span>↑ ↓ to move · Enter to open</span>
        {closeAction ?? <span>Esc to close</span>}
      </CommandFooter>
    </>
  );
}
