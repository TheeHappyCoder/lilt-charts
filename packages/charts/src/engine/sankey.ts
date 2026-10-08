export interface SankeyNode {
  id: string;
  label: string;
}
export interface SankeyLink {
  id: string;
  source: string;
  target: string;
  value: number | null;
}
export type ConservationPolicy = 'strict' | 'allow-loss';
export interface SankeyGraph<
  Node extends SankeyNode = SankeyNode,
  Link extends SankeyLink = SankeyLink,
> {
  nodes: readonly Node[];
  links: readonly Link[];
  depth: Readonly<Record<string, number>>;
  losses: Readonly<Record<string, number | null>>;
}
export interface PositionedSankeyNode extends SankeyNode {
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  total: number;
}
export interface PositionedSankeyLink extends SankeyLink {
  path: string;
  width: number;
  sourceY: number;
  targetY: number;
}

export function normalizeSankey<Node extends SankeyNode, Link extends SankeyLink>(
  nodes: readonly Node[],
  links: readonly Link[],
  conservation: ConservationPolicy,
): SankeyGraph<Node, Link> {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (!node.id || !node.label || ids.has(node.id))
      throw new Error('Lilt SankeyChart requires unique nonempty node IDs and labels.');
    ids.add(node.id);
  }
  const linkIds = new Set<string>();
  for (const link of links) {
    if (!link.id || linkIds.has(link.id))
      throw new Error('Lilt SankeyChart requires unique nonempty link IDs.');
    linkIds.add(link.id);
    if (!ids.has(link.source) || !ids.has(link.target) || link.source === link.target)
      throw new Error(
        `Lilt SankeyChart link "${link.id}" needs distinct known source and target nodes.`,
      );
    if (link.value !== null && (!Number.isFinite(link.value) || link.value < 0))
      throw new Error(
        `Lilt SankeyChart link "${link.id}" needs a non-negative finite value or null.`,
      );
  }
  const outgoing = new Map(
    nodes.map((node) => [node.id, links.filter((link) => link.source === node.id)]),
  );
  const incoming = new Map(
    nodes.map((node) => [node.id, links.filter((link) => link.target === node.id)]),
  );
  const indegree = new Map(nodes.map((node) => [node.id, incoming.get(node.id)!.length]));
  const queue = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const depth: Record<string, number> = Object.fromEntries(nodes.map((node) => [node.id, 0]));
  let visited = 0;
  while (queue.length) {
    const source = queue.shift()!;
    visited += 1;
    for (const link of outgoing.get(source)!) {
      depth[link.target] = Math.max(depth[link.target], depth[source] + 1);
      indegree.set(link.target, indegree.get(link.target)! - 1);
      if (indegree.get(link.target) === 0) queue.push(link.target);
    }
  }
  if (visited !== nodes.length) throw new Error('Lilt SankeyChart requires an acyclic flow graph.');
  const losses: Record<string, number | null> = {};
  for (const node of nodes) {
    const inbound = incoming.get(node.id)!;
    const outbound = outgoing.get(node.id)!;
    if (!inbound.length || !outbound.length) {
      losses[node.id] = 0;
      continue;
    }
    if ([...inbound, ...outbound].some((link) => link.value === null)) {
      losses[node.id] = null;
      continue;
    }
    const inTotal = inbound.reduce((sum, link) => sum + link.value!, 0);
    const outTotal = outbound.reduce((sum, link) => sum + link.value!, 0);
    const tolerance = Math.max(1e-9, Math.max(inTotal, outTotal) * 1e-9);
    if (conservation === 'strict' && Math.abs(inTotal - outTotal) > tolerance)
      throw new Error(`Lilt SankeyChart node "${node.id}" does not conserve flow.`);
    if (conservation === 'allow-loss' && outTotal - inTotal > tolerance)
      throw new Error(`Lilt SankeyChart node "${node.id}" creates flow under allow-loss policy.`);
    losses[node.id] = Math.max(0, inTotal - outTotal);
  }
  return { nodes, links, depth, losses };
}

