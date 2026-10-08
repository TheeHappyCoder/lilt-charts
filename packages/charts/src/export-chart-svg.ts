/** Browser-side static export for SVG-backed chart plots. HTML readouts and legends are not included. */
export interface ChartSvgExportOptions {
  title: string;
  description?: string;
  /** Defaults to the chart's resolved --lilt-surface color. */
  background?: string;
}

const PAINT_PROPERTIES = [
  'color',
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-opacity',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'stop-color',
  'stop-opacity',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'letter-spacing',
  'paint-order',
  'vector-effect',
] as const;

export function serializeChartSvg(root: Element, options: ChartSvgExportOptions): string {
  if (!options.title.trim()) throw new Error('Lilt SVG export requires an accessible title.');
  const source =
    root instanceof SVGSVGElement
      ? root
      : root.querySelector(
          '.lilt-chart__svg, .lilt-radial__svg, .lilt-radial-progress svg, .lilt-scatter__svg, .lilt-sankey__svg, .lilt-radar__svg',
        );
  if (!(source instanceof SVGSVGElement))
    throw new Error('Lilt SVG export supports SVG-backed chart plots. This chart has no SVG plot.');
  const bounds = source.getBoundingClientRect();
  const width = Number(source.getAttribute('width')) || bounds.width;
  const height = Number(source.getAttribute('height')) || bounds.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new Error('Lilt SVG export needs a measured chart with positive width and height.');
  const clone = source.cloneNode(true) as SVGSVGElement;
  const originalElements = [source, ...source.querySelectorAll('*')];
  const cloneElements = [clone, ...clone.querySelectorAll('*')];
  for (let index = 0; index < originalElements.length; index += 1) {
    const original = originalElements[index];
    const copy = cloneElements[index] as SVGElement;
    const computed = getComputedStyle(original);
    for (const property of PAINT_PROPERTIES) {
      const value = computed.getPropertyValue(property);
      if (value) copy.style.setProperty(property, value);
    }
    copy.style.setProperty('animation', 'none');
    copy.style.setProperty('transition', 'none');
  }
  for (const old of clone.querySelectorAll(':scope > title, :scope > desc')) old.remove();
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', clone.getAttribute('viewBox') ?? `0 0 ${width} ${height}`);
  clone.setAttribute('role', 'img');
  clone.removeAttribute('aria-label');
  clone.removeAttribute('aria-labelledby');
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.id = 'lilt-static-title';
  title.textContent = options.title;
  clone.prepend(title);
  let captionEnd: Element = title;
  if (options.description) {
    const description = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
    description.id = 'lilt-static-description';
    description.textContent = options.description;
    title.after(description);
    captionEnd = description;
    clone.setAttribute('aria-labelledby', `${title.id} ${description.id}`);
  } else clone.setAttribute('aria-labelledby', title.id);
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('x', '0');
  background.setAttribute('y', '0');
  background.setAttribute('width', String(width));
  background.setAttribute('height', String(height));
  const themeRoot = source.closest('[data-lilt-chart]') ?? root;
  background.setAttribute(
    'fill',
    options.background ??
      (getComputedStyle(themeRoot).getPropertyValue('--lilt-surface').trim() || '#fff'),
  );
  background.setAttribute('aria-hidden', 'true');
  captionEnd.after(background);
  return new XMLSerializer().serializeToString(clone);
}
