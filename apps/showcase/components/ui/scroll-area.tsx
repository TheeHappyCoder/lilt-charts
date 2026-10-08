'use client';

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import { cn } from '@/lib/utils';

interface ScrollAreaProps extends Omit<ScrollAreaPrimitive.Root.Props, 'className'> {
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  viewportProps?: Omit<ScrollAreaPrimitive.Viewport.Props, 'children' | 'className'>;
  orientation?: 'vertical' | 'horizontal' | 'both';
  /**
   * Fade the edges content is hidden behind: top and bottom, or left and right for a horizontal
   * area. Each fade disappears as its edge is reached.
   */
  scrollFade?: boolean;
}

export function ScrollArea({
  children,
  className,
  viewportClassName,
  contentClassName,
  viewportProps,
  orientation = 'vertical',
  scrollFade = false,
  ...props
}: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root className={cn('lilt-scroll-area', className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        {...viewportProps}
        className={cn('lilt-scroll-area__viewport', viewportClassName)}
        data-scroll-fade={scrollFade ? (orientation === 'horizontal' ? 'x' : 'y') : undefined}
        style={(state) => ({
          overflowX: orientation === 'vertical' ? 'hidden' : 'auto',
          overflowY: orientation === 'horizontal' ? 'hidden' : 'auto',
          ...(typeof viewportProps?.style === 'function'
            ? viewportProps.style(state)
            : viewportProps?.style),
        })}
      >
        <ScrollAreaPrimitive.Content className={cn('lilt-scroll-area__content', contentClassName)}>
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      {orientation !== 'horizontal' ? (
        <ScrollAreaPrimitive.Scrollbar
          className="lilt-scroll-area__scrollbar"
          orientation="vertical"
        >
          <ScrollAreaPrimitive.Thumb className="lilt-scroll-area__thumb" />
        </ScrollAreaPrimitive.Scrollbar>
      ) : null}
      {orientation !== 'vertical' ? (
        <ScrollAreaPrimitive.Scrollbar
          className="lilt-scroll-area__scrollbar"
          orientation="horizontal"
        >
          <ScrollAreaPrimitive.Thumb className="lilt-scroll-area__thumb" />
        </ScrollAreaPrimitive.Scrollbar>
      ) : null}
      {orientation === 'both' ? <ScrollAreaPrimitive.Corner /> : null}
    </ScrollAreaPrimitive.Root>
  );
}
