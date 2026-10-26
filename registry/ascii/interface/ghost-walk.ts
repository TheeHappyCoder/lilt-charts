/**
 * How a ghost cursor behaves: a pretend visitor's pointer that wanders the area and pauses as if
 * reading, slowly gets cold, shivers once it is freezing, then hurries to the nearest fire and
 * circles it until it is warm again. Now and then one lingers too long, finds it too hot and darts
 * off. After a while each one wanders out of an edge and another arrives. Pure and seeded, so a
 * host only steps it and draws it.
 */

export interface GhostFire {
  /** The heart of the fire, in the area's pixels. */
  x: number;
  y: number;
  /** How far its warmth carries, in pixels. */
  reach: number;
}

export interface GhostRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface GhostWorld {
  width: number;
  height: number;
  fires: readonly GhostFire[];
  /** Places a wandering ghost keeps clear of, such as a headline. */
  avoid: readonly GhostRect[];
}

export type GhostPhase = 'wander' | 'shiver' | 'rush' | 'warm' | 'leave' | 'gone';

export interface Ghost {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Where it is heading. */
  tx: number;
  ty: number;
  /** 0 frozen to 1 fully warm. */
  temp: number;
  /** How warm the spot it is in is, 0 to 1, as of its last step. */
  warmth: number;
  phase: GhostPhase;
  /** Seconds left of a pause, a shiver or a linger by the fire. */
  timer: number;
  /** The fire it is heading for or circling. */
  fire: number;
  /** Where it is round the fire, in radians. */
  angle: number;
  /** Seconds a warm ghost takes to freeze. */
  chill: number;
  /** Seconds left before it heads out. */
  stay: number;
  /** Seconds left of "too hot!" after it darts from a fire. */
  scorched: number;
  /** Seconds since it arrived, for the curve of its path. */
  age: number;
  /** 0 to 1, how much it has faded in. */
  alpha: number;
}

/** Seconds a frozen ghost takes to thaw right by a fire, as for a real pointer. */
const THAW = 3;
/** Below this it freezes: it shivers, then rushes to a fire. */
const FREEZING = 0.14;
/** Readings run from −12° frozen to 24° fully warm, as for a real pointer. */
const COLDEST = -12;
const WARMEST = 24;

const between = (rand: () => number, lo: number, hi: number) => lo + rand() * (hi - lo);

/** How warm a spot is, 0 to 1: the nearest fire's warmth, falling off over its reach. */
export function warmthAt(world: GhostWorld, x: number, y: number) {
  let most = 0;
  for (const fire of world.fires) {
    const d = Math.hypot(x - fire.x, y - fire.y);
    most = Math.max(most, Math.max(0, 1 - d / fire.reach) ** 1.3);
  }
  return most;
}

/** A place to wander to: in the sky, clear of anything to avoid and out of the fires' warmth. */
export function pickSpot(world: GhostWorld, rand: () => number) {
  const { width, height } = world;
  let x = width / 2;
  let y = height / 3;
  for (let tries = 0; tries < 16; tries++) {
    x = between(rand, 0.06, 0.94) * width;
    y = between(rand, 0.08, 0.78) * height;
    const blocked = world.avoid.some(
      (box) => x > box.left - 24 && x < box.right + 24 && y > box.top - 24 && y < box.bottom + 24,
    );
    if (!blocked && warmthAt(world, x, y) === 0) break;
  }
  return { x, y };
}

/**
 * A new ghost. `inside` places it in the area already (fading in), for the first ones on a page;
 * otherwise it comes in from a side or the top. `temp` sets how warm it arrives.
 */
