'use client';

import { Dialog } from '@base-ui/react/dialog';
import { HugeiconsIcon as Icon, type IconSvgElement } from '@hugeicons/react';
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

export interface StoreCommand {
  id: string;
  group: string;
  label: string;
  icon: IconSvgElement;
  /** Extra words that should find this command. */
  keywords?: string;
  /** Marks the current choice in a set, such as the selected period. */
  checked?: boolean;
  hint?: string;
  run: () => void;
}

const matches = (command: StoreCommand, query: string) =>
  `${command.group} ${command.label} ${command.keywords ?? ''}`
    .toLowerCase()
    .includes(query.trim().toLowerCase());

/**
 * ⌘K for the whole dashboard. Keyboard-opened and used often, so it opens and closes instantly:
 * no animation stands between the shortcut and the result.
 */
export function StoreCommandMenu({
  open,
  onOpenChange,
  commands,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: readonly StoreCommand[];
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const visible = useMemo(
    () => commands.filter((command) => matches(command, query)),
    [commands, query],
  );

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
  }, [open]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (command: StoreCommand | undefined) => {
    if (!command) return;
    onOpenChange(false);
    command.run();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!visible.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => (index + step + visible.length) % visible.length);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActive(event.key === 'Home' ? 0 : visible.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(visible[active]);
    }
  };

  let index = -1;
  const groups = [...new Set(visible.map((command) => command.group))];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="store-command-backdrop" />
        <Dialog.Popup className="store-command" aria-label="Search the dashboard">
          <Dialog.Title className="store-sr-only">Search the dashboard</Dialog.Title>
          <div className="store-command__field">
            <Icon icon={Search01Icon} size={18} strokeWidth={1.6} aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search pages, periods and actions"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={visible.length ? `${listId}-${active}` : undefined}
              aria-autocomplete="list"
            />
            <kbd>Esc</kbd>
          </div>
          <div className="store-command__list" id={listId} role="listbox" ref={listRef}>
            {visible.length ? (
              groups.map((group) => (
                <div key={group} role="group" aria-label={group} className="store-command__group">
                  <p aria-hidden="true">{group}</p>
                  {visible
                    .filter((command) => command.group === group)
                    .map((command) => {
                      index += 1;
                      const position = index;
                      return (
                        <div
                          key={command.id}
                          id={`${listId}-${position}`}
                          data-index={position}
                          role="option"
                          aria-selected={position === active}
                          className="store-command__item"
                          onPointerMove={() => setActive(position)}
                          onClick={() => run(command)}
                        >
                          <Icon
                            icon={command.icon}
                            size={17}
                            strokeWidth={1.6}
                            aria-hidden="true"
                          />
                          <span>{command.label}</span>
                          {command.checked ? (
                            <Icon
                              icon={Tick02Icon}
                              size={16}
                              strokeWidth={2}
                              className="store-command__check"
                              aria-label="Current"
                            />
                          ) : command.hint ? (
                            <kbd>{command.hint}</kbd>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              ))
            ) : (
              <p className="store-command__empty">
                Nothing matches “{query.trim()}”. Try a page, a period, or “export”.
              </p>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