export function layoutSankey(
  graph: SankeyGraph,
  width: number,
  height: number,
  compact = false,
): {
  nodes: PositionedSankeyNode[];
  links: PositionedSankeyLink[];
} {
  if (!graph.nodes.length) return { nodes: [], links: [] };
  const maxDepth = Math.max(1, ...Object.values(graph.depth));
  const groups = Array.from({ length: maxDepth + 1 }, (_, depth) =>
    graph.nodes.filter((node) => graph.depth[node.id] === depth),
  );
  const totals = Object.fromEntries(
    graph.nodes.map((node) => {
      const inbound = graph.links
        .filter((link) => link.target === node.id)
        .reduce((sum, link) => sum + (link.value ?? 0), 0);
      const outbound = graph.links
        .filter((link) => link.source === node.id)
        .reduce((sum, link) => sum + (link.value ?? 0), 0);
      return [node.id, Math.max(inbound, outbound, 1)];
    }),
  );
  const gap = 14;
  const top = 16;
  const plotHeight = Math.max(30, height - 32);
  const scale = Math.min(
    ...groups.map((group) =>
      // Pixels per unit. The floor only guards against a column whose gaps fill the plot; any
      // magnitude of value, from a handful of visitors to millions in revenue, scales to fit.
      Math.max(
        Number.EPSILON,
        (plotHeight - gap * Math.max(0, group.length - 1)) /
          group.reduce((sum, node) => sum + totals[node.id], 0),
      ),
    ),
  );
  const left = compact ? 12 : 86;
  const right = compact ? 12 : 86;
  const nodeWidth = 12;
  const nodes: PositionedSankeyNode[] = groups.flatMap((group, depth) => {
    const used =
      group.reduce((sum, node) => sum + totals[node.id] * scale, 0) +
      gap * Math.max(0, group.length - 1);
    let y = top + (plotHeight - used) / 2;
    return group.map((node) => {
      const result = {
        ...node,
        depth,
        x: left + (depth / maxDepth) * (width - left - right - nodeWidth),
        y,
        width: nodeWidth,
        height: totals[node.id] * scale,
        total: totals[node.id],
      };
      y += result.height + gap;
      return result;
    });
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const sourceOffset = new Map(
    nodes.map((node) => {
      const total = graph.links
        .filter((link) => link.source === node.id)
        .reduce((sum, link) => sum + (link.value ?? 0), 0);
      return [node.id, node.y + (node.height - total * scale) / 2];
    }),
  );
  const targetOffset = new Map(
    nodes.map((node) => {
      const total = graph.links
        .filter((link) => link.target === node.id)
        .reduce((sum, link) => sum + (link.value ?? 0), 0);
      return [node.id, node.y + (node.height - total * scale) / 2];
    }),
  );
  const links = graph.links
    .filter((link) => link.value !== null)
    .map((link) => {
      const source = byId.get(link.source)!;
      const target = byId.get(link.target)!;
      const thickness = link.value! * scale;
      const sourceY = sourceOffset.get(link.source)! + thickness / 2;
      const targetY = targetOffset.get(link.target)! + thickness / 2;
      sourceOffset.set(link.source, sourceOffset.get(link.source)! + thickness);
      targetOffset.set(link.target, targetOffset.get(link.target)! + thickness);
      const x1 = source.x + source.width;
      const x2 = target.x;
      const mid = (x1 + x2) / 2;
      return {
        ...link,
        path: `M${x1},${sourceY} C${mid},${sourceY} ${mid},${targetY} ${x2},${targetY}`,
        width: Math.max(1, thickness),
        sourceY,
        targetY,
      };
    });
  return { nodes, links };
}

/**
 * A frame between two layouts of the same flows, at `t` from 0 to 1 (a spring may pass 1).
 * Nodes move and resize, links keep their ends attached as they thicken or thin, and nodes or
 * links new to `to` grow from nothing. Matched by id, so a period change reads as the same
 * flows changing rather than a redraw.
 */
export function mixSankeyLayout(
  from: { nodes: readonly PositionedSankeyNode[]; links: readonly PositionedSankeyLink[] },
  to: { nodes: readonly PositionedSankeyNode[]; links: readonly PositionedSankeyLink[] },
  t: number,
): { nodes: PositionedSankeyNode[]; links: PositionedSankeyLink[] } {
  const mix = (a: number, b: number) => a + (b - a) * t;
  const grow = Math.max(0, Math.min(1, t));
  const before = new Map(from.nodes.map((node) => [node.id, node]));
  const nodes = to.nodes.map((node) => {
    const was = before.get(node.id);
    return was
      ? {
          ...node,
          x: mix(was.x, node.x),
          y: mix(was.y, node.y),
          width: mix(was.width, node.width),
          height: mix(was.height, node.height),
        }
      : { ...node, y: node.y + (node.height * (1 - grow)) / 2, height: node.height * grow };
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const linksBefore = new Map(from.links.map((link) => [link.id, link]));
  const links = to.links.map((link) => {
    const was = linksBefore.get(link.id);
    const source = byId.get(link.source)!;
    const target = byId.get(link.target)!;
    const sourceY = was ? mix(was.sourceY, link.sourceY) : link.sourceY;
    const targetY = was ? mix(was.targetY, link.targetY) : link.targetY;
    const x1 = source.x + source.width;
    const x2 = target.x;
    const mid = (x1 + x2) / 2;
    return {
      ...link,
      sourceY,
      targetY,
      width: Math.max(0, was ? mix(was.width, link.width) : link.width * grow),
      path: `M${x1},${sourceY} C${mid},${sourceY} ${mid},${targetY} ${x2},${targetY}`,
    };
  });
  return { nodes, links };
}