export function createGhost(
  world: GhostWorld,
  rand: () => number,
  { inside = false, temp }: { inside?: boolean; temp?: number } = {},
): Ghost {
  const spot = pickSpot(world, rand);
  let x = spot.x;
  let y = spot.y;
  if (!inside) {
    const edge = rand();
    if (edge < 0.4) x = -20;
    else if (edge < 0.8) x = world.width + 20;
    else y = -20;
  }
  const target = pickSpot(world, rand);
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    tx: target.x,
    ty: target.y,
    temp: temp ?? between(rand, 0.3, 0.85),
    warmth: 0,
    phase: 'wander',
    timer: 0,
    fire: 0,
    angle: 0,
    chill: between(rand, 12, 22),
    stay: between(rand, 35, 80),
    scorched: 0,
    age: rand() * 10,
    alpha: 0,
  };
}

/** Eases the ghost toward its target, no faster than `speed` pixels a second, with a hand's curve. */
function steer(ghost: Ghost, dt: number, speed: number, grip: number) {
  const dx = ghost.tx - ghost.x;
  const dy = ghost.ty - ghost.y;
  const d = Math.hypot(dx, dy);
  if (d > 0.01) {
    // A hand never moves dead straight: far off, the heading sways a little either side.
    const sway = Math.sin(ghost.age * 1.7) * 0.28 * Math.min(1, d / 160);
    const cos = Math.cos(sway);
    const sin = Math.sin(sway);
    const ux = dx / d;
    const uy = dy / d;
    const v = Math.min(speed, d * 3.5);
    const wantX = (ux * cos - uy * sin) * v;
    const wantY = (ux * sin + uy * cos) * v;
    const k = Math.min(1, dt * grip);
    ghost.vx += (wantX - ghost.vx) * k;
    ghost.vy += (wantY - ghost.vy) * k;
  } else {
    ghost.vx *= 0.8;
    ghost.vy *= 0.8;
  }
  ghost.x += ghost.vx * dt;
  ghost.y += ghost.vy * dt;
  return d;
}

function nearestFire(world: GhostWorld, x: number, y: number) {
  let best = 0;
  let bestD = Infinity;
  world.fires.forEach((fire, k) => {
    const d = Math.hypot(x - fire.x, y - fire.y);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  });
  return best;
}

function wanderOn(ghost: Ghost, world: GhostWorld, rand: () => number, pause = 0) {
  const spot = pickSpot(world, rand);
  ghost.phase = 'wander';
  ghost.tx = spot.x;
  ghost.ty = spot.y;
  ghost.timer = pause;
}

