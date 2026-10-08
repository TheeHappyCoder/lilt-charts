import type { ReactNode } from 'react';

export function StatusContent({
  kind,
  message,
  retry,
}: {
  kind: 'empty' | 'error' | 'refresh-error';
  message: string;
  retry?: () => ReactNode;
}): React.ReactElement {
  return (
    <div
      className={`lilt-chart__status lilt-chart__status--${kind}`}
      role={kind === 'refresh-error' ? 'status' : undefined}
    >
      <span>{message}</span>
      {retry?.()}
    </div>
  );
}
