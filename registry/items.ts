import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

/**
 * The registry: every Component and ASCII scene a reader can add with the shadcn CLI, and the
 * shared pieces they stand on. An item names only its entry file; its other files are found by
 * following relative imports, and any file that belongs to a shared item becomes a dependency on
 * that item instead. Files keep their place under `components/lilt/` (`ascii/…` or `ui/…`), so the relative imports between them work unchanged
 * in the reader's project. Packages a file imports, such as `motion`, become the item's
 * npm dependencies.
 */

export type RegistrySection = 'components' | 'ascii' | 'shared';

interface ItemSpec {
  /** The item's name, and the docs page's id for a Component or scene. */
  name: string;
  section: RegistrySection;
  /** The export a reader renders; shared items have none. */
  component?: string;
}

interface PageSpec extends ItemSpec {
  section: 'components' | 'ascii';
  component: string;
  /** The file that exports `component`, relative to the registry folder. */
  entry: string;
  /** Said for the CLI and the docs; by default the doc comment on `component`. */
  description?: string;
}

interface SharedSpec extends ItemSpec {
  section: 'shared';
  description: string;
  /** Every file in the shared item, relative to the registry folder. */
  files: readonly string[];
}

/** Code several ASCII items use. Each file sits in at most one shared item. */
const asciiShared: readonly SharedSpec[] = [
  {
    name: 'ascii-engine',
    section: 'shared',
    description: 'Noise, glyph ramps and the glyph surface every ASCII piece draws with.',
    files: ['engine/noise.ts', 'engine/glyphs.ts', 'engine/surface.ts', 'engine/types.ts'],
  },
  {
    name: 'ascii-canvas',
    section: 'shared',
    description:
      'The canvas host that runs a scene: sizing, the clock, the pointer, and rest off screen.',
    files: ['engine/stage.ts', 'react/ascii-canvas.tsx'],
  },
  {
    name: 'ascii-motion',
    section: 'shared',
    description: 'Reduced-motion and clock hooks, canvas fitting and colour mixing.',
    files: ['interface/motion.ts'],
  },
  {
    name: 'ascii-bitmap-font',
    section: 'shared',
    description: 'A bold 5 by 7 capital font, for big type drawn cell by cell.',
    files: ['text/bitmap-font.ts'],
  },
  {
    name: 'ascii-text-kit',
    section: 'shared',
    description: 'Hooks and glyph sets the text effects share.',
    files: ['text/text-kit.ts'],
  },
  {
    name: 'ascii-curtain-paint',
    section: 'shared',
    description: 'The scrambling front the transition and the curtain both paint.',
    files: ['interface/curtain-paint.ts'],
  },
  {
    name: 'ascii-chart-kit',
    section: 'shared',
    description: 'Ticks, number formats, scrambled text and labels for data drawn in type.',
    files: ['charts/chart-kit.ts'],
  },
  {
    name: 'ascii-backgrounds-kit',
    section: 'shared',
    description: 'Brand gradient and pointer bump the backgrounds share.',
    files: ['backgrounds/shared.ts'],
  },
  {
    name: 'ascii-scenes-kit',
    section: 'shared',
    description: 'Coverage, gradients and word rasterising the larger scenes share.',
    files: ['more-scenes/shared.ts'],
  },
  {
    name: 'ascii-colour',
    section: 'shared',
    description: 'Colour parsing and mixing for pictures, video and models.',
    files: ['media/colour.ts'],
  },
  {
    name: 'ascii-media',
    section: 'shared',
    description: 'Sampling an image or video into cells, palettes, and the backdrop it sits on.',
    files: [
      'media/feed.ts',
      'media/palette.ts',
      'media/sample.ts',
      'media/media-scene.ts',
      'media/use-backdrop.ts',
    ],
  },
];

const page = (
  section: PageSpec['section'],
  name: string,
  component: string,
  entry: string,
): PageSpec => ({ name, section, component, entry });

/**
 * One item per ASCII docs page, in the order the rails list them. Anything drawn in type is ASCII,
 * interface pieces and text effects included; Components is for pieces that are not.
 */
