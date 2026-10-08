'use client';

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TravelingHighlightScope, TravelingHighlightTarget } from './traveling-highlight';
import { uiClassName } from './ui-class-name';

export const CommandDialog = DialogPrimitive.Root;
export const CommandDialogTrigger = DialogPrimitive.Trigger;
export const CommandDialogClose = DialogPrimitive.Close;

export function CommandDialogPopup({
  className,
  title = 'Search documentation',
  children,
  ...props
}: DialogPrimitive.Popup.Props & { title?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="lilt-ui-command-backdrop" />
      <DialogPrimitive.Viewport className="lilt-ui-command-viewport">
        <DialogPrimitive.Popup
          className={uiClassName('lilt-ui-surface lilt-ui-popup lilt-ui-command-dialog', className)}
          {...props}
        >
          <DialogPrimitive.Title className="lilt-ui-visually-hidden">{title}</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

/** Base UI owns filtering, the active descendant, arrow keys, and Enter activation. */
export function Command<Value>({
  autoHighlight = 'always',
  keepHighlight = true,
  ...props
}: Omit<AutocompletePrimitive.Root.Props<Value>, 'items'> & { items?: readonly Value[] }) {
  return (
    <AutocompletePrimitive.Root
      inline
      open
      autoHighlight={autoHighlight}
      keepHighlight={keepHighlight}
      {...props}
    />
  );
}

export function CommandInput({ className, ...props }: AutocompletePrimitive.Input.Props) {
  return (
    <div className="lilt-ui-command-input-row">
      <Icon icon={Search01Icon} size={18} aria-hidden="true" />
      <AutocompletePrimitive.Input
        className={uiClassName('lilt-ui-command-input', className)}
        {...props}
      />
    </div>
  );
}

export function CommandList({
  className,
  ...props
}: ComponentProps<typeof AutocompletePrimitive.List>) {
  return (
    <TravelingHighlightScope>
      <AutocompletePrimitive.List
        className={uiClassName('lilt-ui-command-list lilt-ui-list', className)}
        {...props}
      />
    </TravelingHighlightScope>
  );
}

export function CommandItem({ className, children, ...props }: AutocompletePrimitive.Item.Props) {
  const itemId = useId();
  return (
    <AutocompletePrimitive.Item
      className={uiClassName('lilt-ui-item lilt-ui-command-item', className)}
      data-lilt-highlight={itemId}
      {...props}
    >
      <TravelingHighlightTarget itemId={itemId} />
      {children}
    </AutocompletePrimitive.Item>
  );
}

export function CommandEmpty({ className, ...props }: AutocompletePrimitive.Empty.Props) {
  return (
    <AutocompletePrimitive.Empty
      className={uiClassName('lilt-ui-command-empty', className)}
      {...props}
    />
  );
}

export function CommandGroup({ className, ...props }: AutocompletePrimitive.Group.Props) {
  return (
    <AutocompletePrimitive.Group
      className={uiClassName('lilt-ui-command-group', className)}
      {...props}
    />
  );
}
export const CommandCollection = AutocompletePrimitive.Collection;

export function CommandGroupLabel({ className, ...props }: AutocompletePrimitive.GroupLabel.Props) {
  return (
    <AutocompletePrimitive.GroupLabel
      className={uiClassName('lilt-ui-group-label lilt-ui-command-group-label', className)}
      {...props}
    />
  );
}

export interface CommandSection<Value> {
  label: string;
  items: readonly Value[];
}

/** Keep section order and headings while removing groups with no matching commands. */
export function CommandGroupedList<Value>({
  sections,
  children,
}: {
  sections: readonly CommandSection<Value>[];
  children: (item: Value, index: number) => ReactNode;
}) {
  const filtered = new Set(AutocompletePrimitive.useFilteredItems<Value>());
  return (
    <CommandList>
      {sections.map((section) => {
        const items = section.items.filter((item) => filtered.has(item));
        if (items.length === 0) return null;
        return (
          <CommandGroup key={section.label} items={items}>
            <CommandGroupLabel>{section.label}</CommandGroupLabel>
            {items.map(children)}
          </CommandGroup>
        );
      })}
    </CommandList>
  );
}

export function CommandSeparator({ className, ...props }: AutocompletePrimitive.Separator.Props) {
  return (
    <AutocompletePrimitive.Separator
      className={uiClassName('lilt-ui-separator', className)}
      {...props}
    />
  );
}

export function CommandShortcut({ className, ...props }: ComponentProps<'kbd'>) {
  return <kbd className={cn('lilt-ui-item-trailing lilt-ui-shortcut', className)} {...props} />;
}

export function CommandFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('lilt-ui-command-footer', className)} {...props} />;
}
