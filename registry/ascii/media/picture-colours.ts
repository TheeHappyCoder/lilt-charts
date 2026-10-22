import type { Rgb } from './colour';
import type { MediaFeed } from './feed';
import { chromaOnDark, chromaOnLight, kMeans } from './palette';

/** Colours a picture is cut down to. The stage builds eight fill styles for each. */
export const PICTURE_COLOURS = 24;

/**
 * The colours that best stand for a picture, for a dark backdrop and for a light one, from a
 * small copy of it. Each pixel counts by how much ink it puts down, so a few bright details aren't
 * outvoted by a large dim background. Null when the picture can't be read.
 */
export function pictureColours(
  feed: MediaFeed,
  k = PICTURE_COLOURS,
): { dark: Rgb[]; light: Rgb[] } | null {
  const { width, height } = feed;
  if (width < 1 || height < 1) return null;
  const scale = 72 / Math.max(width, height);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const data = feed.read(0, 0, width, height, w, h);
  if (!data) return null;
  const n = w * h;
  const darkPoints = new Float32Array(n * 3);
  const lightPoints = new Float32Array(n * 3);
  const darkWeights = new Float32Array(n);
  const lightWeights = new Float32Array(n);
  const c: Rgb = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3]! / 255;
    const r = data[i * 4]! / 255;
    const g = data[i * 4 + 1]! / 255;
    const b = data[i * 4 + 2]! / 255;
    darkWeights[i] = chromaOnDark(r, g, b, c) * a + 1e-4;
    darkPoints.set(c, i * 3);
    lightWeights[i] = chromaOnLight(r, g, b, c) * a + 1e-4;
    lightPoints.set(c, i * 3);
  }
  return {
    dark: kMeans(darkPoints, darkWeights, k),
    light: kMeans(lightPoints, lightWeights, k),
  };
}
