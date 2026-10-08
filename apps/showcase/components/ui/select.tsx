'use client';

import { Select as SelectPrimitive } from '@base-ui/react/select';
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import ArrowUp01Icon from '@hugeicons/core-free-icons/ArrowUp01Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import { useId, type ReactNode } from 'react';
import { TravelingHighlightScope, TravelingHighlightTarget } from './traveling-highlight';
import { uiClassName } from './ui-class-name';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;

export function SelectTrigger({ className, children, ...props }: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      className={uiClassName('lilt-ui-select-trigger', className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="lilt-ui-select-icon">
        <Icon icon={ArrowDown01Icon} size={15} aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value className={uiClassName('lilt-ui-select-value', className)} {...props} />
  );
}

export function SelectPopup({
  children,
  className,
  side = 'bottom',
  align = 'start',
  sideOffset = 6,
  positionerProps,
  portalProps,
  ...props
}: SelectPrimitive.Popup.Props & {
  side?: SelectPrimitive.Positioner.Props['side'];
  align?: SelectPrimitive.Positioner.Props['align'];
  sideOffset?: number;
  positionerProps?: SelectPrimitive.Positioner.Props;
  portalProps?: SelectPrimitive.Portal.Props;
}) {
  return (
    <SelectPrimitive.Portal {...portalProps}>
      <SelectPrimitive.Positioner
        className="lilt-ui-positioner"
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        alignItemWithTrigger={false}
        {...positionerProps}
      >
        <SelectPrimitive.Popup
          className={uiClassName('lilt-ui-surface lilt-ui-popup lilt-ui-select-popup', className)}
          {...props}
        >
          <SelectPrimitive.ScrollUpArrow className="lilt-ui-select-scroll" data-edge="top">
            <Icon icon={ArrowUp01Icon} size={14} aria-hidden="true" />
          </SelectPrimitive.ScrollUpArrow>
          <TravelingHighlightScope>
            <SelectPrimitive.List className="lilt-ui-list">{children}</SelectPrimitive.List>
          </TravelingHighlightScope>
          <SelectPrimitive.ScrollDownArrow className="lilt-ui-select-scroll" data-edge="bottom">
            <Icon icon={ArrowDown01Icon} size={14} aria-hidden="true" />
          </SelectPrimitive.ScrollDownArrow>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  const itemId = useId();
  return (
    <SelectPrimitive.Item
      className={uiClassName('lilt-ui-item lilt-ui-choice-item', className)}
      data-lilt-highlight={itemId}
      {...props}
    >
      <TravelingHighlightTarget itemId={itemId} />
      <SelectPrimitive.ItemIndicator className="lilt-ui-item-indicator">
        <Icon icon={Tick02Icon} size={14} aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText className="lilt-ui-item-text">{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectGroupLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      className={uiClassName('lilt-ui-group-label', className)}
      {...props}
    />
  );
}

export function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator className={uiClassName('lilt-ui-separator', className)} {...props} />
  );
}

export interface SelectOption<Value extends string> {
  value: Value;
  label: ReactNode;
  disabled?: boolean;
}

/** An accessible, controlled select for docs settings; the compound parts remain available. */
export function SelectField<Value extends string>({
  label,
  options,
  value,
  onValueChange,
  disabled,
  name,
}: {
  label: string;
  options: readonly SelectOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
  disabled?: boolean;
  name?: string;
}) {
  const id = useId();
  return (
    <div className="lilt-ui-field">
      <label className="lilt-ui-field-label" htmlFor={id}>
        {label}
      </label>
      <Select
        items={options}
        value={value}
        disabled={disabled}
        name={name}
        onValueChange={(next) => {
          if (next !== null) onValueChange(next);
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </div>
  );
}

export { SelectPrimitive };
