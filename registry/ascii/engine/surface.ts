/** Opacity steps per colour. Cells sharing a colour and step are painted with one fill style. */
export const LEVELS = 8;

/** A glyph code for a small solid square: crisper than a full stop at every font size. */
export const DOT = 1;

/**
 * One frame of type: a glyph, colour and opacity per cell, and optionally a solid block behind it.
 * Scenes write into it; the stage paints it in batches, one fill style per colour and opacity, so a
 * full screen costs a few dozen style changes rather than thousands.
 */
export class GlyphSurface {
  cols = 0;
  rows = 0;
  glyph = new Uint16Array(0);
  tone = new Uint8Array(0);
  level = new Uint8Array(0);
  /** The block behind each cell: its colour, and its opacity step, 0 for none. */
  blockTone = new Uint8Array(0);
  blockLevel = new Uint8Array(0);
  private order = new Int32Array(0);
  private counts = new Int32Array(0);
  private starts = new Int32Array(0);

  resize(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    const size = cols * rows;
    this.glyph = new Uint16Array(size);
    this.tone = new Uint8Array(size);
    this.level = new Uint8Array(size);
    this.blockTone = new Uint8Array(size);
    this.blockLevel = new Uint8Array(size);
    this.order = new Int32Array(size);
  }

  clear() {
    this.glyph.fill(0);
    this.blockLevel.fill(0);
  }

  /**
   * Writes a glyph; later writes replace earlier ones, so draw back to front. `glyph` is a
   * character, a char code, or `DOT`. Opacity at or below zero leaves the cell untouched.
   */
  put(col: number, row: number, glyph: string | number, tone: number, opacity = 1) {
    col = Math.floor(col);
    row = Math.floor(row);
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows || opacity <= 0) return;
    const i = row * this.cols + col;
    this.glyph[i] = typeof glyph === 'number' ? glyph : glyph.charCodeAt(0);
    this.tone[i] = tone;
    this.level[i] = Math.min(LEVELS, Math.ceil(opacity * LEVELS));
  }

  /**
   * Fills a cell with a solid block of colour, painted behind its glyph. Solid shapes read as one
   * mass this way, with a glyph cut into each block, the way a mosaic does. Opacity at or below
   * zero removes the block.
   */
  fill(col: number, row: number, tone: number, opacity = 1) {
    col = Math.floor(col);
    row = Math.floor(row);
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return;
    const i = row * this.cols + col;
    this.blockTone[i] = tone;
    this.blockLevel[i] = opacity <= 0 ? 0 : Math.min(LEVELS, Math.ceil(opacity * LEVELS));
  }

  /** True when a cell already holds a glyph or a block this frame. */
  filled(col: number, row: number) {
    col = Math.floor(col);
    row = Math.floor(row);
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false;
    const i = row * this.cols + col;
    return this.glyph[i] !== 0 || this.blockLevel[i] !== 0;
  }

  /**
   * Sorts cells into buckets of one fill style each, by counting: `bucketOf` gives a cell's bucket,
   * or -1 to skip it. Leaves the cells in `order` and returns how many fall in each bucket.
   */
  private sort(buckets: number, bucketOf: (i: number) => number) {
    if (this.counts.length !== buckets) {
      this.counts = new Int32Array(buckets);
      this.starts = new Int32Array(buckets);
    }
    const { order, counts, starts } = this;
    counts.fill(0);
    const n = this.glyph.length;
    for (let i = 0; i < n; i++) {
      const b = bucketOf(i);
      if (b >= 0 && b < buckets) counts[b]++;
    }
    let sum = 0;
    for (let b = 0; b < buckets; b++) {
      starts[b] = sum;
      sum += counts[b]!;
    }
    for (let i = 0; i < n; i++) {
      const b = bucketOf(i);
      if (b >= 0 && b < buckets) order[starts[b]!++] = i;
    }
    return counts;
  }

  /**
   * Paints the frame. `styles[tone * LEVELS + level - 1]` is the fill style for each bucket.
   * With a monospace font, each bucket's glyphs on a row go out as one string with spaces in the
   * gaps: a canvas pays per text call far more than per glyph, so this is many times faster.
   */
  paint(
    ctx: CanvasRenderingContext2D,
    styles: readonly string[],
    cw: number,
    ch: number,
    mono = true,
  ) {
    const buckets = styles.length;
    const { glyph, tone, level, blockTone, blockLevel, order, cols } = this;

    // Blocks first, each inset a pixel so the grid of type still shows between them.
    let counts = this.sort(buckets, (i) =>
      blockLevel[i] ? blockTone[i]! * LEVELS + blockLevel[i]! - 1 : -1,
    );
    let k = 0;
    for (let b = 0; b < buckets; b++) {
      const count = counts[b]!;
      if (!count) continue;
      ctx.fillStyle = styles[b]!;
      for (const end = k + count; k < end; k++) {
        const i = order[k]!;
        const col = i % cols;
        const row = (i - col) / cols;
        ctx.fillRect(col * cw + 0.5, row * ch + 0.5, cw - 1, ch - 1);
      }
    }

    counts = this.sort(buckets, (i) => (glyph[i] ? tone[i]! * LEVELS + level[i]! - 1 : -1));
    const dot = Math.max(1.5, Math.round(cw * 0.22));
    ctx.textAlign = mono ? 'left' : 'center';
    k = 0;
    for (let b = 0; b < buckets; b++) {
      const count = counts[b];
      if (!count) continue;
      ctx.fillStyle = styles[b]!;
      // A run of text on one row: where it starts, and its characters so far.
      let runRow = -1;
      let runCol = 0;
      let lastCol = 0;
      let run = '';
      for (const end = k + count; k < end; k++) {
        const i = order[k]!;
        const col = i % cols;
        const row = (i - col) / cols;
        const code = glyph[i]!;
        if (code === DOT) {
          ctx.fillRect(col * cw + cw / 2 - dot / 2, row * ch + ch / 2 - dot / 2, dot, dot);
          continue;
        }
        if (!mono) {
          ctx.fillText(String.fromCharCode(code), col * cw + cw / 2, row * ch + ch / 2);
          continue;
        }
        if (row !== runRow) {
          if (run) ctx.fillText(run, runCol * cw, runRow * ch + ch / 2);
          runRow = row;
          runCol = col;
          run = '';
        } else {
          run += ' '.repeat(col - lastCol - 1);
        }
        run += String.fromCharCode(code);
        lastCol = col;
      }
      if (run) ctx.fillText(run, runCol * cw, runRow * ch + ch / 2);
    }
  }
}
