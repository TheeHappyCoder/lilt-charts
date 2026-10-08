/** Server-safe data operations. This entry does not import the interactive chart runtime. */
export { summarizeRange, toChartCsv } from './data/chart-data';
export type { ChartSummary, CsvColumn } from './data/chart-data';
export { funnelRows as summarizeFunnelStages } from './engine/analysis';
export type { FunnelRow as FunnelStageSummary } from './engine/analysis';
