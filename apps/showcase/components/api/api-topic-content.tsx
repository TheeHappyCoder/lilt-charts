import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ApiTopicSlug } from '@/lib/api-topics';

/** Each API topic's body: prose, and code as raw `<pre>` that GuideSection turns into panels. */
export const apiTopicContent: Record<ApiTopicSlug, ReactNode> = {
  cards: (
    <>
      <p>
        Most charts start as a card. A card takes your rows and the names of their fields, and
        TypeScript checks each name against the row type: <code>x</code> and <code>category</code>{' '}
        must name text, number or date fields, and <code>value</code> or a series <code>key</code>{' '}
        must name a numeric one. The card provides a header, legend where applicable, hover readout,
        loading state and motion. Every chart page under <Link href="/charts">Charts</Link> lists
        its card&apos;s full props and prints a complete, copyable component.
      </p>
      <pre>{`import { AreaChartCard } from '@lilt-ui/charts';
import '@lilt-ui/charts/styles.css';

<AreaChartCard
  title="Visitors"
  data={visitors}
  x="month"
  series={[{ key: 'organic' }, { key: 'referral' }, { key: 'paid' }]}
/>`}</pre>
      <p>
        Titles are optional: omit <code>title</code> to render no visible title. Set{' '}
        <code>{'header={false}'}</code> to remove the entire header, including headline, delta and
        period controls. Where a card offers legend layouts, <code>{'legend={false}'}</code> removes
        the legend independently. Use <code>aria-label</code> for the accessible name when your app
        supplies the heading. <code>surface="ghost"</code> only changes the visual frame. Pass the
        selected rows through <code>data</code> when your app owns period selection.
      </p>
      <pre>{`<RadialChartCard
  aria-label="Revenue by channel"
  data={channels}
  category="channel"
  value="revenue"
  surface="ghost"
  header={false}
  legend={false}
  selected={selectedChannel}
  onSelectedChange={setSelectedChannel}
  center={({ share }) => <strong>{share === null ? '—' : Math.round(share * 100) + '%'}</strong>}
/>`}</pre>
      <p>
        A radial keeps its centre and slice interaction with both controls hidden. Tab to the
        graphic, use arrows to inspect, Enter or Space to pin, and Escape to clear. Escape also
        clears pins with every visible legend layout; controlled selection changes when your app
        accepts <code>onSelectedChange(null)</code>.
      </p>
      <p>
        From <code>@lilt-ui/charts</code>: <code>AreaChartCard</code>, <code>LineChartCard</code>,{' '}
        <code>BarChartCard</code>, <code>ComboChartCard</code>, <code>StatCard</code>,{' '}
        <code>HorizontalBarChartCard</code>, <code>RadialChartCard</code>, <code>ProgressCard</code>
        , <code>ActivityRingCard</code>, <code>FunnelChartCard</code>, <code>HeatmapChartCard</code>
        , <code>ScatterChartCard</code>, <code>SankeyChartCard</code>, <code>RadarChartCard</code>,{' '}
        <code>SlopeChartCard</code>, <code>RangeChartCard</code> and <code>BoxPlotCard</code>.
        Finance cards come from <code>@lilt-ui/charts/finance</code>.
      </p>
      <p>
        Cards share one vocabulary: <code>ranges</code> swaps the data for a period select,{' '}
        <code>delta</code> and <code>headline</code> set the header, <code>palette</code> and{' '}
        <code>surface</code> restyle it, <code>badge</code> adds a glass tab, and{' '}
        <code>loading</code>, <code>loadingStyle</code>, <code>empty</code> and <code>motion</code>{' '}
        cover availability. Line, Area and Bar cards also take <code>hover</code>, <code>sync</code>
        , <code>target</code>, <code>forecast</code> and <code>normal</code>. To build a card of
        your own around a composed chart, use <code>ChartCard</code> with{' '}
        <code>ChartCardHeader</code>, <code>ChartCardTitle</code>, <code>ChartCardValue</code>,{' '}
        <code>ChartCardDelta</code> and <code>ChartCardRange</code>.
      </p>
    </>
  ),
  runtime: (
    <>
      <p>
        <code>createCartesianChartModel</code> or <code>useCartesianChartModel</code> keeps an
        accepted data frame, source rows, measurements and interaction state together. Pass the
        model to <code>Chart</code>, <code>ChartPlot</code> and bound marks. A plot supplies
        measured geometry; its height, compact height and margins live on <code>ChartPlot</code>.
        One active plot is supported per chart root.
      </p>
      <pre>{`const model = useCartesianChartModel({ data: rows, x, y, series });
const inspection = useChartState(model, state => state.inspection);
const comparison = useChartState(model, state => state.comparison);

<Chart model={model} aria-label="Revenue" compare>
  <header>{inspection?.formattedX ?? 'Revenue'}</header>
  <ChartPlot model={model} height={300}>
    <Line model={model} series="revenue" />
  </ChartPlot>
  <Legend model={model} />
</Chart>`}</pre>
      <p>
        Model actions work before a plot mounts and after it unmounts. A controlled model uses
        <code>control</code> inputs and request callbacks: calling <code>pin</code>, changing
        visible series or comparing a range requests a change; state updates when the owner supplies
        the resolved value. <code>summarize</code> queries accepted rows with an explicit measure,
        scope, aggregation and missing-value policy.
      </p>
    </>
  ),
  data: (
    <>
      <p>
        Time accessors return a <code>Date</code> or epoch milliseconds. Numeric accessors return
        finite numbers. Y values can be finite or <code>null</code>; null is a gap and zero is data.
        Time and numeric x values must be unique and strictly ascending.
      </p>
      <p>
        A category x keeps identity and label apart. <code>accessor</code> returns each row&apos;s
        identity, which must be stable and unique, and <code>format</code> turns an identity into
        the label shown on the axis and in readouts. Labels may repeat; identities may not. When
        several buckets fall on one date, key them by index and label them by date, so every bucket
        stays its own observation:
      </p>
      <pre>{`// 24 buckets over a week: four share each date label.
<Chart
  aria-label="Alarm activity"
  data={buckets}
  series={series}
  x={{
    type: 'category',
    accessor: (row) => String(row.index),           // identity: 0 … 23
    format: (id) => buckets[Number(id)]?.label ?? '', // label: "Oct 3"
  }}
>`}</pre>
      <p>
        Two rows with the same identity stop the chart with a specific error, such as{' '}
        <code>Invalid category at row 5: duplicate ID &quot;Oct 3&quot;.</code>, rather than
        silently merging buckets. When rows are moments in time, prefer{' '}
        <code>{"{ type: 'time' }"}</code>: spacing then follows real time, and compare, focus, live
        and brush become available. Category x suits buckets you name yourself.
      </p>
      <p>
        Import <code>summarizeRange</code>, <code>toChartCsv</code> and{' '}
        <code>summarizeFunnelStages</code> from <code>@lilt-ui/charts/data</code> when calling them
        in a Server Component. Interactive charts come from <code>@lilt-ui/charts</code> in a client
        component.
      </p>
    </>
  ),
  toolkit: (
    <>
      <p>
        <code>ChartToolbar</code>, <code>ChartReadout</code>, <code>ChartOverview</code> and{' '}
        <code>Legend</code> are optional normal-flow siblings. <code>ChartReadout</code> adds a
        compact text summary on wide plots. The plot owns keyboard observation input and visible
        inspection marks even when no tooltip is configured. Add <code>Tooltip</code> for a floating
        fine-pointer view. Click to pin an observation; Compare from here turns that pin into a
        baseline. Drag to compare, then drag or step either endpoint to refine it. Click the
        interval to focus, and use Full range to return while retaining the answer. Escape cancels
        an edit, then leaves focus, then clears the comparison or pin.
      </p>
      <p>
        Comparison content is opt-in. <code>useChartComparison()</code> exposes the selected range,
        every visible series’ endpoint values and differences, and clear/focus actions for your own
        header, footer or other JSX. <code>compare.onChange</code> exposes the same data outside the
        chart. To place it in a tooltip, supply <code>Tooltip.renderComparison</code>. The library
        calculates the difference; the comparison JSX belongs to the consumer.
      </p>
      <p>
        On a model, <code>actions.compare({'{ startX, endX }'})</code> establishes the same range
        without a toolbar. Its result includes typed original endpoint rows, every visible measure,
        signed change, percentage policy and unavailable reasons. The optional tooltip can render
        that result; a legend or ordinary page heading can render it too.
      </p>
    </>
  ),
  legends: (
    <>
      <p>
        <code>Legend</code> sits in normal layout flow. Its default cards show rounded-square color
        keys and the inspected values, returning to the latest values when inspection clears. Use{' '}
        <code>variant="inline"</code> for compact dots, or
        <code>by="observation"</code> with one series to list categories such as months. Hovering a
        legend entry inspects the corresponding chart value; clicking pins it. Render callbacks can
        replace the label, swatch, value, difference or entire item. Comparison JSX remains yours.{' '}
        <code>ValueLegend</code> accepts independently computed, typed entries when a family uses
        category or dimension legends.
      </p>
      <pre>{`<Legend model={model} variant="cards" />
<Legend model={model} by="observation" series="revenue" variant="inline" />`}</pre>
    </>
  ),
  composition: (
    <>
      <p>
        <code>Tooltip</code> is an optional component supplied through{' '}
        <code>ChartPlot.tooltip</code>, including through an ordinary React wrapper. You can also
        pass a configuration object to that slot. Use <code>inspectionSeries</code> to choose a
        series for observation inspection. A tooltip&apos;s <code>className</code> and{' '}
        <code>aria-label</code> apply to its floating panel. <code>renderContent</code> replaces the
        values body while keeping placement and pin actions, including in narrow plots. An unknown
        Line, Area or Bar series ID raises an error.
      </p>
      <pre>{`<ChartPlot tooltip={{ className: 'details', 'aria-label': 'Revenue details' }}
  inspectionSeries="revenue">
  <RevenueMarks />
</ChartPlot>`}</pre>
      <p>
        A plot has two independent choices: <code>bars</code> says which series draw as bars and
        holds their spacing, and <code>stack</code> says which series add up and how. Series in
        neither draw as lines, including over a stack. Category x accepts inspection and visibility;
        compare, focus, live, brush and linked controllers require time or numeric x.
      </p>
    </>
  ),
  compact: (
    <>
      <p>
        A dashboard widget often gives a chart a fixed height, such as a 132px plot in a card that
        hides overflow. Two settings decide how inspection fits it. By default a chart narrower than
        420px shows its values in a readout <em>under</em> the plot, and reserves that room even at
        rest (about 130px) so nothing jumps when inspection starts. That suits a page that can grow.
        For a fixed allocation, set <code>adaptive={'{false}'}</code>: the floating panel then stays
        inside the plot at every width.
      </p>
      <pre>{`<ChartPlot height={132} compactHeight={132} pill={false}
  tooltip={<Tooltip adaptive={false} />}>
  {severities.map((key) => <Line key={key} series={key} />)}
</ChartPlot>`}</pre>
      <p>
        The floating panel is never taller than the plot. With <code>density=&quot;auto&quot;</code>{' '}
        (the default) it switches to a compact layout when the comfortable one would not fit: values
        in two columns, Unpin beside the date, and less padding. Custom <code>renderContent</code>{' '}
        bodies and pin actions follow the same rules; as a last resort the panel scrolls. Choose{' '}
        <code>density=&quot;compact&quot;</code> or <code>&quot;comfortable&quot;</code> to fix it
        either way. Set <code>compactHeight</code> on <code>ChartPlot</code> to keep the same height
        below 420px.
      </p>
      <p>
        Keyboard inspection fits too. While the observation slider has keyboard focus, the plot
        takes the focus ring and a shown tooltip carries the key hints in its footer, so a small
        plot holds one panel rather than two. Left and Right inspect, Up and Down switch series,
        Enter pins, Tab reaches Unpin, and Escape clears. Without a floating tooltip the slider
        panel shows the hints itself.
      </p>
      <p>
        Cards handle this for you: their hover readouts are sized to the card. Reach for these
        settings when you compose a <code>Chart</code> into a space you do not control.
      </p>
    </>
  ),
  appearance: (
    <>
      <p>
        Lilt starts with finished light and dark styles. A series descriptor controls its color,
        line, area and bar marks. The same settings apply to the resting mark and its inspection
        highlight. <code>ChartPlot bars</code> controls width, group gap and stacked segment gap;
        stacked bars are connected and square by default. Use a root <code>style</code> or{' '}
        <code>className</code> with <code>--lilt-*</code> tokens for axes, grid, tooltip, legend,
        brush and other surfaces.
      </p>
      <pre>{`const series: ChartSeries<Day>[] = [{
  id: 'revenue', label: 'Revenue', accessor: row => row.revenue,
  color: '#168267',
  line: { width: 2.5, pointRadius: 3 },
  area: { opacity: 0.48 },
  bar: { radius: 0, stroke: '#0f513e', strokeWidth: 1 },
}];

<Chart aria-label="Revenue" data={rows} x={x} series={series}
  style={{ '--lilt-grid-dot-opacity': 0.12, '--lilt-tooltip-radius': '8px' }}>
  <ChartPlot bars={{ width: 18, gap: 4 }} tooltip={<Tooltip />}>
    <Grid pattern="dots" dotSpacing={9} dotRadius={0.7} />
    <Bar series="revenue" /><XAxis /><YAxis showTicks={false} />
  </ChartPlot>
</Chart>`}</pre>
      <p>
        For a separated stack, use <code>bars={'{{ segmentGap: 3 }}'}</code> and set each
        series&apos;s <code>bar.radius</code>. Cards take <code>palette</code> and{' '}
        <code>surface</code>, and expose their parts through root tokens and stable CSS classes. See{' '}
        <Link href="/customize/colors">Customize</Link> for every look.
      </p>
      <p>
        Hover inspection marks every visible line or area by default. To hide one series&apos;s
        marker while keeping its tooltip value and line, set{' '}
        <code>line: {'{ showInspectionPoint: false }'}</code> on that series. Its point radius,
        stroke and stroke width use the same <code>line</code> settings as isolated observations.
      </p>
    </>
  ),
  marks: (
    <>
      <p>
        A descriptor&apos;s area treatment is solid, fade, hatch or dots; bars support solid, hatch
        and dots. Each series owns its paint and matching legend/tooltip key.{' '}
        <code>status(row)</code> explicitly marks observed, provisional or forecast readings. The
        last row is never guessed to be incomplete. <code>series.curve</code> accepts
        <code> step-after</code> and <code>step-before</code> to hold values on opposite sides of an
        exact transition. <code>series.fields</code> adds companion values in the series&apos; unit,
        such as a range&apos;s ends, quartiles, or a candle&apos;s open, high and low. They fit the
        y axis and appear in hover; <code>IntervalBand</code>, <code>RangeBar</code>,{' '}
        <code>ErrorBar</code>, <code>BoxPlot</code> and <code>Candles</code> (from{' '}
        <code>@lilt-ui/charts/finance</code>) draw them by field ID. Lilt never infers them.{' '}
        <code>series.colorAt(row)</code> colors one bar, candle, range or point, and{' '}
        <code>y.scale=&quot;log&quot;</code> spaces values by ratio.
      </p>
      <p>
        Combine <code>area.treatment="dots"</code> or <code>"hatch"</code> with
        <code> area.fade=true</code> for texture that fades toward the baseline without changing the
        plotted values. <code>RangeChartCard</code> and <code>BoxPlotCard</code> wrap the range
        marks as finished cards.
      </p>
    </>
  ),
  availability: (
    <>
      <p>
        <code>status</code> accepts <code>loading</code>, <code>ready</code> or <code>error</code>.{' '}
        <code>motion="none"</code> settles finite movement immediately. The default is{' '}
        <code>auto</code> and follows reduced-motion preferences.
      </p>
      <p>
        Entrances are enabled by default. Set <code>animateIn={'{false}'}</code> on{' '}
        <code>Chart</code> to show the first data immediately while keeping hover, visibility and
        data-update motion. Cards take <code>motion</code> and <code>loadingStyle</code>. Changing{' '}
        <code>resetKey</code> replays the entrance when enabled; ordinary updates do not. Reduced
        motion always takes precedence.
      </p>
      <pre>{`<Chart aria-label="Revenue" data={rows} series={series} x={x} animateIn={false}>
  <ChartPlot><Area series="revenue" /><Line series="revenue" /></ChartPlot>
</Chart>`}</pre>
      <p>
        A period with no data shows the empty state in the plot area, and the headline reads a dash,
        never zero. <code>empty</code> takes <code>dots</code> (the default), the chart&rsquo;s own{' '}
        <code>shape</code>, an element, or <code>null</code> for nothing. Both built-in looks stay
        still, so empty never reads as loading. <code>ChartEmpty</code> is the built-in look as a
        component, so your own words keep it.
      </p>
      <pre>{`import { AreaChartCard, ChartEmpty } from '@lilt-ui/charts';

<AreaChartCard data={[]} x="month" series={series} empty="shape" />
<AreaChartCard data={[]} x="month" series={series} empty={<ChartEmpty>No visits yet</ChartEmpty>} />
<AreaChartCard data={[]} x="month" series={series} empty={<ConnectSource />} />`}</pre>
    </>
  ),
  'animated-numbers': (
    <>
      <p>
        <code>AnimatedNumber</code> takes a numeric <code>value</code>, an optional{' '}
        <code>format</code> function or <code>Intl.NumberFormat</code>, and a <code>variant</code>:{' '}
        <code>count</code> (the default) counts the value itself, <code>pop</code> swaps the number
        with a small bounce, <code>slide</code> moves changed digits in the direction of change,{' '}
        <code>roll</code> turns each digit like an odometer, <code>flow</code> uses
        NumberFlow&apos;s spinning digits (it needs an <code>Intl.NumberFormat</code>, which cards
        supply), and <code>scramble</code> cycles figures before they land. Symbols such as a
        currency sign hold still, and every variant keeps moving while a pointer scrubs a chart. The
        accessible reading is always the exact value, <code>motion="none"</code> turns movement off,
        and reduced-motion preferences are respected automatically. Cards take the same choice as{' '}
        <code>numberStyle</code>. Legend values stay static unless you render one through{' '}
        <code>renderValue</code>.
      </p>
      <pre>{`import { AnimatedNumber, Legend } from '@lilt-ui/charts';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
});

<AnimatedNumber value={55610} format={currency} />
<Legend model={model} renderValue={(entry) => entry.value === null
  ? 'No data'
  : <AnimatedNumber value={entry.value} format={currency} variant="roll" />
} />`}</pre>
    </>
  ),
  'vertical-bars': (
    <>
      <p>
        Use <code>{'<ChartPlot bars>'}</code> with a <code>Bar</code> for each series. Visible
        series form a group at each observation; one visible series produces single bars. Time and
        numeric spacing is preserved, including missing observations. Null values have no bar.
        Positive and negative bars share an exact zero baseline.
      </p>
      <pre>{`<ChartPlot bars height={280} inspectionSeries="revenue" tooltip={<Tooltip />}>
  <Grid pattern="dots" />
  <Bar series="revenue" />
  <Bar series="previous" />
  <XAxis />
  <YAxis showTicks={false} />
</ChartPlot>`}</pre>
      <p>
        Bars share visibility, keyboard inspection, comparison, focus, live updates and lifecycle
        with line and area charts. The layout reserves space for edge groups. For categorical
        rankings, use the horizontal-bar component below. For vertical stacked bars, add{' '}
        <code>stack</code> and include one <code>Bar</code> per contribution. Series left out of{' '}
        <code>stack.series</code> draw as lines over the stack on the same scale, such as a target.
      </p>
      <pre>{`<ChartPlot bars={{ segmentGap: 2 }} stack={{ series: ['online', 'retail'] }}>
  <Bar series="online" /><Bar series="retail" /><Line series="target" />
  <XAxis /><YAxis />
</ChartPlot>`}</pre>
    </>
  ),
  'stacked-area': (
    <>
      <p>
        Use <code>ChartPlot stack</code> with the same <code>Area</code> and <code>Line</code>
        primitives. Descriptor order defines the layers from bottom to top. Stacked series must
        share a unit and curve. The scale includes zero and stays stable through legend toggles;
        data updates animate both boundaries and scale together.
      </p>
      <pre>{`<ChartPlot stack height={300} tooltip={<Tooltip />}>
  <Grid pattern="dots" />
  <Area series="direct" />
  <Area series="organic" />
  <Line series="direct" />
  <Line series="organic" />
  <XAxis /><YAxis showTicks={false} />
</ChartPlot>
<Legend interactive />`}</pre>
      <p>
        Visible contributions share cumulative boundaries, inspection and one interruptible
        visibility transition. Tooltip values remain the original contributions; the total is
        calculated from visible series. A missing visible contribution leaves a gap across the stack
        and marks the total incomplete. Hide that series to inspect the remaining known total. The
        default <code>sum</code> mode stacks positive values above zero and negative values below
        it. <code>stack="percent"</code> normalizes visible non-negative contributions to a 0–100%
        scale without changing raw tooltip values. Mismatched curves produce a specific error.
      </p>
    </>
  ),
  combo: (
    <>
      <p>
        Use <code>ChartPlot bars={"{{ series: ['actual'] }}"}</code> with a <code>Bar</code> for
        actual values and a <code>Line</code> for the budget. Only the listed bar series reserve
        group slots. Both marks share one scale, inspection, legend and lifecycle. Add{' '}
        <code>stack</code> to stack the bars under the same lines. For a different unit, give the
        line <code>scale: &apos;secondary&apos;</code>.
      </p>
      <pre>{`<ChartPlot bars={{ series: ['actual'] }} tooltip={<Tooltip />}>
  <Grid pattern="dots" />
  <Bar series="actual" /><Line series="budget" />
  <XAxis /><YAxis showTicks={false} />
</ChartPlot>`}</pre>
    </>
  ),
  'stat-cards': (
    <>
      <p>
        <code>StatCard</code> shows one metric: a value summarized from your rows, a delta, and a
        small chart. <code>chart</code> chooses an <code>area</code> (the default) or{' '}
        <code>line</code> sparkline, <code>bars</code>, a <code>meter</code> of cells or a{' '}
        <code>ring</code> filling toward <code>target</code>, or <code>none</code>.{' '}
        <code>aggregate</code> decides how the resting value sums up the data: <code>sum</code>,{' '}
        <code>mean</code>, <code>max</code> or <code>last</code>.
      </p>
      <pre>{`<StatCard
  title="Revenue"
  data={dailyKpis}
  value="revenue"
  x="date"
  delta={0.124}
  caption="vs last month"
/>`}</pre>
      <p>
        Hover, touch and the keyboard inspect the sparkline, and the headline follows the inspected
        point. Null stays a visible gap. See <Link href="/charts/stat-cards">Stat cards</Link> for
        every prop.
      </p>
    </>
  ),
  'horizontal-bars': (
    <>
      <p>
        <code>HorizontalBarChartCard</code> ranks categories from a text field and a numeric field.
        Rows stay keyed by identity while their values and ranking change, so a re-ranked row slides
        rather than redraws. <code>sort</code> can be <code>descending</code> (default),{' '}
        <code>ascending</code> or <code>input</code>; <code>limit</code> folds the rest into one
        &quot;Other&quot; row. Negative values extend left of zero, and measured zero stays distinct
        from missing data.
      </p>
      <pre>{`<HorizontalBarChartCard
  title="Revenue by channel"
  data={channelRevenue}
  category="channel"
  value="revenue"
/>`}</pre>
      <p>
        Up/Down and Home/End move between rows; click or Enter pins one, Escape releases it. To own
        the pin, pass <code>selected</code> and <code>onSelectedChange</code> (see{' '}
        <Link href="/guides/api/selection">selection</Link>).
      </p>
    </>
  ),
  'category-radial': (
    <>
      <p>
        A shared <code>Chart</code> can use a category x with <code>ChartPlot bars</code>. Keyboard
        and pointer inspection, visibility and lifecycle stay in the shared runtime. Time ranges,
        linked x inspection, focus and brush do not apply to categories. See{' '}
        <Link href="/guides/api/data">Data and identity</Link> for identity versus label.
      </p>
      <p>
        <code>RadialChartCard</code> shows parts of a whole from a text <code>category</code> and a
        non-negative <code>value</code>. <code>variant</code> is <code>donut</code> (default),{' '}
        <code>pie</code>, <code>semi</code> or <code>rings</code>. A null value stays in the legend
        as &quot;No data&quot; but takes no room in the circle, and a negative value shows an error
        rather than a misleading chart.
      </p>
      <p>
        When a slice&apos;s color means something, fix it with <code>colors</code>, keyed by
        category name; the rest take the palette and keep their color as values change. To share a
        selection with your own controls, own it with <code>selected</code> and{' '}
        <code>onSelectedChange</code>. <code>center</code> replaces what the middle of a donut
        shows.
      </p>
      <pre>{`const [severity, setSeverity] = useState<string | null>(null);

<SeverityButtons value={severity} onChange={setSeverity} />
<RadialChartCard
  title="Active alarms"
  data={alarms}
  category="severity"
  value="count"
  colors={{ Critical: '#ef4444', Urgent: '#f97316', Advisory: '#f59e0b' }}
  selected={severity}
  onSelectedChange={setSeverity}
  center={({ category, value }) => <strong>{value} {category}</strong>}
/>`}</pre>
      <p>
        <code>ProgressCard</code> measures one value against a <code>target</code>.{' '}
        <code>ActivityRingCard</code> places readings round a day in buckets, such as{' '}
        <code>bucketMinutes={'{40}'}</code> for 36 positions; missing buckets stay distinct from
        zero.
      </p>
    </>
  ),
  'funnels-heatmaps': (
    <>
      <p>
        <code>FunnelChartCard</code> takes ordered, cumulative stages. Counts must be non-negative
        and cannot increase. Conversion is calculated only between adjacent known stages with a
        positive starting count; a missing count is never treated as zero.{' '}
        <code>summarizeFunnelStages</code> returns the same stage arithmetic for your own markup,
        and the card accepts <code>selected</code> and <code>onSelectedChange</code> to share its
        pinned stage.
      </p>
      <pre>{`<FunnelChartCard
  title="Sign-up funnel"
  data={signupFunnel}
  category="stage"
  value="people"
/>`}</pre>
      <p>
        <code>HeatmapChartCard</code> takes an <code>x</code> field, a <code>y</code> field and a
        numeric <code>value</code>. Missing cells use hatching; measured zero keeps its color. Arrow
        keys move through the matrix, and a click or Enter pins a cell. See{' '}
        <Link href="/charts/funnel">Funnel</Link> and <Link href="/charts/heatmap">Heatmap</Link>{' '}
        for every prop.
      </p>
    </>
  ),
  'scatter-flow-profile': (
    <>
      <p>
        <code>ScatterChartCard</code> plots numeric <code>x</code> and <code>y</code> fields with an
        optional <code>label</code>; coincident points stay reachable with the arrow keys.{' '}
        <code>SankeyChartCard</code> takes links as rows of <code>source</code>, <code>target</code>{' '}
        and <code>value</code>, and checks that flows are conserved. <code>RadarChartCard</code>{' '}
        compares profiles across ordered dimensions with one shared unit; a missing value opens the
        outline rather than closing a false shape. <code>SlopeChartCard</code> joins each
        category&apos;s <code>from</code> and <code>to</code> values, as a slope or a dumbbell.
      </p>
      <pre>{`<ScatterChartCard
  title="Campaign results"
  data={campaignResults}
  x="spend"
  y="signups"
  label="campaign"
/>`}</pre>
      <p>
        Each card supports hover, touch, keyboard inspection and pinning, loading states and reduced
        motion. Their chart pages list every prop: <Link href="/charts/scatter">Scatter</Link>,{' '}
        <Link href="/charts/sankey">Sankey</Link>, <Link href="/charts/radar">Radar</Link> and{' '}
        <Link href="/charts/slope">Slope</Link>.
      </p>
    </>
  ),
  finance: (
    <>
      <p>
        Finance ships from its own entry, <code>@lilt-ui/charts/finance</code>, so dashboards that
        never draw a candle never load one. It holds <code>CandlestickChartCard</code>,{' '}
        <code>IndicatorChartCard</code>, <code>PriceChartCard</code>, <code>DepthChartCard</code>,{' '}
        <code>PortfolioChartCard</code> and <code>OrderBook</code>, plus the indicator math (
        <code>sma</code>, <code>ema</code>, <code>bollinger</code>, <code>macd</code>,{' '}
        <code>rsi</code>, <code>drawdown</code>, <code>rebase</code>, <code>depthLevels</code>).
      </p>
      <pre>{`import { CandlestickChartCard } from '@lilt-ui/charts/finance';

<CandlestickChartCard
  title="SOL / USDC"
  data={candles}
  x="date"
  open="open"
  high="high"
  low="low"
  close="close"
  volume="volume"
/>`}</pre>
      <p>
        To compose candles into your own <code>Chart</code>, give the close series{' '}
        <code>fields</code> for open, high and low, and draw it with <code>Candles</code> inside{' '}
        <code>ChartPlot</code>. See <Link href="/finance/candlestick">Candlestick</Link> for every
        prop.
      </p>
    </>
  ),
  selection: (
    <>
      <p>
        A card that pins a category can share that pin with the rest of your page.{' '}
        <code>RadialChartCard</code>, <code>FunnelChartCard</code> and{' '}
        <code>HorizontalBarChartCard</code> accept <code>selected</code> (a category name, or{' '}
        <code>null</code>) and <code>onSelectedChange</code>. Given <code>selected</code>, the card
        only asks: a click, tap or Escape calls <code>onSelectedChange</code>, and the pin moves
        when you pass the new value. Identity is the category name, so re-ranking or new values keep
        the pin. A selection naming a category that has left the data shows nothing pinned and asks
        you to clear it. Leave <code>selected</code> out and the card keeps its own pin.
      </p>
      <p>
        A category <code>Chart</code> uses <code>selectedCategoryId</code> and{' '}
        <code>onSelectedCategoryIdChange</code> in the same way, and <code>visibleSeries</code> with{' '}
        <code>onVisibleSeriesChange</code> controls which series show. Hover always stays local.
      </p>
      <p>
        Time and numeric charts link through <code>sync</code> on cards, or a shared{' '}
        <code>controller</code> from <code>createChartController()</code> on composed charts.
        Controller snapshots are read-only; call its methods to change inspection or ranges.
      </p>
      <p>
        <code>ChartRangeSummary</code> is a sibling of <code>ChartPlot</code> inside a time or
        numeric <code>Chart</code>. It follows the focused range and shows total, average, low, high
        and observation availability. <code>summarizeRange</code> exposes inclusive range statistics
        separately; no-known-data totals are null and missing endpoints produce an unknown change.
      </p>
      <p>
        <code>toChartCsv(data, columns)</code> returns CSV from explicit column accessors,
        preserving numeric negatives, blank nulls and ISO dates. It quotes multiline fields and
        protects text cells from spreadsheet formula interpretation. The helper has no download side
        effects.
      </p>
      <pre>{`<ChartRangeSummary series="revenue" />

const csv = toChartCsv(rows, [
  { header: 'Date', value: row => new Date(row.date) },
  { header: 'Revenue', value: row => row.revenue },
]);`}</pre>
    </>
  ),
  'range-brush': (
    <>
      <p>
        Set <code>brush</code> on a time or numeric <code>Chart</code>, then add{' '}
        <code>ChartBrush</code> after <code>ChartPlot</code>. Drag across the overview to choose an
        interval, drag either handle to refine it, or use the handles with the keyboard. Focus snaps
        to real observations; Show all restores the full extent. Brushing does not aggregate or
        resample data.
      </p>
    </>
  ),
  'svg-export': (
    <>
      <p>
        <code>serializeChartSvg(root, {'{ title, description }'})</code> returns a static, captioned
        SVG of a settled SVG-backed plot with resolved paint and font styles. It includes the plot
        only; surrounding HTML summaries, legends and controls are outside its scope. HTML-only
        chart families raise a clear error. Fonts must be available wherever the SVG is viewed.
      </p>
    </>
  ),
};

/** What the package does not do, shown at the foot of the API index. */
export const apiLimits: ReactNode = (
  <>
    <p>
      One active plot belongs to a Cartesian chart root. Line and Area marks draw long series from
      each pixel column&apos;s first, last, lowest and highest observation (<code>decimate</code>,
      on by default); hover, values, range summaries and exports still read every observation, and
      other Cartesian marks use the full series. Decimation selects original observations without
      averaging them. Card summaries and statistical families calculate the aggregates described on
      their own pages. Radial charts do not expose Cartesian range operations.
    </p>
  </>
);