const asciiPages: readonly PageSpec[] = [
  page('ascii', 'loader', 'AsciiLoader', 'interface/ascii-loader.tsx'),
  page('ascii', 'frame', 'AsciiFrame', 'interface/ascii-frame.tsx'),
  page('ascii', 'transition', 'AsciiTransition', 'interface/ascii-transition.tsx'),
  page('ascii', 'curtain', 'AsciiCurtain', 'interface/ascii-curtain.tsx'),
  page('ascii', 'cursor-trail', 'AsciiCursorTrail', 'interface/ascii-cursor-trail.tsx'),
  page('ascii', 'ghost-cursors', 'CursorGhosts', 'interface/cursor-ghosts.tsx'),
  page('ascii', 'scramble', 'AsciiScramble', 'text/ascii-scramble.tsx'),
  page('ascii', 'terminal', 'AsciiTerminal', 'text/ascii-terminal.tsx'),
  page('ascii', 'glitch', 'AsciiGlitch', 'text/ascii-glitch.tsx'),
  page('ascii', 'counter', 'AsciiCounter', 'live/counter.tsx'),
  page('ascii', 'logo', 'AsciiLogo', 'text/ascii-logo.tsx'),
  page('ascii', 'dot-grid', 'AsciiDotGrid', 'backgrounds/ascii-dot-grid.tsx'),
  page('ascii', 'matrix', 'AsciiMatrix', 'backgrounds/ascii-matrix.tsx'),
  page('ascii', 'topography', 'AsciiTopography', 'backgrounds/ascii-topography.tsx'),
  page('ascii', 'starfield', 'AsciiStarfield', 'backgrounds/ascii-starfield.tsx'),
  page('ascii', 'image', 'AsciiImage', 'media/ascii-image.tsx'),
  page('ascii', 'video', 'AsciiVideo', 'media/ascii-video.tsx'),
  page('ascii', 'model', 'AsciiModel', 'media/ascii-model.tsx'),
  page('ascii', 'globe', 'AsciiGlobe', 'live/ascii-globe.tsx'),
  page('ascii', 'clock', 'AsciiClock', 'live/ascii-clock.tsx'),
  page('ascii', 'sparkline', 'AsciiSparkline', 'live/sparkline.tsx'),
  page('ascii', 'area', 'AsciiArea', 'charts/ascii-area.tsx'),
  page('ascii', 'bars', 'AsciiBars', 'charts/ascii-bars.tsx'),
  page('ascii', 'heatmap', 'AsciiHeatmap', 'charts/ascii-heatmap.tsx'),
  page('ascii', 'fireworks', 'AsciiFireworks', 'more-scenes/ascii-fireworks.tsx'),
  page('ascii', 'lava-lamp', 'AsciiLava', 'more-scenes/ascii-lava.tsx'),
  page('ascii', 'glow', 'AsciiGlow', 'scenes/ascii-glow.tsx'),
  page('ascii', 'aurora', 'AsciiAurora', 'scenes/ascii-aurora.tsx'),
  page('ascii', 'planet', 'AsciiPlanet', 'scenes/ascii-planet.tsx'),
  page('ascii', 'galaxy', 'AsciiGalaxy', 'scenes/ascii-galaxy.tsx'),
  page('ascii', 'shore', 'AsciiShore', 'more-scenes/ascii-shore.tsx'),
  page('ascii', 'rain', 'AsciiRain', 'scenes/ascii-rain.tsx'),
  page('ascii', 'koi', 'AsciiKoi', 'scenes/ascii-koi.tsx'),
  page('ascii', 'jellyfish', 'AsciiJellyfish', 'scenes/ascii-jellyfish.tsx'),
  page('ascii', 'sea', 'AsciiSea', 'scenes/ascii-sea.tsx'),
  page('ascii', 'snow', 'AsciiSnow', 'more-scenes/ascii-snow.tsx'),
  page('ascii', 'ember', 'AsciiEmber', 'scenes/ascii-ember.tsx'),
  page('ascii', 'murmuration', 'AsciiMurmuration', 'scenes/ascii-murmuration.tsx'),
  page('ascii', 'meadow', 'AsciiMeadow', 'scenes/ascii-meadow.tsx'),
  page('ascii', 'black-hole', 'AsciiBlackHole', 'worlds/ascii-black-hole.tsx'),
  page('ascii', 'wormhole', 'AsciiWormhole', 'worlds/ascii-wormhole.tsx'),
  page('ascii', 'orrery', 'AsciiOrrery', 'worlds/ascii-orrery.tsx'),
  page('ascii', 'night-city', 'AsciiNightCity', 'worlds/ascii-night-city.tsx'),
  page('ascii', 'smoke', 'AsciiSmoke', 'worlds/ascii-smoke.tsx'),
  page('ascii', 'lighthouse', 'AsciiLighthouse', 'worlds/ascii-lighthouse.tsx'),
  page('ascii', 'window-rain', 'AsciiWindowRain', 'worlds/ascii-window-rain.tsx'),
  page('ascii', 'bonsai', 'AsciiBonsai', 'worlds/ascii-bonsai.tsx'),
  page('ascii', 'fireflies', 'AsciiFireflies', 'worlds/ascii-fireflies.tsx'),
  page('ascii', 'helix', 'AsciiHelix', 'worlds/ascii-helix.tsx'),
  page('ascii', 'visualizer', 'AsciiVisualizer', 'worlds/ascii-visualizer.tsx'),
  page('ascii', 'flag', 'AsciiFlag', 'worlds/ascii-flag.tsx'),
  page('ascii', 'split-flap', 'AsciiSplitFlap', 'text/ascii-split-flap.tsx'),
  page('ascii', 'redact', 'AsciiRedact', 'text/ascii-redact.tsx'),
  page('ascii', 'wave', 'AsciiWave', 'text/ascii-wave.tsx'),
  page('ascii', 'spotlight', 'AsciiSpotlight', 'text/ascii-spotlight.tsx'),
  page('ascii', 'particle-word', 'AsciiParticleWord', 'text/ascii-particle-word.tsx'),
  page('ascii', 'empty-state', 'AsciiEmptyState', 'interface/ascii-empty-state.tsx'),
  page('ascii', 'countdown', 'AsciiCountdown', 'interface/ascii-countdown.tsx'),
  page('ascii', 'dissolve', 'AsciiDissolve', 'interface/ascii-dissolve.tsx'),
  page('ascii', 'logo-cloud', 'AsciiLogoCloud', 'interface/ascii-logo-cloud.tsx'),
  page('ascii', 'log', 'AsciiLog', 'interface/ascii-log.tsx'),
  page('ascii', 'status', 'AsciiStatus', 'interface/ascii-status.tsx'),
  page('ascii', 'scroll-meter', 'AsciiScrollMeter', 'interface/ascii-scroll-meter.tsx'),
];

