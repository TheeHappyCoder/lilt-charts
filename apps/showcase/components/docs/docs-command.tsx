'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import type { ReactNode, Ref } from 'react';
import { ChartGlyph, hasGlyph } from '@/components/shell/chart-glyph';
import { icons } from '@/components/shell/nav-model';
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

const GROUP_LABELS: Record<string, string> = {
  Start: 'Get started',
  Ascii: 'ASCII',
};

const sections: readonly CommandSection<AppRoute>[] = [
  ...(
    [
      'Start',
      'Charts',
      'Finance',
      'Components',
      'Visuals',
      'Ascii',
      'Customize',
      'Features',
      'Reference',
    ] as const
  ).map((group) => ({
    label: GROUP_LABELS[group] ?? group,
    items: appRoutes.filter((route) => route.navigation && route.group === group),
  })),
  { label: 'API topics', items: apiTopicRoutes },
];
const items = sections.flatMap((section) => section.items);
const apiExports = new Map(
  apiTopics.map((topic) => [`api-${topic.slug}`, topic.exports.join(' ')]),
);

function RouteMark({ route }: { route: AppRoute }) {
  if (hasGlyph(route.icon)) {
    return (
      <span className="lilt-ui-command-glyph" aria-hidden="true">
        <ChartGlyph icon={route.icon} />
      </span>
    );
  }
  return (
    <span className="lilt-ui-command-icon" aria-hidden="true">
      <Icon icon={icons[route.icon]} size={14} strokeWidth={1.7} />
    </span>
  );
}

/** Docs navigation across every section of Lilt. The consumer owns navigation. */
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
          `${route.label} ${route.group} ${route.job ?? ''} ${apiExports.get(route.id) ?? ''}`.trim()
        }
      >
        <CommandInput
          ref={inputRef}
          aria-label="Search documentation"
          placeholder="Search charts, components, visuals, ASCII…"
          trailing={closeAction}
        />
        <CommandEmpty>No matching pages.</CommandEmpty>
        <CommandGroupedList sections={sections}>
          {(route) => (
            <CommandItem key={route.id} value={route} onClick={() => onSelect(route)}>
              <RouteMark route={route} />
              <span className="lilt-ui-command-item-label">{route.label}</span>
              <span className="lilt-ui-command-item-meta">
                {route.job ?? GROUP_LABELS[route.group] ?? route.group}
              </span>
              <span className="lilt-ui-command-enter" aria-hidden="true">
                ↵
              </span>
            </CommandItem>
          )}
        </CommandGroupedList>
      </Command>
      <CommandFooter>
        <span className="lilt-ui-command-hints">
          <span className="lilt-ui-command-hint">
            <kbd className="lilt-ui-command-kbd">↑</kbd>
            <kbd className="lilt-ui-command-kbd">↓</kbd>
            Move
          </span>
          <span className="lilt-ui-command-hint">
            <kbd className="lilt-ui-command-kbd">↵</kbd>
            Open
          </span>
        </span>
        <span className="lilt-ui-command-count">{items.length} pages</span>
      </CommandFooter>
    </>
  );
}
