'use client';

import { Select as SelectPrimitive } from '@base-ui/react/select';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { withClass } from './class-name';
import { Glide } from './glide';
import { CheckIcon, ChevronIcon } from './icons';
import { SWAP, SWAP_REDUCED } from './motion';
import './surface.css';
import './list.css';
import './select.css';

/**
 * Lilt's select, on Base UI's: a trigger whose value swaps with a light blur, a frosted list that
 * unfurls from it with its options arriving in turn, one highlight that glides between them, and a
 * check that draws itself. Base UI
 * keeps the keyboard, typeahead, forms and screen reader behaviour; every part takes its props.
 */
export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;

export function SelectTrigger({ className, children, ...props }: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger className={withClass('lilt-select__trigger', className)} {...props}>
      {children}
      <SelectPrimitive.Icon className="lilt-select__chevron">
        <ChevronIcon />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/** The chosen option's label. A new choice rises in through a blur as the old one leaves. */
export function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  const reduced = useReducedMotion();
  const swap = reduced ? SWAP_REDUCED : SWAP;
  return (
    <SelectPrimitive.Value
      className={withClass('lilt-select__value', className)}
      {...props}
      render={(valueProps, state) => (
        <span {...valueProps}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={state.placeholder ? '\u0000placeholder' : String(state.value)}
              data-placeholder={state.placeholder || undefined}
              {...swap}
            >
              {valueProps.children}
            </motion.span>
          </AnimatePresence>
        </span>
      )}
    />
  );
}

/**
 * The list: a frosted popup below the trigger, at least as wide as it. `side`, `align` and
 * `sideOffset` place it; `alignItemWithTrigger` lays the chosen option over the trigger instead.
 */
export function SelectContent({
  className,
  children,
  side = 'bottom',
  align = 'start',
  sideOffset = 6,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props & {
  side?: SelectPrimitive.Positioner.Props['side'];
  align?: SelectPrimitive.Positioner.Props['align'];
  sideOffset?: number;
  alignItemWithTrigger?: boolean;
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="lilt-select__positioner"
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        collisionPadding={12}
      >
        <SelectPrimitive.Popup
          className={withClass('lilt-surface lilt-select__popup', className)}
          {...props}
        >
          <SelectPrimitive.ScrollUpArrow className="lilt-select__scroll" data-edge="top" />
          <SelectPrimitive.List className="lilt-list">
            <Glide className="lilt-list__glide" />
            {children}
          </SelectPrimitive.List>
          <SelectPrimitive.ScrollDownArrow className="lilt-select__scroll" data-edge="bottom" />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props & { children?: ReactNode }) {
  return (
    <SelectPrimitive.Item
      className={withClass('lilt-list__item lilt-select__item', className)}
      {...props}
    >
      <SelectPrimitive.ItemText className="lilt-select__item-text">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="lilt-list__check">
        <CheckIcon />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel className={withClass('lilt-list__label', className)} {...props} />
  );
}

export function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      className={withClass('lilt-list__separator', className)}
      {...props}
    />
  );
}
