'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

interface NotchSlot {
  slot: HTMLElement | null;
  setSlot: (element: HTMLElement | null) => void;
}

const NotchSlotContext = createContext<NotchSlot | null>(null);

/** Where a page can hand the notch a few controls of its own, as a chart page does its stage's. */
export function NotchSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ slot, setSlot }), [slot]);
  return <NotchSlotContext.Provider value={value}>{children}</NotchSlotContext.Provider>;
}

/** The notch's own ref for the slot element. */
export function useNotchSlotRef() {
  return useContext(NotchSlotContext)?.setSlot;
}

const noSubscription = () => () => {};

/**
 * The page hydrates after the header, whose slot is already set by then. The server never has a
 * slot, so a page reads it only once hydrated; otherwise its first render (and every useId after
 * it) would differ from the server's HTML.
 */
function useSlot() {
  const slot = useContext(NotchSlotContext)?.slot;
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  return hydrated ? slot : null;
}

/** True when a page's controls can live in the notch rather than on the page. */
export function useNotchSlotAvailable() {
  return Boolean(useSlot());
}

/** Renders its children in the notch, on every screen; nothing when there is no notch. */
export function NotchPortal({ children }: { children: ReactNode }) {
  const slot = useSlot();
  if (!slot) return null;
  return createPortal(children, slot);
}
