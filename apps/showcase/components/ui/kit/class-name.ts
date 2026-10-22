/**
 * A part's own class plus the caller's. Base UI also takes `className` as a function of the
 * part's state; that form keeps working. A plain element's class stays a string.
 */
export function withClass(base: string, className?: string): string;
export function withClass<State>(
  base: string,
  className?: string | ((state: State) => string | undefined),
): string | ((state: State) => string);
export function withClass<State>(
  base: string,
  className?: string | ((state: State) => string | undefined),
): string | ((state: State) => string) {
  if (typeof className === 'function')
    return (state: State) => [base, className(state)].filter(Boolean).join(' ');
  return className ? `${base} ${className}` : base;
}
