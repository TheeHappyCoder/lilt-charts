/** A mesh of your own: points, and faces as lists of point indices (triangles or any polygon). */
export interface Mesh {
  vertices: readonly (readonly number[])[];
  faces: readonly (readonly number[])[];
}

/** The built-in shapes. */
export type ModelShape = 'torus' | 'cube' | 'sphere' | 'knot' | 'icosahedron';

/**
 * A mesh ready to draw: a point, normal and surface coordinate for each corner, and triangles of
 * corner indices. Centred on the origin and scaled to fit a unit sphere.
 */
export interface Solid {
  position: Float32Array;
  normal: Float32Array;
  uv: Float32Array;
  triangles: Uint32Array;
  /** Whether the surface is curved, with normals that blend across it, or faceted. */
  smooth: boolean;
  /** Lines to cut into the surface, as counts across its u and v coordinates. */
  lines?: [number, number];
  /**
   * For a closed solid, 1 when its triangles wind counter-clockwise seen from outside and -1 when
   * clockwise, so faces turned away can be skipped. 0 for an open mesh, which draws every face.
   */
  winding: number;
}

type Vec = [number, number, number];

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: Vec): Vec => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * A curved surface from a function of (u, v), both from 0 to 1, as a grid of `nu` × `nv` quads.
 * Normals come from the surface's slope, so they are smooth; seams repeat their corners so
 * surface coordinates never wrap inside a triangle.
 */
function surface(nu: number, nv: number, at: (u: number, v: number) => Vec): Solid {
  const n = (nu + 1) * (nv + 1);
  const position = new Float32Array(n * 3);
  const normal = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const e = 1e-4;
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      const v = j / nv;
      const k = j * (nu + 1) + i;
      const p = at(u, v);
      const du = sub(at(u + e, v), at(u - e, v));
      const dv = sub(at(u, v + e), at(u, v - e));
      let nrm = cross(du, dv);
      // At a pole one slope vanishes; the point itself is the way out on a sphere.
      if (Math.hypot(...nrm) < 1e-9) nrm = p;
      nrm = unit(nrm);
      position.set(p, k * 3);
      normal.set(nrm, k * 3);
      uv[k * 2] = u;
      uv[k * 2 + 1] = v;
    }
  }
  const triangles = new Uint32Array(nu * nv * 6);
  let t = 0;
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + 1;
      const c = a + nu + 1;
      const d = c + 1;
      triangles.set([a, c, b, b, c, d], t);
      t += 6;
    }
  }
  return fit({ position, normal, uv, triangles, smooth: true, winding: 0 });
}

/**
 * A faceted solid from points and polygons: every triangle gets corners of its own and the
 * polygon's flat normal, so each face reads as one plane. Surface coordinates run across each
 * face, for the engraving.
 */
export function faceted(mesh: Mesh): Solid {
  const tris: number[][] = [];
  for (const face of mesh.faces) {
    for (let k = 1; k + 1 < face.length; k++) tris.push([face[0]!, face[k]!, face[k + 1]!]);
  }
  const position = new Float32Array(tris.length * 9);
  const normal = new Float32Array(tris.length * 9);
  const uv = new Float32Array(tris.length * 6);
  const triangles = new Uint32Array(tris.length * 3);
  const point = (i: number): Vec => {
    const p = mesh.vertices[i];
    return [p?.[0] ?? 0, p?.[1] ?? 0, p?.[2] ?? 0];
  };
  tris.forEach((tri, t) => {
    const [a, b, c] = tri.map(point) as [Vec, Vec, Vec];
    const nrm = unit(cross(sub(b, a), sub(c, a)));
    [a, b, c].forEach((p, k) => {
      position.set(p, (t * 3 + k) * 3);
      normal.set(nrm, (t * 3 + k) * 3);
      triangles[t * 3 + k] = t * 3 + k;
    });
    uv.set([0, 0, 1, 0, 0, 1], t * 6);
  });
  return fit({ position, normal, uv, triangles, smooth: false, winding: 0 });
}

/**
 * Marks a solid as closed and finds which way its faces wind, from the sign of its volume: the
 * sum over triangles of a · (b × c) is positive when they wind counter-clockwise from outside.
 */
