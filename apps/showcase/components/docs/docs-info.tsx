'use client';

import InformationCircleIcon from '@hugeicons/core-free-icons/InformationCircleIcon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import type { ReactNode } from 'react';
import { Popover } from '@/components/ui/popover';
import { TooltipHint } from '@/components/ui/tooltip';

export function DocsInfo({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Popover.Root>
      <TooltipHint content={`About ${title}`}>
        <Popover.Trigger className="lilt-docs-copy" data-compact aria-label={`About ${title}`}>
          <Icon icon={InformationCircleIcon} size={16} aria-hidden="true" />
        </Popover.Trigger>
      </TooltipHint>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} className="lilt-variant-note">
          <Popover.Popup className="lilt-variant-note__popup">
            <Popover.Title className="lilt-variant-note__title">{title}</Popover.Title>
            <Popover.Description className="lilt-variant-note__description">
              {children}
            </Popover.Description>
            {footer ? <div className="lilt-docs-info__footer">{footer}</div> : null}
            <Popover.Close className="lilt-variant-note__close">Got it</Popover.Close>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
