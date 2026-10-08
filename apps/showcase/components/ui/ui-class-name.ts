import { cn } from '@/lib/utils';

/** Preserve Base UI's state callback when adding the shared component classes. */
export function uiClassName<State>(
  base: string,
  className?: string | ((state: State) => string | undefined),
) {
  return typeof className === 'function'
    ? (state: State) => cn(base, className(state))
    : cn(base, className);
}
