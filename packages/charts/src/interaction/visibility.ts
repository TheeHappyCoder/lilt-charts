export interface VisibilityIsolation {
  id: string;
  restore: readonly string[];
  expected: readonly string[];
  previous: readonly string[];
}

export function sameVisibleSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

export function reconcileIsolation(
  isolation: VisibilityIsolation | null,
  visible: readonly string[],
  available: readonly string[],
): VisibilityIsolation | null {
  if (!isolation || !available.includes(isolation.id)) return null;
  const expected = isolation.expected.filter((id) => available.includes(id));
  const previous = isolation.previous.filter((id) => available.includes(id));
  const accepted = sameVisibleSet(visible, expected);
  if (!accepted && !sameVisibleSet(visible, previous)) return null;
  return {
    ...isolation,
    restore: isolation.restore.filter((id) => available.includes(id)),
    expected,
    previous: accepted ? expected : previous,
  };
}
