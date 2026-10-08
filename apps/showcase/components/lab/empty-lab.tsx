'use client';

import { useState } from 'react';
import type { ChartEmptyLook } from '@lilt-ui/charts';
import { CardExamplePreview } from '@/components/docs/card-example-preview';
import { useChartSettings } from '@/components/docs/chart-settings';
import { Segmented, Switch } from '@/components/ui/segmented';
import { withoutData } from '@/lib/card-docs/resolve-example';
import type { CardExample } from '@/lib/card-docs/examples';
import { heroes } from './loading-lab';

const looks = [
  { value: 'dots', label: 'Dots' },
  { value: 'shape', label: 'Shape' },
] as const;

/**
 * Every card's empty state in one place. The look is the site's chart style setting, so picking
 * one here restyles every example; Show data brings the rows back to watch the handover.
 */
export function EmptyLab() {
  const { settings, setSetting } = useChartSettings();
  const [filled, setFilled] = useState(false);
  const look: ChartEmptyLook = settings.empty ?? 'dots';
  return (
    <section className="lilt-studio" aria-label="Empty states">
      <div className="lilt-studio__bar">
        <Segmented
          label="Empty look"
          value={look}
          options={looks}
          onChange={(value) => setSetting('empty', value)}
        />
        <label className="lilt-studio__switch">
          <Switch label="Show data" checked={filled} onChange={setFilled} />
          Show data
        </label>
        <p className="lilt-studio__note">
          <code>empty=&quot;{look}&quot;</code> on any card, or pass your own element.
        </p>
      </div>

      <div className="lilt-studio__stage">
        <div className="lilt-studio__loading-grid">
          {heroes.map(({ title, example }) => {
            const shown = filled ? example : (withoutData(example) as CardExample);
            return (
              <figure className="lilt-studio__cell" key={`${example.kind}-${example.id}`}>
                <figcaption>
                  <span className="lilt-studio__chip">{title}</span>
                </figcaption>
                <CardExamplePreview
                  example={{
                    ...shown,
                    props: {
                      ...shown.props,
                      ...(settings.depth === undefined ? {} : { depth: settings.depth }),
                      ...(settings.palette ? { palette: settings.palette } : {}),
                      ...(settings.surface ? { surface: settings.surface } : {}),
                      ...(example.kind === 'progress' ? {} : { empty: look }),
                    },
                  }}
                />
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
