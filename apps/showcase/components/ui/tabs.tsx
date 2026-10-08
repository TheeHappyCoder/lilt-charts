'use client';

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import type React from 'react';
import { useId } from 'react';
import { TravelingHighlightScope, TravelingHighlightTarget } from './traveling-highlight';
import { uiClassName } from './ui-class-name';

export function Tabs({ className, ...props }: TabsPrimitive.Root.Props): React.ReactElement {
  return <TabsPrimitive.Root className={uiClassName('', className)} {...props} />;
}

export function TabsList({ className, ...props }: TabsPrimitive.List.Props): React.ReactElement {
  return (
    <TravelingHighlightScope activationMode="pointer-and-focus" className="lilt-ui-highlight-scope">
      <TabsPrimitive.List className={uiClassName('lilt-tab-list', className)} {...props} />
    </TravelingHighlightScope>
  );
}

export function TabsTab({
  className,
  children,
  ...props
}: TabsPrimitive.Tab.Props): React.ReactElement {
  const itemId = useId();
  return (
    <TabsPrimitive.Tab
      className={uiClassName('lilt-tab', className)}
      data-lilt-highlight={itemId}
      {...props}
    >
      <TravelingHighlightTarget itemId={itemId} />
      {children}
    </TabsPrimitive.Tab>
  );
}

export function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props): React.ReactElement {
  return <TabsPrimitive.Panel className={uiClassName('lilt-tab-panel', className)} {...props} />;
}

export { TabsPrimitive };
