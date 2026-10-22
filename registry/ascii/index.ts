/**
 * Every component and scene in one place, for the docs site and the tests. Registry items never
 * import this file: each one copies only the files it uses.
 */
export { AsciiStage, type AsciiStageOptions } from './engine/stage';
export { GlyphSurface, DOT, LEVELS } from './engine/surface';
export type { AsciiGrid, AsciiPointer, AsciiScene } from './engine/types';
export { approach, clamp, fbm3, hash3, noise3, smoothstep } from './engine/noise';
export { ramp, stroke } from './engine/glyphs';

export { createPlanet, type PlanetOptions } from './scenes/planet';
export { createEmber, type EmberOptions } from './scenes/ember';
export { createMurmuration, type MurmurationOptions } from './scenes/murmuration';
export { createRain, type RainOptions } from './scenes/rain';
export { createGlow, type GlowOptions } from './scenes/glow';
export { createKoi, type KoiOptions } from './scenes/koi';
export { createJellyfish, type JellyfishOptions } from './scenes/jellyfish';
export { createAurora, type AuroraOptions } from './scenes/aurora';
export { createMeadow, type MeadowOptions } from './scenes/meadow';
export { createSea, type SeaOptions } from './scenes/sea';
export { createGalaxy, type GalaxyOptions } from './scenes/galaxy';
export { createArea, type AreaOptions } from './charts/area';
export { createBars, type BarsOptions } from './charts/bars';
export { createHeatmap, type HeatmapOptions } from './charts/heatmap';

export * from './backgrounds';

export * from './interface';

export * from './text';

export * from './live';

export * from './more-scenes';

export * from './media';

export {
  AsciiCanvas,
  useSceneProps,
  type AsciiCanvasProps,
  type SceneProps,
} from './react/ascii-canvas';
export { AsciiAurora } from './scenes/ascii-aurora';
export { AsciiEmber } from './scenes/ascii-ember';
export { AsciiGalaxy } from './scenes/ascii-galaxy';
export { AsciiGlow } from './scenes/ascii-glow';
export { AsciiJellyfish } from './scenes/ascii-jellyfish';
export { AsciiKoi } from './scenes/ascii-koi';
export { AsciiMeadow } from './scenes/ascii-meadow';
export { AsciiMurmuration } from './scenes/ascii-murmuration';
export { AsciiPlanet } from './scenes/ascii-planet';
export { AsciiRain } from './scenes/ascii-rain';
export { AsciiSea } from './scenes/ascii-sea';
export { AsciiArea } from './charts/ascii-area';
export { AsciiBars } from './charts/ascii-bars';
export { AsciiHeatmap } from './charts/ascii-heatmap';
