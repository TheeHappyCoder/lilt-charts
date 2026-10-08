/**
 * The frame every film is composed for, in CSS pixels. `render.mjs --width --height` passes it in
 * the URL (`?w=720&h=900`), so one film renders square, portrait or wide. Defaults to 720×720.
 */
const params = new URLSearchParams(location.search);

export const stage = {
  w: Number(params.get('w')) || 720,
  h: Number(params.get('h')) || 720,
};

/** A point on the frame by fraction, e.g. `frameAt(1.1, 1.05)` just off the bottom right. */
export const frameAt = (fx: number, fy: number) => ({ x: stage.w * fx, y: stage.h * fy });

document.documentElement.style.setProperty('--stage-w', `${stage.w}px`);
document.documentElement.style.setProperty('--stage-h', `${stage.h}px`);
