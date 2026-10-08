import type { ChartComparisonContext } from '../types';
import { BoundedText } from '../motion/bounded-text';

export interface ComparisonDetailsProps {
  comparison: ChartComparisonContext;
  className?: string;
}

/** Optional content. Use in a tooltip, header or footer, or replace with your own JSX. */
export function ComparisonDetails({ comparison, className }: ComparisonDetailsProps) {
  const duration = comparison.motion === 'none' ? 0 : 150;
  return (
    <div className={['lilt-comparison-details', className].filter(Boolean).join(' ')}>
      <div className="lilt-comparison-details__heading">
        <BoundedText
          duration={duration}
          offset={3}
          value={`${comparison.formattedStartX} → ${comparison.formattedEndX}`}
        />
        <button
          type="button"
          className="lilt-comparison-details__close"
          aria-label={comparison.phase === 'preview' ? 'Cancel comparison' : 'Clear comparison'}
          onClick={comparison.clear}
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
            <path
              d="m4 4 8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div className="lilt-comparison-details__series">
        {comparison.series.map((series) => (
          <div
            className="lilt-comparison-details__row"
            key={series.id}
            data-comparison-series={series.id}
          >
            <div className="lilt-comparison-details__name">
              <span
                aria-hidden="true"
                className="lilt-comparison-details__swatch"
                style={{ backgroundColor: series.color }}
              />
              <span>{series.label}</span>
            </div>
            <div className="lilt-comparison-details__stat">
              <strong>
                <BoundedText duration={duration} offset={3} value={series.formattedEndValue} />
              </strong>
              <div className="lilt-comparison-details__change">
                <span>
                  {series.absoluteChange !== null ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      fill="none"
                      data-direction={Math.sign(series.absoluteChange)}
                    >
                      <path
                        d={
                          series.absoluteChange === 0
                            ? 'M3 8h10'
                            : series.absoluteChange > 0
                              ? 'M8 13V3m-4 4 4-4 4 4'
                              : 'M8 3v10m-4-4 4 4 4-4'
                        }
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                  <BoundedText duration={duration} offset={3} value={series.formattedChange} />
                </span>
                {series.formattedPercentage ? (
                  <small>
                    <BoundedText
                      duration={duration}
                      offset={3}
                      value={series.formattedPercentage}
                    />
                  </small>
                ) : null}
              </div>
            </div>
            <div className="lilt-comparison-details__from">
              <span>from </span>
              <BoundedText duration={duration} offset={3} value={series.formattedStartValue} />
            </div>
          </div>
        ))}
      </div>
      {comparison.focus || comparison.fullRange ? (
        <button
          className="lilt-comparison-details__focus"
          type="button"
          onClick={comparison.fullRange ?? comparison.focus}
        >
          {comparison.fullRange ? 'Full range' : 'Focus interval'}
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
            <path
              d="m4 12 8-8M5 4h7v7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
