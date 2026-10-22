'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AsciiScene } from '../engine/types';
import { AsciiCanvas, type SceneProps } from '../react/ascii-canvas';
import type { Rgb } from './colour';
import { canvasFeed, type MediaFeed } from './feed';
import { createMediaScene, type Backdrop, type MediaColor, type MediaMode } from './media-scene';
import { pictureFeed } from './picture';
import { pictureColours } from './picture-colours';
import type { MediaFit } from './sample';
import { useBackdrop } from './use-backdrop';

export interface ImageOptions {
  /**
   * The image's URL. It must be on the same origin or served with CORS, since its pixels are read.
   * Without one, a picture of three lit spheres is drawn.
   */
  src?: string;
  /** `glyphs` draws a density ramp of type; `blocks` draws solid lit blocks with a glyph cut in. Default `glyphs`. */
  mode?: MediaMode;
  /** `source` takes each cell's colour from the image; `mono` draws in one ink. Default `source`. */
  color?: MediaColor;
  /** The ink for `mono`, as a CSS colour. Default the text colour. */
  tint?: string;
  /** `contain` shows the whole image with room around it; `cover` fills the frame. Default `contain`. */
  fit?: MediaFit;
  /** Swap which end of the tones gets the dense glyphs, for dark pictures on a light ground. Default false. */
  invert?: boolean;
  /** Above 1 pushes tones apart, below 1 pulls them together. Default 1. */
  contrast?: number;
  /** Characters the pointer stirs the picture into. */
  scramble?: string;
}

export type AsciiImageProps = SceneProps<ImageOptions>;

/** Options for building an image scene by hand, from any feed. */
export interface ImageSceneOptions extends Omit<ImageOptions, 'src'> {
  /** Where the pixels come from. Default the picture of three spheres. */
  feed?: MediaFeed;
  /** Colours for `source`; read from the feed when not given. */
  palette?: { dark: readonly Rgb[]; light: readonly Rgb[] };
  /** The backdrop, read every frame. Default dark. */
  backdrop?: Backdrop;
}

let defaultPalette: { dark: Rgb[]; light: Rgb[] } | null = null;

/**
 * An image drawn in type, as a scene. Without a feed it draws the default picture of three lit
 * spheres; use `canvasFeed` to draw an image you've loaded yourself.
 */
export function createImage(options: ImageSceneOptions = {}): AsciiScene {
  const feed = options.feed ?? pictureFeed();
  let palette = options.palette;
  if (!palette && options.color !== 'mono') {
    if (!options.feed) palette = defaultPalette ??= pictureColours(feed)!;
    else palette = pictureColours(feed) ?? undefined;
  }
  return createMediaScene({ ...options, feed, palette, live: false });
}

type Loaded =
  | { src: string; status: 'loading' }
  | { src: string; status: 'ready'; feed: MediaFeed; palette: { dark: Rgb[]; light: Rgb[] } }
  | { src: string; status: 'error'; message: string };

/**
 * Any image, drawn in type. Each cell averages the pixels beneath it and takes their colour; the
 * picture scrambles in as it appears, the pointer stirs it into code, and a click sends a ring of
 * code through it. On a light backdrop it draws as ink on paper. Without a `src` it draws three
 * lit spheres.
 */
export function AsciiImage(props: AsciiImageProps) {
  const {
    cellSize,
    interactive,
    speed,
    label,
    className,
    style,
    src,
    mode,
    color,
    tint,
    fit,
    invert,
    contrast,
    scramble,
  } = props;
  const box = useRef<HTMLDivElement>(null);
  const backdrop = useBackdrop(box, typeof style?.color === 'string' ? style.color : undefined);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const url = src?.trim() || '';

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => {
      if (cancelled) return;
      const feed = canvasFeed(
        image,
        () => [image.naturalWidth, image.naturalHeight],
        () => 1,
      );
      const palette = pictureColours(feed);
      setLoaded(
        palette
          ? { src: url, status: 'ready', feed, palette }
          : {
              src: url,
              status: 'error',
              message: "This image can't be read. Serve it from the same origin, or with CORS.",
            },
      );
    };
    image.onerror = () => {
      if (!cancelled) setLoaded({ src: url, status: 'error', message: "This image didn't load." });
    };
    setLoaded({ src: url, status: 'loading' });
    image.src = url;
    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [url]);

  const current = url && loaded?.src === url ? loaded : null;
  const status = url ? (current?.status ?? 'loading') : 'ready';
  const options = { mode, color, tint, fit, invert, contrast, scramble };
  const sceneKey = JSON.stringify({ ...options, url, status });

  const scene = useMemo(
    () => () => {
      const shared = { ...options, backdrop };
      if (!url) return createImage(shared);
      if (current?.status === 'ready')
        return createImage({ ...shared, feed: current.feed, palette: current.palette });
      return createMediaScene({
        ...shared,
        feed: null,
        message: current?.status === 'error' ? current.message : undefined,
      });
    },
    // The key holds every option the scene is built from.
    [sceneKey, current],
  );

  return (
    <div
      ref={box}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', color: style?.color }}
    >
      <AsciiCanvas
        scene={scene}
        sceneKey={sceneKey}
        cellSize={cellSize}
        interactive={interactive}
        speed={speed}
        label={label}
        style={style}
      />
    </div>
  );
}