/**
 * One item per Components page: interface pieces that are not drawn in type. They live under
 * `ui/` and land in `components/lilt/ui/`.
 */
const uiPages: readonly PageSpec[] = [
  page('components', 'connect-button', 'ConnectButton', 'connect-button.tsx'),
  page('components', 'thinking', 'Thinking', 'thinking.tsx'),
  page('components', 'status-pill', 'StatusPill', 'status-pill.tsx'),
  page('components', 'presence', 'Presence', 'presence.tsx'),
  page('components', 'hold-to-confirm', 'HoldToConfirm', 'hold-to-confirm.tsx'),
  page('components', 'command-copy', 'CommandCopy', 'command-copy.tsx'),
  page('components', 'stream-text', 'StreamText', 'stream-text.tsx'),
  page('components', 'tool-trace', 'ToolTrace', 'tool-trace.tsx'),
  page('components', 'number-roll', 'NumberRoll', 'number-roll.tsx'),
  page('components', 'swipe-row', 'SwipeRow', 'swipe-row.tsx'),
  page('components', 'theme-flip', 'ThemeFlip', 'theme-flip.tsx'),
  page('components', 'dynamic-island', 'DynamicIsland', 'dynamic-island.tsx'),
];

const under = (folder: string) => (path: string) => `${folder}/${path}`;
const sharedItems: readonly SharedSpec[] = [
  ...asciiShared.map((item) => ({ ...item, files: item.files.map(under('ascii')) })),
];
const pageItems: readonly PageSpec[] = [
  ...asciiPages.map((item) => ({ ...item, entry: under('ascii')(item.entry) })),
  ...uiPages.map((item) => ({ ...item, entry: under('ui')(item.entry) })),
];

/** Where every file lands in the reader's project, under their components alias. */
export const TARGET_ROOT = 'components/lilt';

/** An item with its files and dependencies worked out. */
export interface ResolvedItem {
  name: string;
  section: RegistrySection;
  type: 'registry:component' | 'registry:lib';
  title: string;
  description: string;
  component?: string;
  /** The reader's import path for `component`, such as `@/components/lilt/ascii/scenes/ascii-koi`. */
  importPath?: string;
  /** This item's own files, relative to the registry folder, entry first. */
  files: string[];
  /** Shared items this one needs, directly or through another shared item. */
  registryDependencies: string[];
  /** npm packages its own files import, with the range the registry is built against. */
  dependencies: string[];
}

const IMPORT =
  /(?:import|export)\s[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\s*['"](\.{1,2}\/[^'"]+)['"]/g;

/** The relative imports of one file, resolved to paths under the registry folder. */
function importsOf(root: string, file: string): string[] {
  const source = readFileSync(join(root, file), 'utf8');
  const found: string[] = [];
  for (const match of source.matchAll(IMPORT)) {
    const spec = match[1] ?? match[2]!;
    const base = posix.join(posix.dirname(file), spec);
    const hit = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, base].find((candidate) =>
      existsSync(join(root, candidate)),
    );
    if (!hit) throw new Error(`${file} imports ${spec}, which is not in the registry.`);
    found.push(hit);
  }
  return found;
}

