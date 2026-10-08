'use client';

import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { uiClassName } from './ui-class-name';

export function Button({
  className,
  variant = 'outline',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & {
  variant?: 'outline' | 'ghost' | 'primary';
  size?: 'default' | 'sm' | 'icon';
}) {
  return (
    <ButtonPrimitive
      type="button"
      className={uiClassName('lilt-ui-button', className)}
      data-variant={variant}
      data-size={size}
      {...props}
    />
  );
}
