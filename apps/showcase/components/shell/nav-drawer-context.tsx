'use client';

import { createContext, useContext } from 'react';
import type { Tab } from './nav-model';

interface NavDrawerValue {
  /** Opens the full section index drawer, optionally switched to a specific product tab. */
  openDrawer: (tab?: Tab) => void;
}

export const NavDrawerContext = createContext<NavDrawerValue>({
  openDrawer: () => {},
});

export function useNavDrawer() {
  return useContext(NavDrawerContext);
}