const PACKAGE = /(?:import|export)\s[^'"]*?from\s*['"]([^.'"][^'"]*)['"]/g;

/** The npm packages a set of files import, as `name@range`; React is the reader's already. */
function packagesOf(root: string, files: readonly string[]): string[] {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    peerDependencies?: Record<string, string>;
  };
  const names = new Set<string>();
  for (const file of files) {
    if (!/\.tsx?$/.test(file)) continue;
    for (const match of readFileSync(join(root, file), 'utf8').matchAll(PACKAGE)) {
      const [scope, name] = match[1]!.split('/');
      const pkg = scope!.startsWith('@') ? `${scope}/${name}` : scope!;
      if (pkg !== 'react' && pkg !== 'react-dom') names.add(pkg);
    }
  }
  return [...names].sort().map((pkg) => {
    const range = manifest.peerDependencies?.[pkg];
    if (!range) throw new Error(`${pkg} is imported but not a peer dependency of the registry.`);
    return `${pkg}@${range}`;
  });
}

/** A file and everything it reaches, stopping at shared items' files. */
function closure(root: string, entries: readonly string[], owner: Map<string, string>) {
  const own = new Set<string>();
  const needs = new Set<string>();
  const stack = [...entries];
  const seen = new Set<string>();
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const next of importsOf(root, file)) {
      const shared = owner.get(next);
      if (shared) needs.add(shared);
      else stack.push(next);
    }
    own.add(file);
  }
  return { own: [...own], needs: [...needs] };
}

const titleOf = (name: string) =>
  name
    .replace(/^ascii-/, 'ASCII ')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/** The doc comment on `export function name`, as one line. */
function docOf(source: string, name: string): string {
  const match = source.match(
    new RegExp(`/\\*\\*((?:(?!\\*/)[\\s\\S])*)\\*/\\s*export function ${name}\\b`),
  );
  return match
    ? match[1]!
        .split('\n')
        .map((line) => line.replace(/^\s*\*\s?/, '').trim())
        .filter(Boolean)
        .join(' ')
    : '';
}

/**
 * Every item with its files resolved. `root` is the registry folder; callers pass it because a
 * bundled caller cannot rely on this module's own location.
 */
export function resolveItems(root: string): ResolvedItem[] {
  const owner = new Map<string, string>();
  for (const item of sharedItems) for (const file of item.files) owner.set(file, item.name);

  const shared = sharedItems.map((item): ResolvedItem => {
    const { needs } = closure(
      root,
      item.files,
      new Map([...owner].filter(([, name]) => name !== item.name)),
    );
    return {
      name: item.name,
      section: 'shared',
      type: 'registry:lib',
      title: titleOf(item.name),
      description: item.description,
      files: [...item.files],
      registryDependencies: needs,
      dependencies: packagesOf(root, item.files),
    };
  });
  // Shared items pull in what their own dependencies need, so a reader gets the whole chain.
  const byName = new Map(shared.map((item) => [item.name, item]));
  const expand = (names: readonly string[]): string[] => {
    const out = new Set<string>();
    const visit = (name: string) => {
      if (out.has(name)) return;
      out.add(name);
      byName.get(name)!.registryDependencies.forEach(visit);
    };
    names.forEach(visit);
    return [...out];
  };

  const pages = pageItems.map((item): ResolvedItem => {
    const { own, needs } = closure(root, [item.entry], owner);
    const source = readFileSync(join(root, item.entry), 'utf8');
    const description = item.description ?? docOf(source, item.component);
    if (!description) throw new Error(`${item.entry} has no doc comment on ${item.component}.`);
    return {
      name: item.name,
      section: item.section,
      type: 'registry:component',
      title: titleOf(item.name),
      description,
      component: item.component,
      importPath: `@/${TARGET_ROOT}/${item.entry.replace(/\.tsx?$/, '')}`,
      files: [item.entry, ...own.filter((file) => file !== item.entry).sort()],
      registryDependencies: expand(needs),
      dependencies: packagesOf(root, own),
    };
  });

  // A file two items both copy belongs in a shared item; otherwise one would overwrite the other.
  const claimed = new Map<string, string>();
  for (const item of pages) {
    for (const file of item.files) {
      const other = claimed.get(file);
      if (other) throw new Error(`${file} is in both ${other} and ${item.name}; share it.`);
      claimed.set(file, item.name);
    }
  }
  return [...pages, ...shared];
}

/** The registry item for a docs page, by its id. */
export const itemFor = (items: readonly ResolvedItem[], name: string) =>
  items.find((item) => item.name === name);

/** A file's source, for the build and the docs' Manual tab. */
export const sourceOf = (root: string, file: string) => readFileSync(join(root, file), 'utf8');

/** The registry folder seen from a working directory inside the workspace. */
export const registryRootFrom = (cwd: string) =>
  existsSync(join(cwd, 'items.ts')) ? cwd : join(cwd, '..', '..', 'registry');
