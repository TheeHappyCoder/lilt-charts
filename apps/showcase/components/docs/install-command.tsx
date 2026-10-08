'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useState } from 'react';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import {
  CHARTS_PACKAGE,
  PACKAGE_MANAGERS,
  PACKAGE_MANAGER_STORAGE_KEY,
  type PackageManager,
} from '@/lib/package-managers';
import { CopyButton } from './docs-example';

/** The install command in every package manager, remembering the reader's choice. */
export function InstallCommand({ packages = CHARTS_PACKAGE }: { packages?: string }) {
  const [manager, setManager] = useState<PackageManager>('npm');
  const thumbId = `lilt-install-thumb-${useId()}`;
  const reducedMotion = useReducedMotion();

  // Read after mounting so the server and first client render agree.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PACKAGE_MANAGER_STORAGE_KEY);
      if (PACKAGE_MANAGERS.some((item) => item.id === saved)) setManager(saved as PackageManager);
    } catch {
      // Storage can be unavailable in private windows; npm stays the default.
    }
  }, []);

  const choose = (next: PackageManager) => {
    setManager(next);
    try {
      window.localStorage.setItem(PACKAGE_MANAGER_STORAGE_KEY, next);
    } catch {
      // The choice still applies for this visit.
    }
  };
  const command = (id: PackageManager) =>
    `${PACKAGE_MANAGERS.find((item) => item.id === id)!.install} ${packages}`;

  return (
    <Tabs
      className="lilt-docs-install"
      value={manager}
      onValueChange={(next) => choose(next as PackageManager)}
    >
      <div className="lilt-docs-install__bar">
        <TabsList className="lilt-docs-segmented" aria-label="Package manager">
          {PACKAGE_MANAGERS.map(({ id }) => (
            <TabsTab key={id} className="lilt-docs-segmented__tab" value={id}>
              {manager === id ? (
                <motion.span
                  aria-hidden="true"
                  className="lilt-docs-segmented__thumb"
                  layoutId={thumbId}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 520, damping: 40 }
                  }
                />
              ) : null}
              <span className="lilt-docs-segmented__text">{id}</span>
            </TabsTab>
          ))}
        </TabsList>
        <CopyButton text={command(manager)} label="Copy command" />
      </div>
      {PACKAGE_MANAGERS.map(({ id }) => (
        <TabsPanel key={id} value={id} className="lilt-docs-install__panel">
          <pre>
            <code>
              <span className="lilt-docs-install__prompt" aria-hidden="true">
                $
              </span>
              {command(id)}
            </code>
          </pre>
        </TabsPanel>
      ))}
    </Tabs>
  );
}
