'use client';

import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import { useId } from 'react';
import { TravelingHighlightScope, TravelingHighlightTarget } from './traveling-highlight';
import { uiClassName } from './ui-class-name';

export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;
export const MenuGroup = MenuPrimitive.Group;
export const MenuRadioGroup = MenuPrimitive.RadioGroup;
export const MenuSubmenu = MenuPrimitive.SubmenuRoot;

export function MenuPopup({
  children,
  className,
  side = 'bottom',
  align = 'start',
  sideOffset = 6,
  positionerProps,
  portalProps,
  ...props
}: MenuPrimitive.Popup.Props & {
  side?: MenuPrimitive.Positioner.Props['side'];
  align?: MenuPrimitive.Positioner.Props['align'];
  sideOffset?: number;
  positionerProps?: MenuPrimitive.Positioner.Props;
  portalProps?: MenuPrimitive.Portal.Props;
}) {
  return (
    <MenuPrimitive.Portal {...portalProps}>
      <MenuPrimitive.Positioner
        className="lilt-ui-positioner"
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        {...positionerProps}
      >
        <MenuPrimitive.Popup
          className={uiClassName('lilt-ui-surface lilt-ui-popup lilt-ui-menu-popup', className)}
          {...props}
        >
          <TravelingHighlightScope className="lilt-ui-list">{children}</TravelingHighlightScope>
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export function MenuItem({
  className,
  children,
  variant = 'default',
  ...props
}: MenuPrimitive.Item.Props & { variant?: 'default' | 'destructive' }) {
  const itemId = useId();
  return (
    <MenuPrimitive.Item
      className={uiClassName('lilt-ui-item', className)}
      data-lilt-highlight={itemId}
      data-variant={variant}
      {...props}
    >
      <TravelingHighlightTarget itemId={itemId} />
      {children}
    </MenuPrimitive.Item>
  );
}

export function MenuCheckboxItem({
  className,
  children,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  const itemId = useId();
  return (
    <MenuPrimitive.CheckboxItem
      className={uiClassName('lilt-ui-item lilt-ui-choice-item', className)}
      data-lilt-highlight={itemId}
      {...props}
    >
      <TravelingHighlightTarget itemId={itemId} />
      <MenuPrimitive.CheckboxItemIndicator className="lilt-ui-item-indicator">
        <Icon icon={Tick02Icon} size={14} aria-hidden="true" />
      </MenuPrimitive.CheckboxItemIndicator>
      <span className="lilt-ui-item-text">{children}</span>
    </MenuPrimitive.CheckboxItem>
  );
}

export function MenuRadioItem({ className, children, ...props }: MenuPrimitive.RadioItem.Props) {
  const itemId = useId();
  return (
    <MenuPrimitive.RadioItem
      className={uiClassName('lilt-ui-item lilt-ui-choice-item', className)}
      data-lilt-highlight={itemId}
      {...props}
    >
      <TravelingHighlightTarget itemId={itemId} />
      <MenuPrimitive.RadioItemIndicator className="lilt-ui-item-indicator">
        <Icon icon={Tick02Icon} size={14} aria-hidden="true" />
      </MenuPrimitive.RadioItemIndicator>
      <span className="lilt-ui-item-text">{children}</span>
    </MenuPrimitive.RadioItem>
  );
}

export function MenuSubmenuTrigger({
  className,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props) {
  const itemId = useId();
  return (
    <MenuPrimitive.SubmenuTrigger
      className={uiClassName('lilt-ui-item', className)}
      data-lilt-highlight={itemId}
      {...props}
    >
      <TravelingHighlightTarget itemId={itemId} />
      {children}
      <Icon
        icon={ArrowRight01Icon}
        className="lilt-ui-item-trailing"
        size={14}
        aria-hidden="true"
      />
    </MenuPrimitive.SubmenuTrigger>
  );
}

export function MenuGroupLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      className={uiClassName('lilt-ui-group-label', className)}
      {...props}
    />
  );
}

export function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator className={uiClassName('lilt-ui-separator', className)} {...props} />
  );
}

export { MenuPrimitive };
