'use client';

import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { uiClassName } from './ui-class-name';

export const PopoverRoot = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverPositioner({ className, ...props }: PopoverPrimitive.Positioner.Props) {
  return (
    <PopoverPrimitive.Positioner
      sideOffset={8}
      collisionPadding={12}
      className={uiClassName('lilt-ui-positioner', className)}
      {...props}
    />
  );
}

/** This part stays separate from its portal/positioner to support existing docs markup. */
export function PopoverPopup({ className, ...props }: PopoverPrimitive.Popup.Props) {
  return (
    <PopoverPrimitive.Popup
      className={uiClassName('lilt-ui-surface lilt-ui-popup lilt-ui-popover-popup', className)}
      {...props}
    />
  );
}

export function PopoverContent({
  positionerProps,
  portalProps,
  ...props
}: PopoverPrimitive.Popup.Props & {
  positionerProps?: PopoverPrimitive.Positioner.Props;
  portalProps?: PopoverPrimitive.Portal.Props;
}) {
  return (
    <PopoverPrimitive.Portal {...portalProps}>
      <PopoverPositioner {...positionerProps}>
        <PopoverPopup {...props} />
      </PopoverPositioner>
    </PopoverPrimitive.Portal>
  );
}

export function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      className={uiClassName('lilt-ui-popover-title', className)}
      {...props}
    />
  );
}

export function PopoverDescription({ className, ...props }: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      className={uiClassName('lilt-ui-popover-description', className)}
      {...props}
    />
  );
}

/** A drop-in namespace for docs that already use Base UI's compound Popover API. */
export const Popover = {
  ...PopoverPrimitive,
  Positioner: PopoverPositioner,
  Popup: PopoverPopup,
  Title: PopoverTitle,
  Description: PopoverDescription,
};

export { PopoverPrimitive };
