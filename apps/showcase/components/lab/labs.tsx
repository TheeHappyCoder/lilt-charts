'use client';

import type {
  ChartAxis,
  ChartAxisStyle,
  ChartBackground,
  ChartPalette,
  ChartHoverReadout,
  ChartHoverStyle,
  ChartSurface,
  ChartTooltipIndicator,
} from '@lilt-ui/charts';
import { CartesianScene, CompareCard, EnsembleScene, ScaleCard, ScaleScene } from './lab-scenes';
import { LabStudio, type LabOption } from './lab-studio';

const palettes: readonly LabOption<ChartPalette>[] = [
  { value: 'iris', label: 'Iris', note: 'Violet, rose, and amber. The default.' },
  { value: 'cobalt', label: 'Cobalt', note: 'Blue, cyan, and indigo. Cool and product-like.' },
  { value: 'emerald', label: 'Emerald', note: 'Green, lime, and deep teal. Calm and natural.' },
];

export function ColorsLab() {
  return (
    <LabStudio
      label="Palette"
      prop="palette"
      options={palettes}
      defaultValue="iris"
      scene={(palette) => <EnsembleScene palette={palette} />}
      compare={(palette) => <CompareCard palette={palette} />}
    />
  );
}

const surfaces: readonly LabOption<ChartSurface>[] = [
  { value: 'elevated', label: 'Elevated', note: 'Raised, with a soft shadow. The default.' },
  { value: 'outline', label: 'Outline', note: 'A hairline border; the page shows through.' },
  { value: 'ghost', label: 'Ghost', note: 'No frame at all, inside your own card.' },
];

export function SurfacesLab() {
  return (
    <LabStudio
      label="Surface"
      prop="surface"
      options={surfaces}
      defaultValue="elevated"
      scene={(surface) => <EnsembleScene surface={surface} />}
      compare={(surface) => <CompareCard surface={surface} />}
    />
  );
}

const backgrounds: readonly LabOption<ChartBackground>[] = [
  { value: 'dots', label: 'Dots', note: 'A quiet dot grid. The default.' },
  { value: 'grid', label: 'Grid', note: 'Crossing hairlines, like graph paper.' },
  { value: 'lines', label: 'Lines', note: 'Horizontal rules only.' },
  { value: 'none', label: 'None', note: 'Nothing behind the marks.' },
];

export function BackgroundsLab() {
  return (
    <LabStudio
      label="Background"
      prop="background"
      options={backgrounds}
      defaultValue="dots"
      scene={(background) => <CartesianScene background={background} />}
      compare={(background) => <CompareCard background={background} />}
    />
  );
}

const axes: readonly LabOption<ChartAxisStyle>[] = [
  { value: 'minimal', label: 'Minimal', note: 'Only the x ends. The default.' },
  { value: 'dots', label: 'Dots', note: 'Y labels with dotted leaders; a dot under every point.' },
  { value: 'inline', label: 'Inline', note: 'Y labels on the grid, full width.' },
  { value: 'ruler', label: 'Ruler', note: 'Inline labels and a tick per point.' },
  { value: 'classic', label: 'Classic', note: 'Y labels in a left gutter.' },
  { value: 'segmented', label: 'Segmented', note: 'Rounded segments between ticks.' },
];

type Scale = 'plain' | 'series' | 'range';

const scales: readonly LabOption<Scale>[] = [
  { value: 'plain', label: 'Plain', note: 'A quiet segmented y axis.' },
  { value: 'series', label: 'Series', note: 'The series color, faint to full.' },
  { value: 'range', label: 'Range', note: 'Your colors, low to high: good to bad.' },
];

const scaleAxis = (scale: Scale): ChartAxis => ({
  y: {
    style: 'segmented',
    ...(scale === 'series'
      ? { gradient: true }
      : scale === 'range'
        ? { gradient: ['var(--lilt-positive)', 'var(--lilt-annotation)', 'var(--lilt-negative)'] }
        : {}),
  },
});

export function AxesLab() {
  return (
    <>
      <LabStudio
        label="Axis"
        prop="axis"
        options={axes}
        defaultValue="minimal"
        scene={(axis) => <CartesianScene axis={axis} />}
        compare={(axis) => <CompareCard axis={axis} />}
      />
      <LabStudio
        label="Axis scale"
        prop="axis"
        options={scales}
        defaultValue="range"
        code={(scale) =>
          scale === 'plain'
            ? "axis={{ y: 'segmented' }}"
            : scale === 'series'
              ? "axis={{ y: { style: 'segmented', gradient: true } }}"
              : "axis={{ y: { style: 'segmented', gradient: [good, warn, bad] } }}"
        }
        scene={(scale) => <ScaleScene axis={scaleAxis(scale)} />}
        compare={(scale) => <ScaleCard axis={scaleAxis(scale)} />}
      />
    </>
  );
}

const readouts: readonly LabOption<ChartHoverReadout>[] = [
  { value: 'pills', label: 'Pills', note: 'Date and value on the axes. The default.' },
  { value: 'tooltip', label: 'Tooltip', note: 'Every series in one panel; the headline rests.' },
  { value: 'strip', label: 'Strip', note: 'One line docked above the plot, never over it.' },
  { value: 'headline', label: 'Headline', note: 'Only the headline and tiles follow.' },
];

const hoverStyles: readonly LabOption<ChartHoverStyle>[] = [
  { value: 'soft', label: 'Soft', note: 'Surface glass. The default.' },
  { value: 'solid', label: 'Solid', note: 'Inverted, high contrast.' },
  { value: 'accent', label: 'Accent', note: 'Glass tinted by the series under the pointer.' },
];

const tooltipIndicators: readonly LabOption<ChartTooltipIndicator>[] = [
  { value: 'square', label: 'Square', note: 'Rounded squares, like the tiles. The default.' },
  { value: 'dot', label: 'Dot', note: 'Small and quiet.' },
  { value: 'line', label: 'Line', note: 'A bar the height of the row.' },
];

/** One readout for the hovered point, how it looks, and the markers on tooltip rows. */
export function HoverLab() {
  return (
    <>
      <LabStudio
        label="Hover readout"
        prop="hover"
        options={readouts}
        defaultValue="pills"
        scene={(hover) => <CartesianScene hover={hover} />}
        compare={(hover) => <CompareCard hover={hover} />}
      />
      <LabStudio
        label="Hover style"
        prop="hoverStyle"
        options={hoverStyles}
        defaultValue="soft"
        scene={(hoverStyle) => <CartesianScene hover="mixed" hoverStyle={hoverStyle} />}
        compare={(hoverStyle) => <CompareCard hover="tooltip" hoverStyle={hoverStyle} />}
      />
      <LabStudio
        label="Tooltip indicator"
        prop="tooltipIndicator"
        options={tooltipIndicators}
        defaultValue="square"
        scene={(indicator) => <CartesianScene hover="tooltip" tooltipIndicator={indicator} />}
        compare={(indicator) => <CompareCard hover="tooltip" tooltipIndicator={indicator} />}
      />
    </>
  );
}