function closed(solid: Solid): Solid {
  const p = solid.position;
  const t = solid.triangles;
  let volume = 0;
  for (let k = 0; k < t.length; k += 3) {
    const a = t[k]! * 3;
    const b = t[k + 1]! * 3;
    const c = t[k + 2]! * 3;
    volume +=
      p[a]! * (p[b + 1]! * p[c + 2]! - p[b + 2]! * p[c + 1]!) +
      p[a + 1]! * (p[b + 2]! * p[c]! - p[b]! * p[c + 2]!) +
      p[a + 2]! * (p[b]! * p[c + 1]! - p[b + 1]! * p[c]!);
  }
  return { ...solid, winding: volume >= 0 ? 1 : -1 };
}

/** Centres a solid on the origin and scales it to fit inside a unit sphere. */
function fit(solid: Solid): Solid {
  const p = solid.position;
  const n = p.length / 3;
  if (!n) return solid;
  const lo: Vec = [Infinity, Infinity, Infinity];
  const hi: Vec = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], p[i * 3 + a]!);
      hi[a] = Math.max(hi[a], p[i * 3 + a]!);
    }
  }
  const centre = lo.map((v, a) => (v + hi[a]!) / 2);
  let radius = 0;
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < 3; a++) p[i * 3 + a] = p[i * 3 + a]! - centre[a]!;
    radius = Math.max(radius, Math.hypot(p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!));
  }
  if (radius > 0) for (let i = 0; i < p.length; i++) p[i] = p[i]! / radius;
  return solid;
}

const TAU = Math.PI * 2;

function torus(): Solid {
  const R = 1;
  const r = 0.44;
  return surface(72, 28, (u, v) => {
    const a = u * TAU;
    const b = v * TAU;
    const w = R + r * Math.cos(b);
    return [w * Math.cos(a), w * Math.sin(a), r * Math.sin(b)];
  });
}

function sphere(): Solid {
  const solid = surface(48, 26, (u, v) => {
    const a = u * TAU;
    const b = v * Math.PI;
    return [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)];
  });
  return { ...solid, lines: [12, 6] };
}

/** A (2, 3) torus knot: a tube that winds three times through the hole of a torus as it goes round twice. */
function knot(): Solid {
  const p = 2;
  const q = 3;
  const tube = 0.34;
  const centre = (t: number): Vec => {
    const a = t * TAU;
    const w = 2 + Math.cos(q * a);
    return [w * Math.cos(p * a), w * Math.sin(p * a), -Math.sin(q * a)];
  };
  const e = 1e-4;
  return surface(180, 16, (u, v) => {
    const c = centre(u);
    const ahead = centre(u + e);
    const behind = centre(u - e);
    const tangent = unit(sub(ahead, behind));
    // The curve's bend picks the frame; a torus knot never runs straight, so it never fails.
    const bend: Vec = [
      ahead[0] + behind[0] - 2 * c[0],
      ahead[1] + behind[1] - 2 * c[1],
      ahead[2] + behind[2] - 2 * c[2],
    ];
    const normal = unit(cross(cross(tangent, bend), tangent));
    const binormal = cross(tangent, normal);
    const b = v * TAU;
    const x = Math.cos(b) * tube;
    const y = Math.sin(b) * tube;
    return [
      c[0] + normal[0] * x + binormal[0] * y,
      c[1] + normal[1] * x + binormal[1] * y,
      c[2] + normal[2] * x + binormal[2] * y,
    ];
  });
}

function cube(): Solid {
  const v = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ];
  const f = [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [1, 2, 6, 5],
    [0, 4, 7, 3],
  ];
  return faceted({ vertices: v, faces: f });
}

function icosahedron(): Solid {
  const g = (1 + Math.sqrt(5)) / 2;
  const v = [
    [-1, g, 0],
    [1, g, 0],
    [-1, -g, 0],
    [1, -g, 0],
    [0, -1, g],
    [0, 1, g],
    [0, -1, -g],
    [0, 1, -g],
    [g, 0, -1],
    [g, 0, 1],
    [-g, 0, -1],
    [-g, 0, 1],
  ];
  const f = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  return faceted({ vertices: v, faces: f });
}

const builders: Record<ModelShape, () => Solid> = { torus, cube, sphere, knot, icosahedron };
const built = new Map<ModelShape, Solid>();

/** A built-in shape, built once and shared. */
export function shapeSolid(shape: ModelShape): Solid {
  const key = shape in builders ? shape : 'torus';
  let solid = built.get(key);
  if (!solid) {
    solid = closed(builders[key]());
    built.set(key, solid);
  }
  return solid;
}
