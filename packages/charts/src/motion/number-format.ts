/** Format functions that came from an `Intl.NumberFormat`, so animations can read its parts. */
const known = new WeakMap<(value: number) => string, Intl.NumberFormat>();

/** Wraps an `Intl.NumberFormat` as a format function that still knows where it came from. */
export function intlFormat(formatter: Intl.NumberFormat): (value: number) => string {
  const format = (value: number) => formatter.format(value);
  known.set(format, formatter);
  return format;
}

/** The `Intl.NumberFormat` behind a format, when there is one. */
export function formatterOf(
  format: ((value: number) => string) | Intl.NumberFormat,
): Intl.NumberFormat | undefined {
  return format instanceof Intl.NumberFormat ? format : known.get(format);
}
