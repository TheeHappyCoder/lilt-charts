import type { ReactElement } from 'react';
import type { ChartSeries, ChartTooltipField } from '../types';

/** A series' companion values for one row, in descriptor order. */
export function fieldEntries<T>(
  descriptor: ChartSeries<T>,
  values: Readonly<Record<string, number | null>> | undefined,
  format: (value: number) => string,
): ChartTooltipField[] {
  return Object.entries(descriptor.fields ?? {}).map(([id, field]) => {
    const value = values?.[id] ?? null;
    return {
      id,
      label: field.label,
      value,
      formattedValue:
        value === null ? 'No data' : (descriptor.formatValue?.(value) ?? format(value)),
    };
  });
}

export function FieldList({ fields }: { fields: readonly ChartTooltipField[] }): ReactElement {
  return (
    <small className="lilt-chart__tooltip-fields">
      {fields.map((field) => (
        <span key={field.id} data-field={field.id}>
          <span className="lilt-chart__tooltip-field-label">{field.label}</span>{' '}
          {field.formattedValue}
        </span>
      ))}
    </small>
  );
}

export function FieldValues<T>({
  descriptor,
  values,
  format,
}: {
  descriptor: ChartSeries<T>;
  values: Readonly<Record<string, number | null>> | undefined;
  format: (value: number) => string;
}): ReactElement | null {
  const fields = fieldEntries(descriptor, values, format);
  return fields.length ? <FieldList fields={fields} /> : null;
}
