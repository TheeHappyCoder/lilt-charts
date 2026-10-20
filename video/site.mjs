// Films the real docs site. Same virtual clock as render.mjs (Playwright's clock drives timers and
// requestAnimationFrame; every CSS/WAAPI animation is paused and stepped by the same amount), but
// the page is the site itself: the script moves the real mouse, clicks, types and scrolls, and the
// camera is a crop of each screenshot, so a push-in re-renders the page sharp at that zoom.
//
//   node site.mjs --film=docs                  -> out/docs.mp4 (1920 wide, 60fps)
//   node site.mjs --film=docs --stills=0,4000  -> frames/still-*.png
//   node site.mjs --film=docs --base=http://localhost:3000
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import ffmpeg from 'ffmpeg-static';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
    return [key, value];
  }),
);
const name = args.film ?? 'docs';
const { film } = await import(`./site/${name}.mjs`);
const fps = Number(args.fps ?? 60);
const sub = Number(args.sub ?? 1);
const scale = Number(args.scale ?? 2);
const base = args.base ?? film.base;
const view = film.viewport;
const stills = args.stills ? args.stills.split(',').map(Number) : null;
const from = Number(args.from ?? 0);
const until = Number(args.until ?? film.duration);
const out = args.out ?? `out/${name}.mp4`;
const framesDir = args.frames ?? 'frames';
const size = Number(args.size ?? 1920);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'],
});
const context = await browser.newContext({
  viewport: view,
  deviceScaleFactor: scale,
  colorScheme: film.colorScheme ?? 'dark',
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
page.on('pageerror', (error) => console.log('[page error]', error.message));
await page.addInitScript({
  content: await readFile(new URL('./site/overlay.js', import.meta.url), 'utf8'),
});

const start = new Date('2026-10-20T09:00:00Z');
await page.clock.install({ time: start });
const client = await context.newCDPSession(page);

async function freezeTimeline() {
  await client.send('Animation.enable');
  await client.send('Animation.setPlaybackRate', { playbackRate: 0 });
}

async function go(url) {
  await page.goto(base + url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Real time for late chunks and hydration; virtual time stays put, so nothing plays yet.
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
  });
  await freezeTimeline();
}

const settle = () => page.evaluate(() => window.__settle());

// Timeline -------------------------------------------------------------------------------------

const travel = bezier(0.65, 0, 0.2, 1);
const ease = bezier(0.45, 0, 0.15, 1);
const actions = [...film.actions].sort((a, b) => a.t - b.t);
const moves = film.cursor; // { t, at, move }
const cams = film.camera; // { t, to, move }
const scrolls = film.scrolls ?? []; // { t, to, move }

let actionIndex = 0;
let cursor = { x: view.width * 0.5, y: view.height * 0.62 };
let cursorFrom = null;
let moveIndex = -1;
let cam = { x: 0, y: 0, z: 1 };
let camFrom = null;
let camTarget = null;
let camIndex = -1;
let scrollFrom = null;
let scrollTarget = null;
let scrollIndex = -1;
let mouseDown = false;
let lastMouse = { x: -1, y: -1 };

function active(list, t) {
  let index = -1;
  for (let i = 0; i < list.length; i += 1) if (t >= list[i].t - (list[i].move ?? 0)) index = i;
  return index;
}

async function resolve(aim) {
  if ('x' in aim && !('el' in aim)) return { x: aim.x, y: aim.y };
  return page.evaluate((aim) => window.__overlay.aim(aim), aim);
}

async function frame(t) {
  while (actionIndex < actions.length && actions[actionIndex].t <= t) {
    const action = actions[actionIndex++];
    if (action.goto) {
      await go(action.goto);
      camFrom = null;
    }
    if (action.down !== undefined) {
      await (action.down ? page.mouse.down() : page.mouse.up());
      mouseDown = action.down;
    }
    if (action.press) await page.keyboard.press(action.press);
    if (action.type) await page.keyboard.type(action.type);
    if (action.eval) await page.evaluate(action.eval);
    await settle();
  }

  // Scroll first, so the cursor and camera aim at where things are now.
  const s = active(scrolls, t);
  // A scroll only drives the page while it runs; afterwards the page (or a cut) owns its position.
  if (s >= 0 && t <= scrolls[s].t) {
    const key = scrolls[s];
    if (s !== scrollIndex) {
      scrollIndex = s;
      scrollFrom = await page.evaluate(() => window.scrollY);
      scrollTarget =
        typeof key.to === 'number'
          ? key.to
          : await page.evaluate((aim) => window.__overlay.scrollFor(aim), key.to);
    }
    const k = ease(clamp01((t - (key.t - (key.move ?? 0))) / (key.move || 1)));
    await page.evaluate(
      (y) => window.scrollTo(0, y),
      Math.round(scrollFrom + (scrollTarget - scrollFrom) * k),
    );
  }

  const m = active(moves, t);
  if (m >= 0) {
    const key = moves[m];
    if (m !== moveIndex) {
      moveIndex = m;
      cursorFrom = { ...cursor };
    }
    const target = (await resolve(key.at)) ?? cursor;
    const span = key.move ?? 0;
    const k = span ? travel(clamp01((t - (key.t - span)) / span)) : 1;
    const arc =
      Math.sin(k * Math.PI) *
      Math.min(26, Math.hypot(target.x - cursorFrom.x, target.y - cursorFrom.y) * 0.08);
    cursor = {
      x: cursorFrom.x + (target.x - cursorFrom.x) * k,
      y: cursorFrom.y + (target.y - cursorFrom.y) * k - arc,
    };
  }
  const mouse = { x: Math.round(cursor.x * 100) / 100, y: Math.round(cursor.y * 100) / 100 };
  if (mouse.x !== lastMouse.x || mouse.y !== lastMouse.y) {
    await page.mouse.move(mouse.x, mouse.y);
    lastMouse = mouse;
    await settle();
  }

  const c = active(cams, t);
  if (c >= 0) {
    const key = cams[c];
    if (c !== camIndex || camFrom === null) {
      camIndex = c;
      // After a cut the camera starts on its new shot rather than travelling from the old page.
      const fresh = camFrom === null;
      camTarget = await page.evaluate((to) => window.__overlay.frameFor(to), key.to);
      camFrom = fresh ? camTarget : { ...cam };
    }
    const span = key.move ?? 0;
    const k = span ? travel(clamp01((t - (key.t - span)) / span)) : 1;
    // Zoom moves in log space, so a push-in reads at an even rate.
    const z = Math.exp(Math.log(camFrom.z) + (Math.log(camTarget.z) - Math.log(camFrom.z)) * k);
    const fromC = {
      x: camFrom.x + view.width / camFrom.z / 2,
      y: camFrom.y + view.height / camFrom.z / 2,
    };
    const toC = {
      x: camTarget.x + view.width / camTarget.z / 2,
      y: camTarget.y + view.height / camTarget.z / 2,
    };
    const cx = fromC.x + (toC.x - fromC.x) * k;
    const cy = fromC.y + (toC.y - fromC.y) * k;
    cam = clampCam({ x: cx - view.width / z / 2, y: cy - view.height / z / 2, z });
  }

  await page.evaluate((state) => window.__overlay.paint(state), {
    t,
    cam,
    cursor: mouse,
    down: mouseDown,
    captions: film.captions,
    end: film.end,
  });
}

function clampCam({ x, y, z }) {
  const w = view.width / z;
  const h = view.height / z;
  return {
    x: Math.min(Math.max(0, x), view.width - w),
    y: Math.min(Math.max(0, y), view.height - h),
    z,
  };
}

// Render ---------------------------------------------------------------------------------------

await go(film.start);
await page.clock.pauseAt(new Date(start.getTime() + 10_000));
if (!stills && existsSync(framesDir)) await rm(framesDir, { recursive: true });
await mkdir(framesDir, { recursive: true });
await mkdir('out', { recursive: true });

const step = 1000 / (fps * sub);
const total = Math.round((until / 1000) * fps * sub);
const first = Math.round((from / 1000) * fps * sub);
const wanted = stills
  ? new Map(stills.map((ms) => [Math.round((ms / 1000) * fps * sub), ms]))
  : null;
const last = wanted ? Math.max(...wanted.keys()) : total;
const begun = Date.now();
let written = 0;

for (let index = 0; index <= last; index += 1) {
  const dt = index > 0 ? Math.round(index * step) - Math.round((index - 1) * step) : 0;
  if (dt > 0) await page.clock.runFor(dt);
  await settle();
  const t = index * step;
  await frame(t);
  await page.evaluate((ms) => window.__stepAnimations(ms), dt);
  if (index < first) continue;
  if (wanted && !wanted.has(index)) continue;
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  const shot = await client.send('Page.captureScreenshot', {
    format: 'png',
    optimizeForSpeed: true,
    clip: {
      x: cam.x + scroll.x,
      y: cam.y + scroll.y,
      width: view.width / cam.z,
      height: view.height / cam.z,
      scale: cam.z,
    },
  });
  const file = wanted
    ? `still-${wanted.get(index)}.png`
    : `${String(written).padStart(5, '0')}.png`;
  written += 1;
  await writeFile(join(framesDir, file), Buffer.from(shot.data, 'base64'));
  if (wanted) console.log('still', wanted.get(index));
  else if (index % 60 === 0) {
    const rate = written / ((Date.now() - begun) / 1000);
    console.log(`frame ${index}/${last}  ${rate.toFixed(1)} frames/s`);
  }
}

await browser.close();
if (wanted) process.exit(0);

const filters = [];
if (sub > 1) filters.push(`tmix=frames=${sub}`, `framestep=${sub}`);
const vf = [...filters, `scale=${size}:-2:flags=lanczos`, 'format=yuv420p'].join(',');
await new Promise((resolveRun, reject) => {
  const proc = spawn(
    ffmpeg,
    [
      '-y',
      '-framerate',
      String(fps * sub),
      '-i',
      join(framesDir, '%05d.png'),
      '-vf',
      vf,
      '-r',
      String(fps),
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '14',
      '-profile:v',
      'high',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      out,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  proc.on('exit', (code) =>
    code === 0 ? resolveRun() : reject(new Error(`ffmpeg exited ${code}`)),
  );
});
console.log('wrote', out);

// Easing ---------------------------------------------------------------------------------------

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function bezier(x1, y1, x2, y2) {
  const a = (a1, a2) => 1 - 3 * a2 + 3 * a1;
  const b = (a1, a2) => 3 * a2 - 6 * a1;
  const c = (a1) => 3 * a1;
  const calc = (t, a1, a2) => ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t;
  const slope = (t, a1, a2) => 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1);
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const s = slope(t, x1, x2);
      if (s === 0) break;
      t -= (calc(t, x1, x2) - x) / s;
    }
    return calc(t, y1, y2);
  };
}
