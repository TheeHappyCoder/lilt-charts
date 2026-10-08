import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { CategorySelection, ChartStatus } from '../types';
import type { RankingRow } from '../engine/ranking';
import { usePinnedSelection } from './use-pinned-selection';
import { glideTarget, useTouchGlide } from './use-touch-glide';

/** Retain accepted observations during refreshes; only a new identity clears them. */
export function useAcceptedRows<R>(
  incoming: readonly R[] | null,
  status: ChartStatus,
  resetKey?: string | number,
) {
  const accepted = useRef<{ key: typeof resetKey; rows: readonly R[] | null }>({
    key: resetKey,
    rows: null,
  });
  const rows =
    status === 'ready' && incoming
      ? incoming
      : accepted.current.key === resetKey
        ? accepted.current.rows
        : null;
  useEffect(() => {
    accepted.current = { key: resetKey, rows };
  }, [rows, resetKey]);
  const firstLoad = status === 'loading' && rows === null;
  const [skeleton, setSkeleton] = useState(false);
  useEffect(() => {
    setSkeleton(false);
    if (!firstLoad) return;
    const timer = window.setTimeout(() => setSkeleton(true), 120);
    return () => window.clearTimeout(timer);
  }, [firstLoad, resetKey]);
  return { rows, firstLoad, skeleton };
}

export function useCategoryState<T>(
  rows: readonly RankingRow<T>[],
  interactive: boolean,
  onChange: ((selection: CategorySelection<T> | null) => void) | undefined,
  resetKey?: string | number,
  columns = 1,
  selectedId?: string | null,
  onSelectedIdChange?: (id: string | null) => void,
  hasAcceptedRows = true,
  externalHoverId?: string | null,
) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [requestedId, setPinned, resetPinned] = usePinnedSelection(selectedId, onSelectedIdChange);
  const pinned = rows.some((row) => row.id === requestedId) ? requestedId : null;
  const [tabId, setTabId] = useState<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const glideRef = useTouchGlide<string>({
    resolve: glideTarget,
    onGlide: setHovered,
    onLift: (id) => id !== null && setPinned(id),
    pinned: pinned !== null,
    onRelease: () => setPinned(null),
    disabled: !interactive,
  });
  const callback = useRef(onChange);
  callback.current = onChange;
  const active = interactive
    ? rows.find(
        (row) =>
          row.id ===
          (externalHoverId
            ? (focused ?? hovered ?? externalHoverId ?? pinned)
            : (pinned ?? focused ?? hovered)),
      )
    : undefined;
  const activeId = active?.id;
  const datum = active?.datum;
  const value = active?.value;
  useEffect(() => {
    callback.current?.(
      activeId !== undefined
        ? { id: activeId, row: datum as T, value: value ?? null, pinned: pinned === activeId }
        : null,
    );
  }, [activeId, datum, value, pinned]);
  useEffect(() => {
    resetPinned();
    setHovered(null);
    setFocused(null);
    setTabId(null);
  }, [resetKey, resetPinned]);
  useEffect(() => {
    if (hasAcceptedRows && requestedId && !rows.some((row) => row.id === requestedId))
      setPinned(null);
  }, [hasAcceptedRows, rows, requestedId, setPinned]);
  const currentTab = rows.some((row) => row.id === tabId) ? tabId : rows[0]?.id;
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowDown') next += columns;
    else if (event.key === 'ArrowUp') next -= columns;
    else if (event.key === 'ArrowRight') next += 1;
    else if (event.key === 'ArrowLeft') next -= 1;
    else if (event.key === 'Home')
      next = event.ctrlKey || columns === 1 ? 0 : Math.floor(index / columns) * columns;
    else if (event.key === 'End')
      next =
        event.ctrlKey || columns === 1
          ? rows.length - 1
          : Math.min(rows.length - 1, Math.floor(index / columns) * columns + columns - 1);
    else if (event.key === 'Escape') {
      event.preventDefault();
      setPinned(null);
      return;
    } else return;
    event.preventDefault();
    buttons.current.get(rows[Math.max(0, Math.min(rows.length - 1, next))]?.id)?.focus();
  };
  return {
    active,
    pinned,
    glideRef,
    bind: (id: string, index: number) => ({
      'data-glide-id': id,
      ref: (node: HTMLButtonElement | null) => {
        if (node) buttons.current.set(id, node);
        else buttons.current.delete(id);
      },
      tabIndex: id === currentTab ? 0 : -1,
      'aria-pressed': pinned === id,
      onPointerEnter: () => setHovered(id),
      onPointerLeave: () => setHovered(null),
      onFocus: () => {
        setFocused(id);
        setTabId(id);
      },
      onBlur: () => setFocused(null),
      onClick: () => setPinned((current) => (current === id ? null : id)),
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => onKeyDown(event, index),
    }),
  };
}
