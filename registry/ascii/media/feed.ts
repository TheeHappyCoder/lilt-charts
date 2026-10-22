/**
 * Where a picture's pixels come from: an image, a video, the camera, or a function. The scene asks
 * for a part of the source at the size it needs, and draws whatever comes back.
 */
export interface MediaFeed {
  /** The source's size in pixels, 0 until it has a picture. */
  readonly width: number;
  readonly height: number;
  /** Counts up whenever the source shows a new picture, such as a video's next frame. */
  readonly frame: number;
  /**
   * The part of the source from (`sx`, `sy`), `sw` × `sh` pixels, scaled to `w` × `h`, as RGBA
   * bytes. Null when it can't be read, such as an image from another origin without CORS.
   */
  read(
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    w: number,
    h: number,
  ): Uint8ClampedArray | null;
}

/** A picture from a function of a pixel position, at any size. Each output pixel takes its centre. */
export function functionFeed(
  width: number,
  height: number,
  pixel: (x: number, y: number, out: Float32Array) => void,
): MediaFeed {
  const rgba = new Float32Array(4);
  return {
    width,
    height,
    frame: 1,
    read(sx, sy, sw, sh, w, h) {
      const out = new Uint8ClampedArray(w * h * 4);
      for (let j = 0; j < h; j++) {
        const y = sy + ((j + 0.5) / h) * sh;
        for (let i = 0; i < w; i++) {
          pixel(sx + ((i + 0.5) / w) * sw, y, rgba);
          const p = (j * w + i) * 4;
          out[p] = rgba[0]! * 255;
          out[p + 1] = rgba[1]! * 255;
          out[p + 2] = rgba[2]! * 255;
          out[p + 3] = rgba[3]! * 255;
        }
      }
      return out;
    },
  };
}

/**
 * A feed from anything a canvas can draw: an image, a video or another canvas. It draws into a
 * small canvas of its own at the size asked for and reads the pixels back, once per call.
 */
export function canvasFeed(
  source: CanvasImageSource,
  size: () => [number, number],
  frame: () => number,
  mirror = false,
): MediaFeed {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let failed = false;
  return {
    get width() {
      return size()[0];
    },
    get height() {
      return size()[1];
    },
    get frame() {
      return frame();
    },
    read(sx, sy, sw, sh, w, h) {
      if (failed || w < 1 || h < 1) return null;
      if (!canvas) {
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d', { willReadFrequently: true });
      }
      if (!ctx) return null;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      if (mirror) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      try {
        ctx.drawImage(source, sx, sy, sw, sh, 0, 0, w, h);
        return ctx.getImageData(0, 0, w, h).data;
      } catch {
        // A tainted canvas: the source is from another origin and didn't allow reading.
        failed = true;
        return null;
      } finally {
        ctx.restore();
      }
    },
  };
}
