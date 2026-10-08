import { describe, expect, it } from 'vitest';
import { hitTestScatter } from './scatter';
import { layoutSankey, mixSankeyLayout, normalizeSankey } from './sankey';

describe('scatter semantics', () => {
  it('cycles coincident points with a repeated click and preserves keyboard alternatives', () => {
    const points = [
      { id: 'a', label: 'A', row: 1, x: 0, y: 0, size: 1, cx: 40, cy: 50, radius: 5 },
      { id: 'b', label: 'B', row: 2, x: 0, y: 0, size: 1, cx: 40, cy: 50, radius: 5 },
    ];
    expect(hitTestScatter(points, 40, 50, null, true)).toBe('a');
    expect(hitTestScatter(points, 40, 50, 'a', true)).toBe('b');
    expect(hitTestScatter(points, 90, 90, null)).toBeNull();
  });
});

describe('Sankey flow semantics', () => {
  const nodes = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
  ];
  it('requires a DAG and enforces the selected conservation policy', () => {
    const links = [
      { id: 'ab', source: 'a', target: 'b', value: 10 },
      { id: 'bc', source: 'b', target: 'c', value: 8 },
    ];
    expect(() => normalizeSankey(nodes, links, 'strict')).toThrow(/conserve/);
    const graph = normalizeSankey(nodes, links, 'allow-loss');
    expect(graph.losses.b).toBe(2);
    expect(graph.depth.c).toBe(2);
    expect(() =>
      normalizeSankey(
        nodes,
        [...links, { id: 'ca', source: 'c', target: 'a', value: 1 }],
        'allow-loss',
      ),
    ).toThrow(/acyclic/);
  });
  it('keeps unavailable links out of geometry and labels conservation as unknown', () => {
    const graph = normalizeSankey(
      nodes,
      [
        { id: 'ab', source: 'a', target: 'b', value: 10 },
        { id: 'bc', source: 'b', target: 'c', value: null },
      ],
      'strict',
    );
    expect(graph.losses.b).toBeNull();
    const layout = layoutSankey(graph, 600, 300);
    expect(layout.links).toHaveLength(1);
    expect(layout.links[0].width).toBeGreaterThan(0);
    expect(layout.nodes.find((node) => node.id === 'a')!.x).toBeLessThan(
      layout.nodes.find((node) => node.id === 'b')!.x,
    );
  });
  it('keeps a measured zero flow visible and inspectable', () => {
    const graph = normalizeSankey(
      [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      [{ id: 'zero', source: 'a', target: 'b', value: 0 }],
      'strict',
    );
    const layout = layoutSankey(graph, 600, 300);
    expect(layout.links).toHaveLength(1);
    expect(layout.links[0]?.id).toBe('zero');
    expect(layout.links[0]?.width).toBe(1);
  });
  it('fits large values inside the plot', () => {
    const graph = normalizeSankey(
      [
        { id: 'revenue', label: 'Revenue' },
        { id: 'costs', label: 'Costs' },
        { id: 'profit', label: 'Profit' },
      ],
      [
        { id: 'rc', source: 'revenue', target: 'costs', value: 840_000 },
        { id: 'rp', source: 'revenue', target: 'profit', value: 360_000 },
      ],
      'strict',
    );
    const layout = layoutSankey(graph, 600, 300);
    for (const node of layout.nodes) {
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y + node.height).toBeLessThanOrEqual(300);
    }
    const revenue = layout.nodes.find((node) => node.id === 'revenue')!;
    expect(revenue.height).toBeGreaterThan(200);
  });
});

describe('sankey period morph', () => {
  const nodes = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
  ];
  const layoutOf = (ab: number, ac: number) =>
    layoutSankey(
      normalizeSankey(
        nodes,
        [
          { id: 'ab', source: 'a', target: 'b', value: ab },
          { id: 'ac', source: 'a', target: 'c', value: ac },
        ],
        'allow-loss',
      ),
      400,
      200,
    );

  it('lands exactly on each layout at its ends and blends the same flows between', () => {
    const before = layoutOf(30, 10);
    const after = layoutOf(10, 30);
    const width = (frame: ReturnType<typeof mixSankeyLayout>, id: string) =>
      frame.links.find((link) => link.id === id)!.width;
    const start = mixSankeyLayout(before, after, 0);
    const end = mixSankeyLayout(before, after, 1);
    expect(width(start, 'ab')).toBeCloseTo(before.links.find((l) => l.id === 'ab')!.width);
    expect(width(end, 'ab')).toBeCloseTo(after.links.find((l) => l.id === 'ab')!.width);
    const middle = mixSankeyLayout(before, after, 0.5);
    expect(width(middle, 'ab')).toBeLessThan(width(start, 'ab'));
    expect(width(middle, 'ab')).toBeGreaterThan(width(end, 'ab'));
    expect(end.links.find((l) => l.id === 'ab')!.path).toBe(
      after.links.find((l) => l.id === 'ab')!.path,
    );
  });

  it('grows a flow that is new to the period from nothing', () => {
    const before = layoutSankey(
      normalizeSankey(nodes, [{ id: 'ab', source: 'a', target: 'b', value: 30 }], 'allow-loss'),
      400,
      200,
    );
    const after = layoutOf(20, 20);
    const frame = mixSankeyLayout(before, after, 0);
    expect(frame.links.find((link) => link.id === 'ac')!.width).toBe(0);
  });
});
