'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { uiClassName } from './ui-class-name';

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

interface HintPayload {
  content: ReactNode;
  side?: TooltipPrimitive.Positioner.Props['side'];
}

interface HintScope {
  handle: ReturnType<typeof TooltipPrimitive.createHandle<HintPayload>>;
  popupId: string;
  activeTriggerId: string | null;
}

const HintContext = createContext<HintScope | null>(null);

export function TooltipProvider({
  delay = 400,
  closeDelay = 100,
  children,
  ...props
}: TooltipPrimitive.Provider.Props) {
  const [handle] = useState(() => TooltipPrimitive.createHandle<HintPayload>());
  const [activeTriggerId, setActiveTriggerId] = useState<string | null>(null);
  const popupId = useId();
  const scope = useMemo(
    () => ({ handle, popupId, activeTriggerId }),
    [handle, popupId, activeTriggerId],
  );
  return (
    <TooltipPrimitive.Provider delay={delay} closeDelay={closeDelay} {...props}>
      <HintContext.Provider value={scope}>
        {children}
        <Tooltip
          handle={handle}
          onOpenChange={(open, details) => {
            setActiveTriggerId(open ? (details.trigger?.id ?? null) : null);
          }}
        >
          {({ payload }) => (
            <TooltipPopup side={payload?.side} id={popupId}>
              {payload?.content}
            </TooltipPopup>
          )}
        </Tooltip>
      </HintContext.Provider>
    </TooltipPrimitive.Provider>
  );
}

export function TooltipPopup({
  className,
  side = 'top',
  align = 'center',
  sideOffset = 8,
  portalProps,
  children,
  ...props
}: TooltipPrimitive.Popup.Props & {
  side?: TooltipPrimitive.Positioner.Props['side'];
  align?: TooltipPrimitive.Positioner.Props['align'];
  sideOffset?: number;
  portalProps?: TooltipPrimitive.Portal.Props;
}) {
  return (
    <TooltipPrimitive.Portal {...portalProps}>
      <TooltipPrimitive.Positioner
        className="lilt-ui-positioner lilt-ui-tooltip-positioner"
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
      >
        <TooltipPrimitive.Popup
          role="tooltip"
          className={uiClassName('lilt-ui-surface lilt-ui-popup lilt-ui-tooltip', className)}
          {...props}
        >
          <TooltipPrimitive.Viewport className="lilt-ui-tooltip-viewport">
            <span className="lilt-ui-tooltip-content">{children}</span>
          </TooltipPrimitive.Viewport>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

/** Compose onto the actual control, preserving its ref, name, events, and focus target. */
export function TooltipHint({
  children,
  content,
  side,
  disabled = false,
}: {
  children: ReactElement;
  content: ReactNode;
  side?: TooltipPrimitive.Positioner.Props['side'];
  disabled?: boolean;
}) {
  const scope = useContext(HintContext);
  const generatedId = useId();
  const popupId = useId();
  const [open, setOpen] = useState(false);
  const childProps = children.props as { id?: string; 'aria-describedby'?: string };
  const triggerId = childProps.id ?? generatedId;
  const description = childProps['aria-describedby'];
  const payload = useMemo(() => ({ content, side }), [content, side]);
  useEffect(() => {
    if (disabled && scope?.activeTriggerId === triggerId) scope.handle.close();
  }, [disabled, scope, triggerId]);

  if (scope) {
    return (
      <TooltipTrigger
        handle={scope.handle}
        id={triggerId}
        payload={payload}
        disabled={disabled}
        render={children}
        aria-describedby={
          !disabled && scope.activeTriggerId === triggerId
            ? [description, scope.popupId].filter(Boolean).join(' ')
            : description
        }
      />
    );
  }

  return (
    <Tooltip disabled={disabled} open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        render={children}
        aria-describedby={
          open && !disabled ? [description, popupId].filter(Boolean).join(' ') : description
        }
      />
      <TooltipPopup side={side} id={popupId}>
        {content}
      </TooltipPopup>
    </Tooltip>
  );
}

export { TooltipPrimitive };
