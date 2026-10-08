import { Area, Bar, Chart, ChartPlot, Line, Legend, Tooltip, useChartState } from '../index';
import { createCartesianChartModel } from './cartesian-model';

const model = createCartesianChartModel({
  data: [{ date: 1, revenue: 4 as number | null, accountCode: 'AC-1' }],
  x: { type: 'number', accessor: (row) => row.date },
  series: [{ id: 'revenue', label: 'Revenue', accessor: (row) => row.revenue }],
});

function ModelSummary() {
  const reading = useChartState(model, (snapshot) => snapshot.inspection?.row.accountCode);
  const compared = useChartState(model, (snapshot) => snapshot.comparison?.series[0]?.id);
  const endpoint = useChartState(model, (snapshot) => snapshot.comparison?.startRow?.accountCode);
  const id: 'revenue' | undefined = compared;
  return <span>{reading ?? endpoint ?? id}</span>;
}
void ModelSummary;
// @ts-expect-error Comparison actions live on model.actions, outside the data snapshot.
const comparisonActionInSnapshot = model.getSnapshot().comparison?.clear;
void comparisonActionInSnapshot;
const boundLegend = (
  <Legend
    model={model}
    renderValue={(entry) => {
      const id: 'revenue' = entry.id;
      return id;
    }}
  />
);
// @ts-expect-error A bound legend uses declared series identities.
const wrongLegend = <Legend model={model} series="reveneu" />;
const boundObservations = (
  <Legend
    model={model}
    by="observation"
    series="revenue"
    renderValue={(entry) => entry.row.accountCode}
  />
);
// @ts-expect-error Observation legend measures use declared IDs.
const wrongObservationLegend = <Legend model={model} by="observation" series="reveneu" />;
const boundPlot = <ChartPlot model={model} bars={{ series: ['revenue'] }} stack />;
// @ts-expect-error Bound bars use declared series identities.
const wrongPlot = <ChartPlot model={model} bars={{ series: ['reveneu'] }} />;
// @ts-expect-error A bound stack uses declared series identities.
const wrongStack = <ChartPlot model={model} stack={{ series: ['reveneu'] }} />;
void wrongStack;
void boundLegend;
void wrongLegend;
void boundObservations;
void wrongObservationLegend;
void boundPlot;
void wrongPlot;

function Inspection({ chart }: { chart: typeof model }) {
  return (
    <Tooltip
      model={chart}
      renderContent={({ row, series }) => (
        <span>
          {row.accountCode}: {series[0]?.value}
        </span>
      )}
      renderComparison={(comparison) => {
        const id: 'revenue' | undefined = comparison.series[0]?.id;
        return <span>{comparison.startRow?.accountCode ?? id}</span>;
      }}
    />
  );
}

export function ModelComposition() {
  return (
    <Chart model={model} aria-label="Revenue">
      <ChartPlot tooltip={<Inspection chart={model} />}>
        <Area model={model} series="revenue" />
        <Line model={model} series="revenue" />
      </ChartPlot>
    </Chart>
  );
}

// @ts-expect-error Declared model IDs cannot be misspelled in a mark.
const wrongLine = <Line model={model} series="reveneu" />;
// @ts-expect-error Declared model IDs cannot be misspelled in a bar.
const wrongBar = <Bar model={model} series="reveneu" />;
// @ts-expect-error Comparison references the declared ID union.
const wrongComparison = <Chart model={model} aria-label="Bad" compare={{ series: 'reveneu' }} />;
// @ts-expect-error Source metadata is preserved rather than becoming unknown.
const wrongField = <Tooltip model={model} renderContent={({ row }) => row.notAField} />;
void wrongLine;
void wrongBar;
void wrongComparison;
void wrongField;
