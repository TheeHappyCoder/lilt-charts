'use client';

import { useId, type ReactNode } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './kit/select';

/** The docs' select: a frosted list that unfurls from the trigger, with one gliding highlight. */
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './kit/select';

export interface SelectOption<Value extends string> {
  value: Value;
  label: ReactNode;
  disabled?: boolean;
}

/** A labelled, controlled select for docs settings. */
export function SelectField<Value extends string>({
  label,
  options,
  value,
  onValueChange,
  disabled,
  name,
  className,
}: {
  label: string;
  options: readonly SelectOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className ? `lilt-ui-field ${className}` : 'lilt-ui-field'}>
      <label className="lilt-ui-field-label" htmlFor={id}>
        {label}
      </label>
      <Select
        items={options}
        value={value}
        disabled={disabled}
        name={name}
        onValueChange={(next) => {
          if (next !== null) onValueChange(next as Value);
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
