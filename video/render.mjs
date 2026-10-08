// Renders the film frame by frame. Time is virtual: Playwright's clock drives Date, timers and
// requestAnimationFrame, and every CSS/WAAPI animation is paused and stepped to the same clock,
// so each frame is a pure function of time no matter how long a screenshot takes.
//
//   node render.mjs --film=depth                 full film -> out/depth.mp4 (1080 wide, 60fps)
//   node render.mjs --film=looks --height=900    a 4:5 cut -> out/looks-720x900.mp4
//   node render.mjs --stills=1200,4000           only those moments (ms) -> frames/still-*.png
//   node render.mjs --from=8000 --until=12000 --out=out/part.mp4
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import ffmpeg from 'ffmpeg-static';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
    return [key, value];
  }),
);
const fps = Number(args.fps ?? 60);
const sub = Number(args.sub ?? 1); // subframes per frame, blended for motion blur
const scale = Number(args.scale ?? 2); // device pixel ratio of the 720px stage
const from = Number(args.from ?? 0);
const until = args.until ? Number(args.until) : undefined;
const stills = args.stills ? args.stills.split(',').map(Number) : null;
const name = args.film ?? 'depth';
const stage = { width: Number(args.width ?? 720), height: Number(args.height ?? 720) };
const square = stage.width === stage.height;
const out = args.out ?? `out/${name}${square ? '' : `-${stage.width}x${stage.height}`}.mp4`;
const framesDir = args.frames ?? 'frames';
const size = Number(args.size ?? 1080);

const root = new URL('./dist/', import.meta.url);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = new URL('.' + (path === '/' ? '/index.html' : path), root);
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': types[extname(file.pathname)] ?? 'application/octet-stream',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'],
});
const context = await browser.newContext({
  viewport: stage,
  deviceScaleFactor: scale,
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning')
    console.log('[page]', message.text());
});
page.on('pageerror', (error) => console.log('[page error]', error.message));

await page.addInitScript(() => {
  // Step every document animation (CSS animations, transitions, WAAPI from Motion) by virtual time.
  const owned = new WeakMap();
  window.__stepAnimations = (dt) => {
    for (const animation of document.getAnimations()) {
      if (animation.playState === 'finished' || animation.playState === 'idle') continue;
      let mine = owned.get(animation);
      if (mine === undefined) {
        // Started somewhere in the last frame.
        mine = 0;
      } else if (animation.playState === 'paused' && animation.currentTime !== mine) {
        // Someone else seeked it: adopt their time.
        mine = Number(animation.currentTime) || 0;
      } else {
        mine += dt * (animation.playbackRate || 1);
      }
      const timing = animation.effect?.getComputedTiming?.();
      const end = timing ? Number(timing.endTime) : Infinity;
      if (Number.isFinite(end) && mine >= end && (animation.playbackRate || 1) > 0) {
        owned.delete(animation);
        animation.finish();
        continue;
      }
      if (mine <= 0 && (animation.playbackRate || 1) < 0) {
        owned.delete(animation);
        animation.finish();
        continue;
      }
      animation.pause();
      animation.currentTime = mine;
      owned.set(animation, mine);
    }
  };
  window.__settle = () =>
    new Promise((resolve) => {
      // A few real macrotask turns: enough for React's scheduler to commit what the frame queued.
      const channel = new MessageChannel();
      let turns = 0;
      channel.port1.onmessage = () => (++turns < 3 ? channel.port2.postMessage(0) : resolve());
      channel.port2.postMessage(0);
    });
});

const start = new Date('2026-10-07T09:00:00Z');
await page.clock.install({ time: start });
await page.goto(`http://localhost:${port}/?film=${name}&w=${stage.width}&h=${stage.height}`);
await page.waitForFunction(() => window.__film?.ready === true, null, { timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.clock.pauseAt(new Date(start.getTime() + 30_000));
const duration = until ?? (await page.evaluate(() => window.__film.duration));
await page.evaluate((at) => window.__film.start(at), from);
await page.evaluate(() => window.__settle());

const client = await context.newCDPSession(page);
// Freeze the document timeline: animations otherwise run in real time between frames, and a heavy
// card can mount, play its whole entrance and finish before the stepper first sees it.
await client.send('Animation.enable');
await client.send('Animation.setPlaybackRate', { playbackRate: 0 });
if (!stills && existsSync(framesDir)) await rm(framesDir, { recursive: true });
await mkdir(framesDir, { recursive: true });
await mkdir('out', { recursive: true });

const step = 1000 / (fps * sub);
const total = Math.round(((duration - from) / 1000) * fps * sub);
const wanted = stills
  ? new Map(stills.map((ms) => [Math.round(((ms - from) / 1000) * fps * sub), ms]))
  : null;
const last = Math.max(total, ...(wanted ? wanted.keys() : [0]));
let mouseDown = false;
let lastPointer = { x: -1, y: -1 };
const begun = Date.now();

for (let index = 0; index <= last; index += 1) {
  // The clock only takes whole milliseconds, so advance to the rounded target time; CSS animations
  // step by the same amount, keeping JS and CSS time locked together.
  const dt = index > 0 ? Math.round(index * step) - Math.round((index - 1) * step) : 0;
  if (dt > 0) await page.clock.runFor(dt);
  await page.evaluate(() => window.__settle());
  const pointer = await page.evaluate(() => window.__film.pointer());
  if (pointer) {
    if (pointer.x !== lastPointer.x || pointer.y !== lastPointer.y) {
      await page.mouse.move(pointer.x, pointer.y);
      lastPointer = pointer;
    }
    if (pointer.down !== mouseDown) {
      await (pointer.down ? page.mouse.down() : page.mouse.up());
      mouseDown = pointer.down;
    }
    await page.evaluate(() => window.__settle());
  }
  await page.evaluate((ms) => window.__stepAnimations(ms), dt);
  if (wanted && !wanted.has(index)) continue;
  if (wanted)
    console.log(
      'still',
      wanted.get(index),
      'film t',
      await page.evaluate(() => window.__film.t.toFixed(1)),
      await page.evaluate(() =>
        [...document.querySelectorAll('.film-caption__line')]
          .map((e) => e.style.opacity + '/' + e.style.filter)
          .join(' | '),
      ),
    );
  const shot = await client.send('Page.captureScreenshot', {
    format: 'png',
    optimizeForSpeed: true,
  });
  const name = wanted ? `still-${wanted.get(index)}.png` : `${String(index).padStart(5, '0')}.png`;
  await writeFile(join(framesDir, name), Buffer.from(shot.data, 'base64'));
  if (index % 60 === 0) {
    const rate = (index + 1) / ((Date.now() - begun) / 1000);
    console.log(`frame ${index}/${last}  ${rate.toFixed(1)} frames/s`);
  }
}

await browser.close();
server.close();
if (wanted) process.exit(0);

const filters = [];
if (sub > 1) filters.push(`tmix=frames=${sub}`, `framestep=${sub}`);
const vf = [...filters, `scale=${size}:-2:flags=lanczos`, 'format=yuv420p'].join(',');
await new Promise((resolve, reject) => {
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
  proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
});
console.log('wrote', out);
