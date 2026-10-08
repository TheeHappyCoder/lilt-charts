'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useId, useState } from 'react';
import { CodeBlock } from '@/components/code-block';
import { CopyButton } from '@/components/docs/docs-example';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';

export interface FrameworkOption {
  id: string;
  label: string;
  /** The file the snippet belongs in, shown beside the tabs. */
  file: string;
  code: string;
}

/** The same step in each framework: pick yours, and the file name and code follow. */
export function FrameworkTabs({ options }: { options: readonly FrameworkOption[] }) {
  const [value, setValue] = useState(options[0]!.id);
  const thumbId = `lilt-framework-thumb-${useId()}`;
  const reducedMotion = useReducedMotion();
  const current = options.find((option) => option.id === value) ?? options[0]!;

  return (
    <Tabs
      className="lilt-docs-install lilt-frameworks"
      value={value}
      onValueChange={(next) => setValue(String(next))}
    >
      <div className="lilt-docs-install__bar">
        <TabsList className="lilt-docs-segmented" aria-label="Framework">
          {options.map((option) => (
            <TabsTab key={option.id} className="lilt-docs-segmented__tab" value={option.id}>
              {value === option.id ? (
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
              <span className="lilt-docs-segmented__text">{option.label}</span>
            </TabsTab>
          ))}
        </TabsList>
        <span className="lilt-frameworks__file">{current.file}</span>
        <CopyButton text={current.code} label="Copy code" />
      </div>
      {options.map((option) => (
        <TabsPanel key={option.id} value={option.id} className="lilt-frameworks__panel">
          <CodeBlock code={option.code} />
        </TabsPanel>
      ))}
    </Tabs>
  );
}
