import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import type { ChartController } from '../types';
import type { ResolvedX, XKind } from '../cards/keys';

/** The hovered or pinned position a sync group shares, in the x field's own terms. */
export interface ChartSyncPosition {
  /** The hovered x value: the Date, number, or label of the row under the pointer. */
  readonly value: Date | number | string;
  readonly kind: XKind;
  readonly pinned: boolean;
}

interface SyncState {
  readonly key: number | string;
  readonly kind: XKind;
  readonly pinned: boolean;
  /** The card whose pointer or keyboard set this position. */
  readonly source: string;
  /** That card's name, so linked cards can say where a pin came from. */
  readonly label?: string;
}

interface SyncGroup {
  get: () => SyncState | null;
  set: (state: SyncState | null) => void;
  /** Release a shared pin from any card, including the one that set it. */
  release: () => void;
  /** Counts releases, so each card acts on every one exactly once. */
  releases: () => number;
  subscribe: (listener: () => void) => () => void;
}

const groups = new Map<string, SyncGroup>();

function syncGroup(name: string): SyncGroup {
  let group = groups.get(name);
  if (group) return group;
  let state: SyncState | null = null;
  let releases = 0;
  const listeners = new Set<() => void>();
  group = {
    get: () => state,
    releases: () => releases,
    release() {
      releases += 1;
      state = null;
      listeners.forEach((listener) => listener());
    },
    set(next) {
      if (
        state === next ||
        (state &&
          next &&
          state.key === next.key &&
          state.kind === next.kind &&
          state.pinned === next.pinned &&
          state.source === next.source &&
          state.label === next.label)
      )
        return;
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  groups.set(name, group);
  return group;
}

/** Inspections this bridge writes into a card's controller carry this owner. */
export const SYNC_OWNER = 'sync';

const subscribeNever = () => () => undefined;
const none = () => null;

/**
 * Read a sync group's shared position from any component, e.g. to show the hovered date in your
 * own dashboard header. Returns null while nothing in the group is hovered or pinned.
 */
export function useChartSync(name: string | undefined): ChartSyncPosition | null {
  const group = name ? syncGroup(name) : null;
  const state = useSyncExternalStore(
    group?.subscribe ?? subscribeNever,
    group?.get ?? none,
    group?.get ?? none,
  );
  if (!state) return null;
  return {
    value: state.kind === 'time' ? new Date(state.key as number) : state.key,
    kind: state.kind,
    pinned: state.pinned,
  };
}

/**
 * Where a shared position lands in one card: labels match exactly, and dates or numbers snap to
 * the nearest row within half a step, so a weekly card follows a daily one. Returns null when the
 * card has no row there.
 */
export function syncTarget(
  state: Pick<SyncState, 'key' | 'kind'>,
  kind: XKind,
  labels: readonly string[],
  positions: readonly number[],
): number | null {
  if (state.kind !== kind) return null;
  if (kind === 'category') {
    const index = labels.indexOf(String(state.key));
    return index < 0 ? null : index;
  }
  const key = state.key as number;
  if (!positions.length) return null;
  let best = 0;
  positions.forEach((position, index) => {
    if (Math.abs(position - key) < Math.abs(positions[best]! - key)) best = index;
  });
  const sorted = [...positions].sort((a, b) => a - b);
  const steps = sorted
    .slice(1)
    .map((position, index) => position - sorted[index]!)
    .filter((step) => step > 0)
    .sort((a, b) => a - b);
  const step = steps.length ? steps[Math.floor(steps.length / 2)]! : 0;
  return Math.abs(positions[best]! - key) <= step / 2 ? positions[best]! : null;
}

export interface CardSyncOptions {
  /** The card's name, shown on linked cards' pins: "Pinned from Revenue". */
  label?: string;
  /** Releases the card's own pin when a linked card releases the group's. */
  release?: () => void;
}

/**
 * Link a card's hover and pin to every other card in the same named group. The card's own
 * controller stays the source of truth; this bridge only copies positions between controllers.
 * A pin is shared unless it is local, as Alt-click makes it; a shared pin can be released from
 * any card in the group, and local pins stay put.
 */
export function useCardSync<Row>(
  name: string | undefined,
  controller: ChartController,
  data: readonly Row[],
  x: string,
  resolved: ResolvedX<Row>,
  { label, release }: CardSyncOptions = {},
): void {
  const id = useId();
  const releaseOwn = useRef(release);
  releaseOwn.current = release;
  useEffect(() => {
    if (!name) return;
    const group = syncGroup(name);
    const labels = data.map((row) => String((row as Record<string, unknown>)[x] ?? ''));
    const positions = data.map(resolved.position);
    const keyAt = (position: number) =>
      resolved.kind === 'category' ? (labels[position] ?? null) : position;
    let seenReleases = group.releases();
    // Whether the last inspection was a shared pin this bridge wrote, and whether the bridge is
    // clearing it itself; a reader clearing it releases the whole group.
    let followingPin = false;
    let clearing = false;

    // A card only ever clears what the group wrote into it.
    const clearOwn = () => {
      if (controller.getSnapshot().inspection?.ownerId !== SYNC_OWNER) return;
      clearing = true;
      controller.clearInspection(SYNC_OWNER);
      clearing = false;
    };
    const apply = () => {
      const own = controller.getSnapshot().inspection;
      if (group.releases() !== seenReleases) {
        seenReleases = group.releases();
        if (own?.pinned && !own.local && own.ownerId !== SYNC_OWNER) {
          if (releaseOwn.current) releaseOwn.current();
          else controller.clearInspection(own.ownerId);
          return;
        }
      }
      const state = group.get();
      if (state?.source === id) return;
      // A card pinned by its own reader keeps its place while others move, unless a new group pin
      // replaces the one it set: then it follows without ever letting go, so its marker glides.
      if (own?.pinned && own.ownerId !== SYNC_OWNER && (own.local || !state?.pinned)) return;
      const target = state ? syncTarget(state, resolved.kind, labels, positions) : null;
      if (!state || target === null) {
        clearOwn();
        return;
      }
      controller.inspect({
        x: target,
        pinned: state.pinned,
        ownerId: SYNC_OWNER,
        ...(state.pinned && state.label ? { from: state.label } : {}),
      });
    };
    const publish = () => {
      const inspection = controller.getSnapshot().inspection;
      const wasFollowingPin = followingPin;
      followingPin = Boolean(inspection?.ownerId === SYNC_OWNER && inspection.pinned);
      if (inspection?.ownerId === SYNC_OWNER) return;
      if (!inspection) {
        if (group.get()?.source === id) group.set(null);
        else if (wasFollowingPin && !clearing) group.release();
        return;
      }
      // A local pin stays with this card, and takes back anything this card was sharing.
      if (inspection.local) {
        if (group.get()?.source === id) group.set(null);
        return;
      }
      const key = keyAt(inspection.x);
      if (key === null) return;
      group.set({
        key,
        kind: resolved.kind,
        pinned: inspection.pinned,
        source: id,
        ...(label ? { label } : {}),
      });
    };

    const stopController = controller.subscribe(publish);
    const stopGroup = group.subscribe(apply);
    // Join a group that is already hovered or pinned.
    apply();
    return () => {
      stopController();
      stopGroup();
      if (group.get()?.source === id) group.set(null);
      clearOwn();
    };
  }, [name, controller, data, x, resolved, id, label]);
}