/** One step of `dt` seconds. A ghost that has left is marked `gone` for the host to replace. */
export function stepGhost(ghost: Ghost, dt: number, world: GhostWorld, rand: () => number) {
  if (ghost.phase === 'gone') return;
  ghost.age += dt;
  ghost.alpha = Math.min(1, ghost.alpha + dt * 2);
  ghost.scorched = Math.max(0, ghost.scorched - dt);
  const warm = warmthAt(world, ghost.x, ghost.y);
  ghost.warmth = warm;
  ghost.temp = Math.min(1, Math.max(0, ghost.temp + dt * (warm / THAW - (1 - warm) / ghost.chill)));
  const hasFire = world.fires.length > 0;

  switch (ghost.phase) {
    case 'wander': {
      ghost.stay -= dt;
      if (ghost.temp < FREEZING && hasFire) {
        ghost.phase = 'shiver';
        ghost.timer = between(rand, 1, 2);
        break;
      }
      if (ghost.stay <= 0) {
        // Out through the nearer side, a little above or below where it is.
        ghost.phase = 'leave';
        ghost.tx = ghost.x < world.width / 2 ? -40 : world.width + 40;
        ghost.ty = ghost.y + between(rand, -0.2, 0.2) * world.height;
        break;
      }
      if (ghost.timer > 0) {
        // Paused, as if reading: it barely drifts.
        ghost.timer -= dt;
        steer(ghost, dt, 6, 3);
        break;
      }
      const d = steer(ghost, dt, 110, 3);
      if (d < 6) wanderOn(ghost, world, rand, between(rand, 0.3, 2.4));
      break;
    }
    case 'shiver': {
      // Frozen to the spot for a moment before it thinks of the fire.
      ghost.tx = ghost.x;
      ghost.ty = ghost.y;
      steer(ghost, dt, 0, 8);
      ghost.timer -= dt;
      if (ghost.timer <= 0) {
        ghost.phase = 'rush';
        ghost.fire = nearestFire(world, ghost.x, ghost.y);
      }
      break;
    }
    case 'rush': {
      const fire = world.fires[ghost.fire];
      if (!fire) {
        wanderOn(ghost, world, rand);
        break;
      }
      ghost.tx = fire.x;
      ghost.ty = fire.y;
      const d = steer(ghost, dt, 560, 5);
      if (d < fire.reach * 0.32) {
        ghost.phase = 'warm';
        ghost.angle = Math.atan2(ghost.y - fire.y, ghost.x - fire.x);
        ghost.timer = between(rand, 1.5, 4);
      }
      break;
    }
    case 'warm': {
      const fire = world.fires[ghost.fire];
      if (!fire) {
        wanderOn(ghost, world, rand);
        break;
      }
      // Hands held out round the fire, moving a little, flatter than a circle.
      ghost.angle += dt * (0.8 + Math.sin(ghost.age * 0.9) * 0.4);
      const r = fire.reach * (0.2 + Math.sin(ghost.age * 1.3) * 0.06);
      ghost.tx = fire.x + Math.cos(ghost.angle) * r;
      ghost.ty = fire.y + Math.sin(ghost.angle) * r * 0.55;
      steer(ghost, dt, 90, 6);
      // Once it is warm through, it lingers a moment, then goes back to wandering.
      if (ghost.temp >= 0.98) ghost.timer -= dt;
      if (ghost.timer <= 0) {
        if (rand() < 0.3) {
          // Too close for too long: it darts up and away from the heat.
          ghost.scorched = 1.4;
          ghost.phase = 'wander';
          ghost.tx = fire.x + between(rand, -1, 1) * fire.reach;
          ghost.ty = Math.max(20, fire.y - fire.reach * between(rand, 1, 1.6));
          ghost.vx = (ghost.tx - ghost.x) * 3;
          ghost.vy = (ghost.ty - ghost.y) * 3;
          ghost.timer = 0;
        } else wanderOn(ghost, world, rand, between(rand, 0, 0.6));
      }
      break;
    }
    case 'leave': {
      steer(ghost, dt, 150, 3);
      if (ghost.x < -24 || ghost.x > world.width + 24 || ghost.y < -24) ghost.phase = 'gone';
      break;
    }
  }
}

/** The ghost's temperature in degrees, on the same scale a real pointer's reading uses. */
export function ghostDegrees(ghost: Ghost) {
  return Math.round(COLDEST + ghost.temp * (WARMEST - COLDEST));
}

export type GhostTone = 'frost' | 'ember' | 'hot';

/**
 * What a ghost's reading says, when it has something to say: shivering, hurrying to a fire,
 * warming by one, or darting off too hot. A ghost simply wandering keeps quiet.
 */
export function ghostReading(ghost: Ghost): { text: string; tone: GhostTone } | null {
  if (ghost.scorched > 0) return { text: 'too hot!', tone: 'hot' };
  const degrees = ghostDegrees(ghost);
  const shown = `${degrees < 0 ? '−' : ''}${Math.abs(degrees)}°`;
  if (ghost.phase === 'shiver') return { text: `freezing ${shown}`, tone: 'frost' };
  if (ghost.phase === 'rush') return { text: `brr ${shown}`, tone: 'frost' };
  if (ghost.phase === 'warm') {
    return { text: `${ghost.temp > 0.75 ? 'cosy' : 'warming up'} ${shown}`, tone: 'ember' };
  }
  return null;
}

/** A small seeded random source, so a run of ghosts can be replayed. */
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
