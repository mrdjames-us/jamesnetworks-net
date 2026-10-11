/* 1:12 dollhouse furniture for the Creality K2.
   Browser copy of the house generator in C:\Users\mrdja\dollhouse.
   A print holds four colors. Units are millimetres, Z up. */
(function (root) {
  const INCH = 25.4 / 12;
  const BED = 260;
  const MAX_COLORS = 4;
  const SHELF = [
    { name: "Pine", hex: "#D9B57A" },
    { name: "Honey Oak", hex: "#B9803F" },
    { name: "Cherry", hex: "#8A3E26" },
    { name: "Walnut", hex: "#5A3A24" },
    { name: "Barn Red", hex: "#7D2620" },
    { name: "Milk Blue", hex: "#4D6B7A" },
    { name: "Sage", hex: "#8C9772" },
    { name: "Mustard", hex: "#C49A3A" },
    { name: "Cream", hex: "#EDE3CC" },
    { name: "Linen", hex: "#CFC2A6" },
    { name: "Iron Black", hex: "#221D1A" },
    { name: "Pewter", hex: "#9A9C9A" }
  ];
  const SHELF_HEX = Object.fromEntries(SHELF.map((item) => [item.name, item.hex]));

  function mm(inches) { return Number(inches) * INCH; }
  function pyRound(n) {
    const f = Math.floor(n);
    const diff = n - f;
    if (Math.abs(diff - 0.5) > 1e-9) return Math.round(n);
    return f % 2 === 0 ? f : f + 1;
  }
  function round1(n) { return Math.round(n * 10) / 10; }

  class Mesh {
    constructor() { this.verts = []; this.faces = []; }
    copy() {
      const other = new Mesh();
      other.verts = this.verts.map((v) => v.slice());
      other.faces = this.faces.map((f) => f.slice());
      return other;
    }
    addVert(x, y, z) {
      this.verts.push([Number(x), Number(y), Number(z)]);
      return this.verts.length - 1;
    }
    addFace(a, b, c) { this.faces.push([a, b, c]); }
    addQuad(a, b, c, d) {
      this.faces.push([a, b, c]);
      this.faces.push([a, c, d]);
    }
    translate(dx, dy, dz) {
      this.verts = this.verts.map(([x, y, z]) => [x + dx, y + dy, z + dz]);
      return this;
    }
    merge(other) {
      if (!other || !other.faces.length) return this;
      const base = this.verts.length;
      this.verts.push(...other.verts);
      for (const [a, b, c] of other.faces) this.faces.push([a + base, b + base, c + base]);
      return this;
    }
    bounds() {
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
      for (const [x, y, z] of this.verts) {
        if (x < x0) x0 = x; if (y < y0) y0 = y; if (z < z0) z0 = z;
        if (x > x1) x1 = x; if (y > y1) y1 = y; if (z > z1) z1 = z;
      }
      return [x0, y0, z0, x1, y1, z1];
    }
    size() {
      const [x0, y0, z0, x1, y1, z1] = this.bounds();
      return [x1 - x0, y1 - y0, z1 - z0];
    }
  }

  function box(x, y, z, w, d, h) {
    const m = new Mesh();
    if (w <= 0 || d <= 0 || h <= 0) return m;
    const v = [
      m.addVert(x, y, z), m.addVert(x + w, y, z), m.addVert(x + w, y + d, z), m.addVert(x, y + d, z),
      m.addVert(x, y, z + h), m.addVert(x + w, y, z + h), m.addVert(x + w, y + d, z + h), m.addVert(x, y + d, z + h)
    ];
    m.addQuad(v[0], v[3], v[2], v[1]);
    m.addQuad(v[4], v[5], v[6], v[7]);
    m.addQuad(v[0], v[4], v[5], v[1]);
    m.addQuad(v[3], v[7], v[6], v[2]);
    m.addQuad(v[0], v[4], v[7], v[3]);
    m.addQuad(v[1], v[2], v[6], v[5]);
    return m;
  }

  function ring(m, cx, cy, z, r, n) {
    const ids = [];
    for (let i = 0; i < n; i++) {
      const a = 2 * Math.PI * i / n;
      ids.push(m.addVert(cx + r * Math.cos(a), cy + r * Math.sin(a), z));
    }
    return ids;
  }

  function frustum(cx, cy, z0, z1, r0, r1, n = 20) {
    const m = new Mesh();
    if (z1 < z0) { const zt = z0; z0 = z1; z1 = zt; const rt = r0; r0 = r1; r1 = rt; }
    if (z1 - z0 <= 0 || r0 <= 0 || r1 <= 0) return m;
    const bot = ring(m, cx, cy, z0, r0, n);
    const top = ring(m, cx, cy, z1, r1, n);
    const cb = m.addVert(cx, cy, z0);
    const ct = m.addVert(cx, cy, z1);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      m.addQuad(bot[i], bot[j], top[j], top[i]);
      m.addFace(cb, bot[j], bot[i]);
      m.addFace(ct, top[i], top[j]);
    }
    return m;
  }

  function cylinder(cx, cy, z0, z1, r, n = 20) { return frustum(cx, cy, z0, z1, r, r, n); }

  function cylinderY(cx, y0, y1, cz, r, n = 16) {
    const m = new Mesh();
    if (y1 < y0) { const t = y0; y0 = y1; y1 = t; }
    if (y1 - y0 <= 0 || r <= 0) return m;
    const near = [], far = [];
    for (let i = 0; i < n; i++) {
      const a = 2 * Math.PI * i / n;
      const x = cx + r * Math.cos(a);
      const z = cz + r * Math.sin(a);
      near.push(m.addVert(x, y0, z));
      far.push(m.addVert(x, y1, z));
    }
    const cn = m.addVert(cx, y0, cz);
    const cf = m.addVert(cx, y1, cz);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      m.addQuad(near[i], far[i], far[j], near[j]);
      m.addFace(cn, near[i], near[j]);
      m.addFace(cf, far[j], far[i]);
    }
    return m;
  }

  function frustumShell(cx, cy, z0, z1, r0, r1, thickness, n = 24) {
    const m = new Mesh();
    const height = z1 - z0;
    if (height <= 0) return m;
    const t = Math.max(1.2, thickness);
    const ri0 = r0 - t;
    const ri1 = r1 - t;
    if (ri0 <= 0.8 || ri1 <= 0.8) return frustum(cx, cy, z0, z1, r0, Math.max(r1, 0.8), n);
    const ob = ring(m, cx, cy, z0, r0, n);
    const ot = ring(m, cx, cy, z1, r1, n);
    const ib = ring(m, cx, cy, z0, ri0, n);
    const it = ring(m, cx, cy, z1, ri1, n);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      m.addQuad(ob[i], ob[j], ot[j], ot[i]);
      m.addQuad(ib[i], it[i], it[j], ib[j]);
      m.addQuad(ob[i], ib[i], ib[j], ob[j]);
      m.addQuad(ot[i], ot[j], it[j], it[i]);
    }
    return m;
  }

  function dropToBed(mesh) {
    if (!mesh.verts.length) return mesh;
    const [x0, y0, z0] = mesh.bounds();
    mesh.translate(-x0, -y0, -z0);
    return mesh;
  }

  function pack(meshes, limit = 246, gap = 5) {
    const items = [];
    for (const src of meshes) {
      if (!src || !src.verts.length) continue;
      const m = src.copy();
      dropToBed(m);
      const [w, d] = m.size();
      items.push([w, d, m]);
    }
    items.sort((a, b) => Math.max(b[0], b[1]) - Math.max(a[0], a[1]));
    const shelves = [];
    const out = new Mesh();
    let fits = true;
    for (const [w, d, m] of items) {
      if (w > limit || d > limit) fits = false;
      let placed = false;
      for (const shelf of shelves) {
        if (shelf.x + w <= limit + 1e-6 && d <= shelf.h + 1e-6) {
          m.translate(shelf.x, shelf.y, 0);
          shelf.x += w + gap;
          placed = true;
          break;
        }
      }
      if (!placed) {
        const y = shelves.length ? shelves[shelves.length - 1].y + shelves[shelves.length - 1].h + gap : 0;
        if (y + d > limit + 1e-6) fits = false;
        shelves.push({ y, h: d, x: w + gap });
        m.translate(0, y, 0);
      }
      out.merge(m);
    }
    if (!out.verts.length) return [out, 0, 0, true];
    const [pw, pd] = out.size();
    if (pw > limit + 1e-6 || pd > limit + 1e-6) fits = false;
    return [out, pw, pd, fits];
  }

  function centerFloor(meshes) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    let any = false;
    for (const m of meshes) {
      if (!m.verts.length) continue;
      any = true;
      const b = m.bounds();
      x0 = Math.min(x0, b[0]); x1 = Math.max(x1, b[3]);
      y0 = Math.min(y0, b[1]); y1 = Math.max(y1, b[4]);
      z0 = Math.min(z0, b[2]);
    }
    if (!any) return;
    const dx = -((x0 + x1) / 2);
    const dy = -((y0 + y1) / 2);
    const dz = -z0;
    for (const m of meshes) m.translate(dx, dy, dz);
  }

  class Body {
    constructor(assembly, printable) { this.assembly = assembly; this.printable = printable; }
  }
  class Part {
    constructor(name, colorId, bodies) { this.name = name; this.colorId = colorId; this.bodies = bodies; }
    assemblyMesh() {
      const out = new Mesh();
      for (const body of this.bodies) out.merge(body.assembly);
      return out;
    }
    plate() { return pack(this.bodies.map((body) => body.printable), BED - 14); }
  }

  function upright(mesh) { return new Body(mesh, dropToBed(mesh.copy())); }
  function flat(assembly, printable) { return new Body(assembly, dropToBed(printable)); }
  function leg(cx, cy, z0, z1, rTop) { return upright(frustum(cx, cy, z0, z1, rTop * 0.82, rTop, 16)); }
  function panelFlat(width, height, thick) { return box(0, 0, 0, width, height, thick); }

  /* ---- Country primitives: turned, extruded, and padded shapes. Every shell is closed, outward-wound. ---- */
  function signedVolume(m) {
    let v = 0;
    for (const [a, b, c] of m.faces) {
      const A = m.verts[a], B = m.verts[b], C = m.verts[c];
      v += (A[0] * (B[1] * C[2] - B[2] * C[1]) - A[1] * (B[0] * C[2] - B[2] * C[0]) + A[2] * (B[0] * C[1] - B[1] * C[0])) / 6;
    }
    return v;
  }
  function orient(m) {
    if (m.faces.length && signedVolume(m) < 0) m.faces = m.faces.map(([a, b, c]) => [a, c, b]);
    return m;
  }
  function xform(m, fn) {
    m.verts = m.verts.map(([x, y, z]) => fn(x, y, z));
    return orient(m);
  }

  function lathe(cx, cy, z0, profile, n = 16) {
    const m = new Mesh();
    const pts = profile.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])).map(([z, r]) => [z, Math.max(0.05, r)]);
    if (pts.length < 2) return m;
    const rings = pts.map(([z, r]) => ring(m, cx, cy, z0 + z, r, n));
    for (let k = 0; k + 1 < rings.length; k++) {
      const a = rings[k], b = rings[k + 1];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        m.addQuad(a[i], a[j], b[j], b[i]);
      }
    }
    const cb = m.addVert(cx, cy, z0 + pts[0][0]);
    const ct = m.addVert(cx, cy, z0 + pts[pts.length - 1][0]);
    const first = rings[0], last = rings[rings.length - 1];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      m.addFace(cb, first[j], first[i]);
      m.addFace(ct, last[i], last[j]);
    }
    return orient(m);
  }

  // A profile given as fractions [t, k] of length L and radius r, clamped to a printable minimum radius.
  function profileOf(L, r, spec, minR = 1.2) {
    return spec.map(([t, k]) => [t * L, Math.max(minR, k * r)]);
  }

  function turnedLeg(cx, cy, z0, z1, r, opts = {}) {
    const m = new Mesh();
    const L = z1 - z0;
    if (L <= 0) return m;
    r = Math.max(1.3, r);
    const pommel = opts.pommel !== false && L > 6 * r;
    const pH = pommel ? Math.min(L * 0.3, Math.max(2.5 * r, opts.pommelH || 0)) : 0;
    const tL = L - pH + (pommel ? 0.3 : 0);
    const spec = [
      [0, 0.72], [0.03, 0.8], [0.07, 0.8], [0.10, 0.62], [0.14, 0.6],
      [0.66, 0.86], [0.70, 0.86], [0.75, 1.0], [0.80, 1.0], [0.85, 0.74],
      [0.90, 0.8], [0.95, 0.92], [1.0, 0.92]
    ];
    m.merge(lathe(cx, cy, z0, profileOf(tL, r, spec), 14));
    if (pommel) m.merge(cube(cx - r, cy - r, z1 - pH, 2 * r, 2 * r, pH));
    return m;
  }

  function spindle(cx, cy, z0, z1, r, n = 10) {
    const L = z1 - z0;
    if (L <= 0) return new Mesh();
    const spec = [[0, 0.9], [0.08, 0.9], [0.12, 0.7], [0.4, 1.0], [0.6, 1.0], [0.88, 0.7], [0.92, 0.9], [1, 0.9]];
    return lathe(cx, cy, z0, profileOf(L, r, spec, 0.6), n);
  }

  function finial(cx, cy, z0, r, n = 14) {
    const H = 2.8 * r;
    const spec = [[0, 0.8], [0.12, 0.8], [0.2, 0.55], [0.32, 0.75], [0.45, 1.0], [0.62, 0.95], [0.78, 0.65], [0.9, 0.35], [1.0, 0.08]];
    return lathe(cx, cy, z0, spec.map(([t, k]) => [t * H, Math.max(0.3, k * r)]), n);
  }

  function bunFoot(cx, cy, z0, h, r, n = 16) {
    const prof = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const a = -Math.PI / 2 + t * Math.PI;
      prof.push([t * h, Math.max(0.4, r * (0.55 + 0.45 * Math.cos(a)))]);
    }
    prof[8][1] = r * 0.7;
    return lathe(cx, cy, z0, prof, n);
  }

  function roundedBox(x, y, z, w, d, h, r = 0.8) {
    const m = new Mesh();
    if (w <= 0 || d <= 0 || h <= 0) return m;
    const c = Math.max(0.01, Math.min(r, w / 2.2, d / 2.2, h / 2.2));
    const oct = (zz, ins) => {
      const x0 = x + ins, x1 = x + w - ins, y0 = y + ins, y1 = y + d - ins, k = c;
      return [[x0 + k, y0], [x1 - k, y0], [x1, y0 + k], [x1, y1 - k], [x1 - k, y1], [x0 + k, y1], [x0, y1 - k], [x0, y0 + k]]
        .map(([px, py]) => m.addVert(px, py, zz));
    };
    const rings = [oct(z, c), oct(z + c, 0), oct(z + h - c, 0), oct(z + h, c)];
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < 8; i++) {
        const j = (i + 1) % 8;
        m.addQuad(rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]);
      }
    }
    for (let i = 1; i < 7; i++) {
      m.addFace(rings[0][0], rings[0][i + 1], rings[0][i]);
      m.addFace(rings[3][0], rings[3][i], rings[3][i + 1]);
    }
    return orient(m);
  }

  function polyArea(poly) {
    let a = 0;
    for (let i = 0; i < poly.length; i++) {
      const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length];
      a += x0 * y1 - x1 * y0;
    }
    return a / 2;
  }
  function cleanPoly(poly) {
    const out = [];
    for (const p of poly) {
      const q = out[out.length - 1];
      if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-4) out.push([p[0], p[1]]);
    }
    while (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 1e-4) out.pop();
    return out;
  }
  // Ear clipping on a CCW simple polygon; returns index triples.
  function earClip(poly) {
    const n = poly.length;
    const idx = [...Array(n).keys()];
    const tris = [];
    const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const inside = (p, a, b, c) => cross(a, b, p) >= -1e-9 && cross(b, c, p) >= -1e-9 && cross(c, a, p) >= -1e-9;
    let guard = 0;
    while (idx.length > 3 && guard < n * n) {
      guard++;
      let clipped = false;
      for (let k = 0; k < idx.length; k++) {
        const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
        const a = poly[i0], b = poly[i1], c = poly[i2];
        if (cross(a, b, c) <= 1e-9) continue;
        let ok = true;
        for (const j of idx) {
          if (j === i0 || j === i1 || j === i2) continue;
          const p = poly[j];
          if ((p[0] === a[0] && p[1] === a[1]) || (p[0] === b[0] && p[1] === b[1]) || (p[0] === c[0] && p[1] === c[1])) continue;
          if (inside(p, a, b, c)) { ok = false; break; }
        }
        if (!ok) continue;
        tris.push([i0, i1, i2]);
        idx.splice(k, 1);
        clipped = true;
        break;
      }
      if (!clipped) {
        // degenerate leftovers: drop the flattest vertex
        let best = 0, bestV = Infinity;
        for (let k = 0; k < idx.length; k++) {
          const v = Math.abs(cross(poly[idx[(k + idx.length - 1) % idx.length]], poly[idx[k]], poly[idx[(k + 1) % idx.length]]));
          if (v < bestV) { bestV = v; best = k; }
        }
        idx.splice(best, 1);
      }
    }
    if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
    return tris;
  }

  // Prism of a polygon drawn in the XZ plane, running from y0 to y1.
  function extrude(polygon, y0, y1) {
    const m = new Mesh();
    let poly = cleanPoly(polygon);
    if (poly.length < 3 || y1 === y0) return m;
    if (y1 < y0) { const t = y0; y0 = y1; y1 = t; }
    if (polyArea(poly) < 0) poly = poly.reverse();
    const f = poly.map(([x, z]) => m.addVert(x, y0, z));
    const b = poly.map(([x, z]) => m.addVert(x, y1, z));
    for (const [i, j, k] of earClip(poly)) {
      m.addFace(f[i], f[j], f[k]);
      m.addFace(b[i], b[k], b[j]);
    }
    for (let i = 0; i < poly.length; i++) {
      const j = (i + 1) % poly.length;
      m.addQuad(f[i], b[i], b[j], f[j]);
    }
    return orient(m);
  }
  // Same prism, but the polygon is drawn in the YZ plane ([y, z] points) and runs along X.
  function extrudeX(polygon, x0, x1) {
    const m = extrude(polygon, x0, x1);
    return xform(m, (px, py, pz) => [py, px, pz]);
  }

  // Polyline helpers for shaped edges.
  function arcPts(cx, cz, rx, rz, a0, a1, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      out.push([cx + rx * Math.cos(a), cz + rz * Math.sin(a)]);
    }
    return out;
  }
  // A board from x0..x1, top at zTop, bottom edge scalloped (scallops cut upward by depth).
  function scallopBoard(x0, x1, zBot, zTop, depth, count, segs = 8) {
    const pts = [[x0, zTop]];
    const w = (x1 - x0);
    const flatEnd = Math.min(w * 0.12, 6);
    pts.push([x0, zBot]);
    pts.push([x0 + flatEnd, zBot]);
    const span = w - 2 * flatEnd;
    const sw = span / Math.max(1, count);
    for (let s = 0; s < count; s++) {
      const a = x0 + flatEnd + s * sw;
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        pts.push([a + t * sw, zBot + depth * Math.sin(Math.PI * t)]);
      }
      pts.push([a + sw, zBot]);
    }
    pts.push([x1, zBot]);
    pts.push([x1, zTop]);
    return pts;
  }
  // A board with a single arched (rising) bottom edge: centre lifts by rise.
  function archBoard(x0, x1, zBot, zTop, rise, segs = 16, endFlat = 0.15) {
    const pts = [[x0, zTop], [x0, zBot]];
    const w = x1 - x0, e = w * endFlat;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      pts.push([x0 + e + t * (w - 2 * e), zBot + rise * Math.sin(Math.PI * t)]);
    }
    pts.push([x1, zBot], [x1, zTop]);
    return pts;
  }
  // A slat with an arched top and bottom (both rise toward the middle).
  function archSlat(x0, x1, zBot, h, rise, segs = 14) {
    const bot = [], top = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, x = x0 + t * (x1 - x0), lift = rise * Math.sin(Math.PI * t);
      bot.push([x, zBot + lift]);
      top.push([x, zBot + h + lift]);
    }
    return bot.concat(top.reverse());
  }

  function rod(p0, p1, r, n = 10) {
    const m = new Mesh();
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
    const L = Math.hypot(dx, dy, dz);
    if (L <= 1e-6 || r <= 0) return m;
    const ax = [dx / L, dy / L, dz / L];
    const ref = Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    let u = [ax[1] * ref[2] - ax[2] * ref[1], ax[2] * ref[0] - ax[0] * ref[2], ax[0] * ref[1] - ax[1] * ref[0]];
    const ul = Math.hypot(...u); u = u.map((q) => q / ul);
    const v = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]];
    const a = [], b = [];
    for (let i = 0; i < n; i++) {
      const t = 2 * Math.PI * i / n, c = Math.cos(t) * r, s = Math.sin(t) * r;
      a.push(m.addVert(p0[0] + u[0] * c + v[0] * s, p0[1] + u[1] * c + v[1] * s, p0[2] + u[2] * c + v[2] * s));
      b.push(m.addVert(p1[0] + u[0] * c + v[0] * s, p1[1] + u[1] * c + v[1] * s, p1[2] + u[2] * c + v[2] * s));
    }
    const ca = m.addVert(...p0), cb = m.addVert(...p1);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      m.addQuad(a[i], a[j], b[j], b[i]);
      m.addFace(ca, a[j], a[i]);
      m.addFace(cb, b[i], b[j]);
    }
    return orient(m);
  }

  // Mushroom knob sticking out toward -Y from the face at y = yFace.
  function knob(cx, yFace, cz, r = 1.3, n = 12) {
    const L = 2.0 * r;
    const prof = [[0, 0.62 * r], [0.25 * L, 0.5 * r], [0.5 * L, 0.55 * r], [0.7 * L, 0.95 * r], [0.85 * L, r], [L, 0.7 * r]];
    const m = lathe(0, 0, 0, prof.map(([z, rr]) => [z, Math.max(0.6, rr)]), n);
    return xform(m, (x, y, z) => [cx + x, yFace - z, cz + y]);
  }

  // Knob body: assembled pointing -Y, printed standing on its stem.
  function knobBody(cx, yFace, cz, r = 1.3) {
    return flat(knob(cx, yFace, cz, r), xform(knob(0, 0, 0, r), (x, y, z) => [x, z, -y]));
  }

  // Cushion: flat bottom, domed top, softened edge; optional tufting dimples [[u,v],...] in 0..1.
  function puffySlab(x, y, z, w, d, h, opts = {}) {
    const m = new Mesh();
    if (w <= 0 || d <= 0 || h <= 0) return m;
    const nx = opts.nx || Math.max(6, Math.min(16, Math.round(w / 4)));
    const ny = opts.ny || Math.max(6, Math.min(16, Math.round(d / 4)));
    const edge = opts.edge == null ? 0.55 : opts.edge;
    const soft = Math.min(opts.soft == null ? 0.9 : opts.soft, w / 6, d / 6);
    const dimples = opts.dimples || [];
    const top = [], bot = [];
    for (let j = 0; j <= ny; j++) {
      top.push([]); bot.push([]);
      for (let i = 0; i <= nx; i++) {
        const u = i / nx, v = j / ny;
        const border = i === 0 || j === 0 || i === nx || j === ny;
        const dome = Math.pow(Math.sin(Math.PI * u) * Math.sin(Math.PI * v), 0.3);
        let hh = h * (edge + (1 - edge) * dome);
        for (const [du, dv] of dimples) {
          const dd = ((u - du) * w) ** 2 + ((v - dv) * d) ** 2;
          const sg = Math.max(1.2, Math.min(w, d) * 0.05);
          hh -= h * 0.16 * Math.exp(-dd / (2 * sg * sg));
        }
        let px = x + u * w, py = y + v * d;
        if (border) {
          px = x + soft + u * (w - 2 * soft);
          py = y + soft + v * (d - 2 * soft);
        }
        top[j].push(m.addVert(px, py, z + Math.max(h * 0.3, hh)));
        bot[j].push(m.addVert(x + u * w, y + v * d, z));
      }
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        m.addQuad(top[j][i], top[j][i + 1], top[j + 1][i + 1], top[j + 1][i]);
        m.addQuad(bot[j][i], bot[j + 1][i], bot[j + 1][i + 1], bot[j][i + 1]);
      }
    }
    // side walls: walk the border loop
    const loop = [];
    for (let i = 0; i < nx; i++) loop.push([0, i]);
    for (let j = 0; j < ny; j++) loop.push([j, nx]);
    for (let i = nx; i > 0; i--) loop.push([ny, i]);
    for (let j = ny; j > 0; j--) loop.push([j, 0]);
    for (let k = 0; k < loop.length; k++) {
      const [ja, ia] = loop[k], [jb, ib] = loop[(k + 1) % loop.length];
      m.addQuad(bot[ja][ia], bot[jb][ib], top[jb][ib], top[ja][ia]);
    }
    return orient(m);
  }
  // Cushion printable: same shape at the origin.
  function puffyFlat(w, d, h, opts) { return puffySlab(0, 0, 0, w, d, h, opts); }

  // Box with consistent outward winding (the legacy box() has its front face reversed).
  function cube(x, y, z, w, d, h) {
    const m = box(x, y, z, w, d, h);
    if (m.faces.length) { m.faces[4] = [m.faces[4][0], m.faces[4][2], m.faces[4][1]]; m.faces[5] = [m.faces[5][0], m.faces[5][2], m.faces[5][1]]; }
    return m;
  }
  function cubeFlat(w, d, h) { return cube(0, 0, 0, w, d, h); }
  // Copy of an assembled thin piece turned so its thin axis ('x' | 'y' | 'z') points up.
  function layFlat(mesh, axis = "y") {
    const m = mesh.copy();
    if (axis === "y") return xform(m, (x, y, z) => [x, z, y]);
    if (axis === "x") return xform(m, (x, y, z) => [y, z, x]);
    return m;
  }
  function flatY(mesh) { return flat(mesh, layFlat(mesh, "y")); }
  function flatX(mesh) { return flat(mesh, layFlat(mesh, "x")); }
  function flatZ(mesh) { return flat(mesh, mesh.copy()); }
  // Horizontal rod printed lying along X.
  function rodBody(p0, p1, r, n = 10) {
    const a = rod(p0, p1, r, n);
    const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    return flat(a, rod([0, 0, r], [L, 0, r], r, n));
  }

  function buildChair(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const seatH = H * 0.47, postR = Math.max(1.7, Math.min(2.3, W * 0.055)), legR = postR * 0.95;
    const inset = postR + 0.3;
    const bodies = [];
    const finR = postR * 0.95, finH = 2.8 * finR;
    const postTop = H - finH;
    const xs = [inset, W - inset];
    const yBack = D - inset, yFront = inset;
    // Rear posts: long turned posts, slight swell at the seat, rings at the slats, finial on top.
    for (const cx of xs) {
      const L = postTop;
      const post = lathe(cx, yBack, 0, profileOf(L, postR, [
        [0, 0.82], [0.03, 0.9], [0.06, 0.82], [0.4, 0.98], [0.48, 1.0], [0.52, 0.9], [0.9, 0.86], [0.94, 0.95], [0.97, 0.95], [1, 0.75]
      ]), 14);
      post.merge(finial(cx, yBack, L - 0.2, finR));
      bodies.push(upright(post));
    }
    // Front legs: turned below the seat, square pommel where the seat rails join.
    for (const cx of xs) bodies.push(upright(turnedLeg(cx, yFront, 0, seatH, legR, { pommelH: 4.5 })));
    // Seat rails just under the rush seat, and stretchers (rungs).
    const rr = Math.max(1.2, postR * 0.6);
    const railZ = seatH - rr;
    const rungs = [
      [[xs[0], yFront, railZ], [xs[1], yFront, railZ]],
      [[xs[0], yBack, railZ], [xs[1], yBack, railZ]],
      [[xs[0], yFront, railZ], [xs[0], yBack, railZ]],
      [[xs[1], yFront, railZ], [xs[1], yBack, railZ]],
      [[xs[0], yFront, seatH * 0.32], [xs[1], yFront, seatH * 0.32]],
      [[xs[0], yFront, seatH * 0.16], [xs[0], yBack, seatH * 0.16]],
      [[xs[1], yFront, seatH * 0.16], [xs[1], yBack, seatH * 0.16]],
      [[xs[0], yFront, seatH * 0.42], [xs[0], yBack, seatH * 0.42]],
      [[xs[1], yFront, seatH * 0.42], [xs[1], yBack, seatH * 0.42]],
      [[xs[0], yBack, seatH * 0.24], [xs[1], yBack, seatH * 0.24]]
    ];
    for (const [p0, p1] of rungs) bodies.push(rodBody(p0, p1, rr));
    // Three arched ladder slats between the rear posts.
    const slatT = 1.6, slatH = Math.max(3.2, (postTop - seatH) * 0.13);
    const x0 = xs[0] + postR * 0.4, x1 = xs[1] - postR * 0.4;
    const span = postTop - seatH;
    for (const f of [0.42, 0.64, 0.86]) {
      const zb = seatH + span * f - slatH / 2 - 1;
      const poly = archSlat(x0, x1, zb, slatH, slatH * 0.35, 14);
      bodies.push(flatY(extrude(poly, yBack - slatT / 2, yBack + slatT / 2)));
    }
    // Rush seat: a woven-looking pad that sits on the seat rails, slightly domed.
    const cw = xs[1] - xs[0] + 2 * postR - 0.6, cd = yBack - yFront - 0.6;
    const seat = puffySlab(xs[0] - postR + 0.3, yFront + 0.3, seatH - 0.4, cw, cd, 3.0, { edge: 0.7, soft: 0.6, nx: 10, ny: 10 });
    return [
      new Part("Frame", colors.Frame, bodies),
      new Part("Cushion", colors.Cushion, [flat(seat, puffyFlat(cw, cd, 3.0, { edge: 0.7, soft: 0.6, nx: 10, ny: 10 }))])
    ];
  }

  // Rolled-arm cross-section (XZ) for a left arm whose outer edge is x = 0.
  function rolledArm(armT, zBot, armH) {
    const R = armT * 0.55, cz = armH - R;
    const pts = [[armT * 0.16, zBot], [armT, zBot]];
    const a0 = Math.acos(Math.min(1, (armT - R) / R));
    pts.push([armT, cz + R * Math.sin(a0) * 0.2]);
    const a1 = 3.75;
    for (let i = 0; i <= 18; i++) { const a = a0 + (a1 - a0) * i / 18; pts.push([R + R * Math.cos(a), cz + R * Math.sin(a)]); }
    pts.push([armT * 0.16, cz - R * 0.75]);
    return pts;
  }
  function camelBack(x0, x1, zBot, zEnd, zPeak, segs = 28) {
    const pts = [[x0, zBot], [x1, zBot]];
    for (let i = 0; i <= segs; i++) {
      const u = 1 - i / segs;
      const bell = Math.pow(Math.sin(Math.PI * u), 1.6);
      pts.push([x0 + u * (x1 - x0), zEnd + (zPeak - zEnd) * bell]);
    }
    return cleanPoly(pts);
  }

  function buildSofa(wIn, dIn, hIn, colors, cushions = 3) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const legH = Math.min(7.0, H * 0.11);
    const armT = Math.max(8.0, W * 0.1);
    const backT = Math.max(6.0, D * 0.14);
    const seatZ = H * 0.42;
    const armH = H * 0.66;
    const legs = [];
    const inset = 4.5;
    for (const [cx, cy] of [[inset, inset], [W - inset, inset], [inset, D - inset], [W - inset, D - inset]]) {
      const L = legH + 0.4;
      legs.push(upright(lathe(cx, cy, 0, profileOf(L, 2.6, [[0, 0.6], [0.12, 0.72], [0.35, 1.0], [0.6, 0.95], [0.75, 0.7], [0.88, 0.85], [1, 0.95]]), 14)));
    }
    const body = [];
    const plinth = roundedBox(armT * 0.5, 0, legH, W - armT, D, seatZ - legH, 0.8);
    body.push(flatZ(plinth));
    const armProfile = rolledArm(armT, legH, armH);
    const armL = extrude(armProfile, 0, D);
    const armR = extrude(armProfile.map(([x, z]) => [W - x, z]), 0, D);
    body.push(flatY(armL), flatY(armR));
    const back = extrude(camelBack(armT * 0.55, W - armT * 0.55, seatZ - 0.5, armH + 1.5, W > 100 ? H : armH + (H - armH) * 0.75), D - backT, D);
    body.push(flatY(back));
    const n = W > 80 ? cushions : 1;
    const gap = 1.0;
    const innerW = W - 2 * armT - 0.8;
    const cw = (innerW - gap * (n - 1)) / n;
    const cushT = Math.min(7.0, (H - seatZ) * 0.33);
    const seatD = D - backT - 0.8;
    const cushionsBodies = [];
    const sOpts = { edge: 0.55, soft: 1.0 };
    const bOpts = { edge: 0.45, soft: 1.0 };
    for (let i = 0; i < n; i++) {
      const x = armT + 0.4 + i * (cw + gap);
      cushionsBodies.push(flat(puffySlab(x, 0.4, seatZ, cw, seatD, cushT, sOpts), puffyFlat(cw, seatD, cushT, sOpts)));
      const bz = seatZ + cushT - 0.4, bh = Math.max(6, armH + (H - armH) * 0.55 - bz), bt = Math.min(6.0, backT * 0.9);
      if (bh > 5) {
        const bc = puffySlab(0, 0, 0, cw, bh, bt, bOpts);
        xform(bc, (u, v, w) => [x + u, D - backT + 0.2 - w, bz + v]);
        cushionsBodies.push(flat(bc, puffyFlat(cw, bh, bt, bOpts)));
      }
    }
    return [
      new Part("Body", colors.Body, body),
      new Part("Cushions", colors.Cushions, cushionsBodies),
      new Part("Legs", colors.Legs, legs)
    ];
  }

  function buildOttoman(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const legH = Math.min(5.5, H * 0.18);
    const cushT = Math.max(5.0, H * 0.3);
    const baseH = H - legH - cushT + 0.6;
    const legs = [];
    const r = Math.min(3.6, Math.min(W, D) * 0.09);
    for (const [cx, cy] of [[r + 1, r + 1], [W - r - 1, r + 1], [W - r - 1, D - r - 1], [r + 1, D - r - 1]]) {
      legs.push(upright(bunFoot(cx, cy, 0, legH + 0.3, r)));
    }
    // Upholstered base with a box-pleat skirt: small proud pleats around the bottom edge.
    const base = roundedBox(0.6, 0.6, legH, W - 1.2, D - 1.2, baseH, 1.0);
    const skirtH = baseH * 0.45;
    const skirt = roundedBox(0, 0, legH, W, D, skirtH, 0.6);
    base.merge(skirt);
    const cols = W > 40 ? 3 : 2, rows = 2;
    const dimples = [];
    for (let i = 1; i <= cols; i++) for (let j = 1; j <= rows; j++) dimples.push([i / (cols + 1), j / (rows + 1)]);
    const opts = { edge: 0.55, soft: 1.2, nx: 24, ny: 18, dimples };
    const cw = W - 1.6, cd = D - 1.6;
    const cush = puffySlab(0.8, 0.8, legH + baseH - 0.6, cw, cd, cushT, opts);
    return [
      new Part("Body", colors.Body, [flat(base, dropToBed(base.copy()))]),
      new Part("Cushion", colors.Cushion, [flat(cush, puffyFlat(cw, cd, cushT, opts))]),
      new Part("Legs", colors.Legs, legs)
    ];
  }

  function plankTop(x, y, z, W, D, T, along = "x") {
    const m = new Mesh();
    const groove = 0.6, gap = 0.4;
    m.merge(cube(x, y, z, W, D, T - groove));
    const bb = Math.min(mm(2.5), W * 0.09);
    const n = Math.max(3, Math.min(5, pyRound(D / mm(9))));
    const pd = (D - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) m.merge(cube(x + bb + gap, y + i * (pd + gap), z + T - groove - 0.01, W - 2 * bb - 2 * gap, pd, groove + 0.01));
    m.merge(cube(x, y, z + T - groove - 0.01, bb, D, groove + 0.01));
    m.merge(cube(x + W - bb, y, z + T - groove - 0.01, bb, D, groove + 0.01));
    return m;
  }

  function trestleProfile(c, D, H, top) {
    const fw = D * 0.42, footH = Math.max(5, H * 0.07), cw = Math.max(2.4, D * 0.08), ch = D * 0.36, cleatH = Math.max(4, H * 0.06);
    const half = [];
    half.push([c, footH * 0.32]);
    for (let i = 0; i <= 8; i++) { const t = i / 8; half.push([c + t * fw * 0.62, footH * 0.32 * Math.cos(t * Math.PI / 2)]); }
    half.push([c + fw, 0], [c + fw, footH * 0.55]);
    for (let i = 1; i <= 6; i++) { const t = i / 6; half.push([c + fw - (fw - cw) * Math.sin(t * Math.PI / 2), footH * 0.55 + footH * 0.9 * (1 - Math.cos(t * Math.PI / 2))]); }
    half.push([c + cw, top - cleatH * 1.6]);
    for (let i = 1; i <= 6; i++) { const t = i / 6; half.push([c + cw + (ch * 0.8 - cw) * (1 - Math.cos(t * Math.PI / 2)), top - cleatH * 1.6 + cleatH * 0.8 * Math.sin(t * Math.PI / 2)]); }
    half.push([c + ch, top - cleatH * 0.6], [c + ch, top], [c, top]);
    const left = half.slice(1, -1).reverse().map(([y, z]) => [2 * c - y, z]);
    return half.concat(left);
  }

  function buildTable(wIn, dIn, hIn, colors, shelf = false) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const topT = 3.4;
    const legH = H - topT;
    const parts = [];
    const top = plankTop(0, 0, legH, W, D, topT);
    parts.push(new Part("Top", colors.Top, [flat(top, plankTop(0, 0, 0, W, D, topT))]));
    if (!shelf && W / D >= 1.6) {
      // Farmhouse trestle: two shaped end uprights, wide feet, a through stretcher.
      const t = 3.4, base = [];
      const xs = [W * 0.15, W * 0.85 - t];
      for (const x of xs) base.push(flatX(extrudeX(trestleProfile(D / 2, D, H, legH), x, x + t)));
      const sz = legH * 0.42, sh = Math.max(4.5, H * 0.08), st = 3.0;
      base.push(flat(cube(xs[0] + t - 0.2, D / 2 - st / 2, sz, xs[1] - xs[0] - t + 0.4, st, sh), cubeFlat(xs[1] - xs[0] - t + 0.4, sh, st)));
      // Cleat rail under the top tying the uprights.
      const rh = Math.max(3.5, H * 0.05);
      base.push(flat(cube(xs[0], D / 2 - 1.5, legH - rh, xs[1] - xs[0] + t, 3.0, rh), cubeFlat(xs[1] - xs[0] + t, rh, 3.0)));
      parts.push(new Part("Base", colors.Base, base));
      return parts;
    }
    const apronH = Math.max(6.5, Math.min(12.0, H * 0.22));
    const apronT = 2.0;
    const legR = Math.max(2.15, Math.min(W, D) * 0.045);
    const inset = legR + 2.0;
    const legs = [];
    for (const [cx, cy] of [[inset, inset], [W - inset, inset], [W - inset, D - inset], [inset, D - inset]]) {
      legs.push(upright(turnedLeg(cx, cy, 0, legH, legR, { pommelH: apronH })));
    }
    const zA = legH - apronH;
    const x0 = inset, x1 = W - inset, y0 = inset, y1 = D - inset;
    const apron = new Mesh();
    const longCount = Math.max(1, pyRound((x1 - x0) / 30));
    const sc = (a, b, n) => scallopBoard(a, b, zA, legH, apronH * 0.35, n, 8);
    apron.merge(extrude(sc(x0, x1, longCount), y0 - legR * 0.6, y0 - legR * 0.6 + apronT));
    apron.merge(extrude(sc(x0, x1, longCount), y1 + legR * 0.6 - apronT, y1 + legR * 0.6));
    const shortPoly = archBoard(y0, y1, zA, legH, apronH * 0.3, 12, 0.18);
    apron.merge(extrudeX(shortPoly, x0 - legR * 0.6, x0 - legR * 0.6 + apronT));
    apron.merge(extrudeX(shortPoly, x1 + legR * 0.6 - apronT, x1 + legR * 0.6));
    parts.push(new Part("Base", colors.Base, legs.concat([flat(apron, dropToBed(apron.copy()))])));
    if (shelf) {
      const shelfT = 2.6;
      const shelfZ = Math.max(4.0, legH * 0.22);
      const sw = W - 2 * inset, sd = D - 2 * inset;
      if (sw > 2 && sd > 2 && shelfZ + shelfT < zA - 0.4) {
        // Shelf notched around the legs, planked like the top.
        const k = legR + 0.25;
        const poly = [[k, 0], [sw - k, 0], [sw - k, k], [sw, k], [sw, sd - k], [sw - k, sd - k], [sw - k, sd], [k, sd], [k, sd - k], [0, sd - k], [0, k], [k, k]];
        const slabFlat = xform(extrude(poly, 0, shelfT), (x, y, z) => [x, z, y]);
        const slab = slabFlat.copy().translate(inset, inset, shelfZ);
        parts.push(new Part("Shelf", colors.Shelf || colors.Top, [flat(slab, slabFlat)]));
      }
    }
    return parts;
  }

  function carcass(W, D, H, wall = 2.6, back = 2.0) {
    const panels = [
      box(0, 0, 0, W, D, wall),
      box(0, 0, H - wall, W, D, wall),
      box(0, 0, 0, wall, D, H),
      box(W - wall, 0, 0, wall, D, H),
      box(wall, D - back, wall, W - 2 * wall, back, H - 2 * wall)
    ];
    const printable = new Mesh();
    printable.merge(box(0, 0, 0, W, H, back));
    printable.merge(box(0, 0, 0, W, wall, D));
    printable.merge(box(0, H - wall, 0, W, wall, D));
    printable.merge(box(0, 0, 0, wall, H, D));
    printable.merge(box(W - wall, 0, 0, wall, H, D));
    return panels.map((panel, index) => flat(panel, index === 0 ? printable : new Mesh()));
  }

  function drawerStack(W, D, H, n, frontColor, knobColor, wall = 2.6, frontName = "Fronts", knobName = "Knobs") {
    const frontT = 2.4, gap = 1.15;
    const x0 = wall + 0.9;
    const fw = W - 2 * wall - 1.8;
    const z0 = wall + 3.2;
    const z1 = H - wall - 0.8;
    n = Math.max(1, n);
    let avail = z1 - z0 - gap * (n - 1);
    while (n > 1 && avail < n * 2.2) {
      n -= 1;
      avail = z1 - z0 - gap * (n - 1);
    }
    if (fw < 2 || avail < 2) return [new Part(frontName, frontColor, []), new Part(knobName, knobColor, [])];
    const fh = avail / n;
    const fronts = [], knobs = [];
    for (let i = 0; i < n; i++) {
      const z = z0 + i * (fh + gap);
      fronts.push(flat(box(x0, 0, z, fw, frontT, fh), panelFlat(fw, fh, frontT)));
      knobs.push(upright(cylinderY((x0 + x0 + fw) / 2, -1.8, 0.0, z + fh / 2, 1.15, 14)));
    }
    return [new Part(frontName, frontColor, fronts), new Part(knobName, knobColor, knobs)];
  }

  // Open-front case (bottom, top, sides, back, optional fixed shelves), printed lying on its back.
  function caseShell(x, y, z, w, d, h, wall = 2.4, back = 1.8, shelvesZ = []) {
    const m = new Mesh();
    m.merge(cube(x, y, z, w, d, wall));
    m.merge(cube(x, y, z + h - wall, w, d, wall));
    m.merge(cube(x, y, z + wall - 0.01, wall, d, h - 2 * wall + 0.02));
    m.merge(cube(x + w - wall, y, z + wall - 0.01, wall, d, h - 2 * wall + 0.02));
    m.merge(cube(x + wall - 0.01, y + d - back, z + wall - 0.01, w - 2 * wall + 0.02, back, h - 2 * wall + 0.02));
    for (const sz of shelvesZ) m.merge(cube(x + wall - 0.01, y, sz, w - 2 * wall + 0.02, d - back + 0.01, wall * 0.85));
    return flat(m, xform(m.copy(), (px, py, pz) => [px, pz, -py]));
  }
  // Base board with bracket feet at each end and a shaped skirt between (XZ profile, x0..x1, height fh).
  function bracketSkirt(x0, x1, fh, drop = true) {
    const w = x1 - x0, fw = Math.min(w * 0.18, fh * 1.3), lift = fh * 0.6;
    const pts = [[x0, fh], [x0, 0], [x0 + fw, 0]];
    for (let i = 1; i <= 6; i++) { const t = i / 6; pts.push([x0 + fw + fh * 0.5 * Math.sin(t * Math.PI / 2), lift * (1 - Math.cos(t * Math.PI / 2))]); }
    const a = x0 + fw + fh * 0.5, b = x1 - fw - fh * 0.5;
    if (drop && b - a > fh * 2) {
      const mid = (a + b) / 2, dw = Math.min((b - a) * 0.18, fh * 1.4);
      pts.push([mid - dw, lift]);
      for (let i = 1; i < 10; i++) { const t = i / 10; pts.push([mid - dw + 2 * dw * t, lift - fh * 0.35 * Math.sin(Math.PI * t)]); }
      pts.push([mid + dw, lift]);
    }
    for (let i = 0; i <= 5; i++) { const t = i / 6; pts.push([x1 - fw - fh * 0.5 * Math.cos(t * Math.PI / 2), lift * (1 - Math.sin(t * Math.PI / 2))]); }
    pts.push([x1 - fw, 0], [x1, 0], [x1, fh]);
    return pts;
  }
  function baseFeet(W, D, fh, ov, wide, bodies) {
    if (wide) {
      bodies.push(flatY(extrude(bracketSkirt(ov - 0.6, W - ov + 0.6, fh), ov - 0.8, ov + 1.6)));
      bodies.push(flatX(extrudeX(bracketSkirt(ov + 1.0, D, fh, false), ov - 0.6, ov + 1.8)));
      bodies.push(flatX(extrudeX(bracketSkirt(ov + 1.0, D, fh, false), W - ov - 1.8, W - ov + 0.6)));
      bodies.push(flatZ(cube(ov, ov, fh - 1.6, W - 2 * ov, D - ov, 1.6)));
    } else {
      const r = Math.min(4.2, Math.min(W, D) * 0.1);
      for (const [cx, cy] of [[ov + r, ov + r], [W - ov - r, ov + r], [W - ov - r, D - r], [ov + r, D - r]]) bodies.push(upright(bunFoot(cx, cy, 0, fh + 0.2, r)));
    }
  }

  function buildDrawers(wIn, dIn, hIn, colors, drawers) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const wide = wIn >= 30;
    const fh = Math.min(wide ? 8.5 : 6.0, H * 0.13), topT = 2.6, ov = 1.6, wall = 2.4;
    const caseBodies = [];
    baseFeet(W, D, fh, ov, wide, caseBodies);
    const cz = fh, ch = H - topT - fh, cw = W - 2 * ov, cd = D - ov;
    caseBodies.push(caseShell(ov, ov, cz, cw, cd, ch, wall));
    const top = roundedBox(0, 0, H - topT, W, D, topT, 0.9);
    caseBodies.push(flat(top, roundedBox(0, 0, 0, W, D, topT, 0.9)));
    // Inset drawer fronts in a grid; wide cases split the top row in two.
    let n = Math.max(1, drawers);
    const gap = 0.9, frontT = 1.8;
    const ix0 = ov + wall + 0.5, ix1 = ov + cw - wall - 0.5;
    const iz0 = cz + wall + 0.5, iz1 = cz + ch - wall - 0.5;
    while (n > 1 && (iz1 - iz0 - gap * (n - 1)) / n < 4) n--;
    const rows = [];
    // graduated drawers: lower ones a little deeper
    const weights = [...Array(n).keys()].map((i) => 1 + 0.18 * (n - 1 - i));
    const total = weights.reduce((a, b) => a + b, 0);
    let z = iz0;
    const avail = iz1 - iz0 - gap * (n - 1);
    for (let i = 0; i < n; i++) { const hgt = avail * weights[i] / total; rows.push([z, hgt]); z += hgt + gap; }
    const fronts = [], knobs = [];
    const kr = Math.max(1.2, Math.min(1.7, H * 0.022));
    const yF = ov - 0.4;
    rows.forEach(([rz, rh], i) => {
      const split = wide && i === n - 1 && n > 1 ? 2 : 1;
      const fw = (ix1 - ix0 - gap * (split - 1)) / split;
      for (let s = 0; s < split; s++) {
        const fx = ix0 + s * (fw + gap);
        const f = roundedBox(fx, yF, rz, fw, frontT, rh, 0.4);
        fronts.push(flat(f, roundedBox(0, 0, 0, fw, rh, frontT, 0.4)));
        const kx = fw > 40 ? [fx + fw * 0.25, fx + fw * 0.75] : [fx + fw / 2];
        for (const x of kx) knobs.push(knobBody(x, yF + 0.1, rz + rh / 2, kr));
      }
    });
    return [new Part("Case", colors.Case, caseBodies), new Part("Fronts", colors.Fronts, fronts), new Part("Knobs", colors.Knobs, knobs)];
  }

  // Printed face-up: the -Y front of the piece ends up on top.
  function flatFront(mesh) { return flat(mesh, xform(mesh.copy(), (x, y, z) => [x, z, -y])); }
  // Frame-and-panel door: flat board with raised, bevelled fields standing proud on its front.
  function raisedDoor(x, y, z, w, h, t = 1.6, fields = 1) {
    const m = roundedBox(x, y, z, w, t, h, 0.35);
    const rail = Math.max(2.6, Math.min(w, h) * 0.14), gap = rail * 0.8;
    const fh = (h - 2 * rail - gap * (fields - 1)) / fields;
    for (let i = 0; i < fields; i++) {
      m.merge(roundedBox(x + rail, y - 0.9, z + rail + i * (fh + gap), w - 2 * rail, 1.0, fh, 0.7));
    }
    return m;
  }
  function crown(x0, x1, y0, y1, z, steps) {
    const m = new Mesh();
    let zz = z;
    for (const [out, hh] of steps) {
      m.merge(cube(x0 - out, y0 - out, zz, x1 - x0 + 2 * out, y1 - y0 + out, hh));
      zz += hh - 0.01;
    }
    return m;
  }

  function buildWardrobe(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const ov = 2.4, wall = 2.4;
    const fh = Math.min(9, H * 0.07), crownH = Math.min(8, H * 0.06);
    const caseBodies = [];
    baseFeet(W, D, fh, ov, wIn >= 30, caseBodies);
    const cw = W - 2 * ov, cd = D - ov, ch = H - fh - crownH;
    caseBodies.push(caseShell(ov, ov, fh, cw, cd, ch, wall, 1.8, [fh + ch * 0.5]));
    const cr = crown(ov, W - ov, ov, D, H - crownH, [[0.4, crownH * 0.3], [1.3, crownH * 0.3], [ov, crownH * 0.4 + 0.02]]);
    caseBodies.push(flat(cr, dropToBed(cr.copy())));
    const two = wIn >= 24;
    const gap = 0.8, t = 1.6;
    const x0 = ov + wall + 0.4, x1 = ov + cw - wall - 0.4, z0 = fh + wall + 0.4, z1 = fh + ch - wall - 0.4;
    const dw = two ? (x1 - x0 - gap) / 2 : x1 - x0, dh = z1 - z0;
    const fields = dh > 2.2 * dw ? 2 : 1;
    const doors = [], knobs = [];
    const kr = Math.max(1.2, Math.min(1.7, H * 0.012));
    const xs = two ? [x0, x0 + dw + gap] : [x0];
    xs.forEach((dx, i) => {
      doors.push(flatFront(raisedDoor(dx, ov - 0.3, z0, dw, dh, t, fields)));
      const kx = two ? (i === 0 ? dx + dw - 3.4 : dx + 3.4) : dx + dw - 3.4;
      knobs.push(knobBody(kx, ov - 0.3 + 0.05, z0 + dh * 0.52, kr));
    });
    return [new Part("Case", colors.Case, caseBodies), new Part("Doors", colors.Doors, doors), new Part("Knobs", colors.Knobs, knobs)];
  }

  function crestBoard(x0, x1, z, h, rise, segs = 20) {
    const pts = [[x0, z], [x1, z], [x1, z + h]];
    const w = x1 - x0;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, x = x1 - t * w;
      const k = Math.sin(Math.PI * t);
      pts.push([x, z + h + rise * Math.pow(k, 3)]);
    }
    pts.push([x0, z + h]);
    return cleanPoly(pts);
  }

  function buildBookcase(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const wall = 2.4, back = 1.8, sheet = 1.0;
    const lowH = H * 0.42, upD = Math.max(8, D * 0.5), ogeeH = Math.min(14, H * 0.09);
    const crestH = Math.min(9, H * 0.07), bodyH = H - crestH;
    const kick = Math.min(6, H * 0.05);
    const bodies = [];
    // Sides: full depth below the counter, stepping back to the hutch through an ogee curve.
    const side = [[0, 0], [D, 0], [D, bodyH], [D - upD, bodyH], [D - upD, lowH + ogeeH]];
    for (let i = 1; i < 12; i++) {
      const t = i / 12;
      side.push([(D - upD) * (0.5 + 0.5 * Math.cos(Math.PI * t)), lowH + ogeeH * (1 - t)]);
    }
    side.push([0, lowH]);
    for (const x of [0, W - wall]) bodies.push(flatX(extrudeX(side, x, x + wall)));
    const ix0 = wall - 0.01, iw = W - 2 * wall + 0.02;
    // Plank back: thin sheet behind vertical boards split by grooves.
    const backM = cube(ix0, D - sheet, 0, iw, sheet, bodyH);
    const nP = Math.max(3, pyRound(iw / mm(6)));
    const pw = (iw - 0.4 * (nP - 1)) / nP;
    for (let i = 0; i < nP; i++) backM.merge(cube(ix0 + i * (pw + 0.4), D - back, kick, pw, back - sheet + 0.01, bodyH - kick));
    bodies.push(flat(backM, xform(backM.copy(), (x, y, z) => [x, z, -y])));
    // Bottom, counter (waist) and hutch top boards.
    bodies.push(flatZ(cube(ix0, 0, kick, iw, D - back, wall)));
    bodies.push(flatZ(roundedBox(0, -1.0, lowH - wall, W, D + 1.0 - back + 0.01, wall, 0.6)));
    bodies.push(flatZ(roundedBox(-1.0, D - upD - 1.2, bodyH - wall, W + 2.0, upD + 1.2, wall, 0.6)));
    // Kick skirt with bracket ends under the bottom shelf.
    bodies.push(flatY(extrude(bracketSkirt(wall, W - wall, kick + 0.01), 0.6, 0.6 + wall)));
    // Scalloped valance under the hutch top, crest above it.
    const vH = Math.min(8, H * 0.06);
    const yV = D - upD;
    bodies.push(flatY(extrude(scallopBoard(ix0, ix0 + iw, bodyH - wall - vH, bodyH - wall + 0.01, vH * 0.55, Math.max(3, pyRound(iw / 22)), 8), yV, yV + 1.6)));
    bodies.push(flatY(extrude(crestBoard(0, W, bodyH - 0.01, crestH * 0.45, crestH * 0.55), D - upD - 0.4, D - upD + 1.4)));
    // Shelves: one in the base, the rest in the hutch.
    const shelves = [];
    const sT = 2.0;
    const lz = kick + (lowH - kick) * 0.5;
    shelves.push(flatZ(cube(ix0, 0.4, lz, iw, D - back - 0.4, sT)));
    const upTop = bodyH - wall - vH, upBot = lowH;
    const nUp = Math.max(1, pyRound((upTop - upBot) / mm(12)) - 1);
    const step = (upTop - upBot) / (nUp + 1);
    for (let i = 1; i <= nUp; i++) shelves.push(flatZ(cube(ix0, D - upD + 0.4, upBot + step * i - sT / 2, iw, upD - back - 0.4, sT)));
    return [new Part("Case", colors.Case, bodies), new Part("Shelves", colors.Shelves, shelves)];
  }

  function turnedPost(cx, cy, z1, r, withFinial = true) {
    const finR = r * 0.95, top = withFinial ? z1 - 2.8 * finR : z1;
    const m = lathe(cx, cy, 0, profileOf(top, r, [
      [0, 0.85], [0.03, 0.95], [0.06, 0.85], [0.3, 1.0], [0.34, 1.08], [0.37, 0.92], [0.7, 0.86], [0.8, 0.98], [0.86, 1.05], [0.92, 0.85], [1, 0.9]
    ]), 14);
    if (withFinial) m.merge(finial(cx, cy, top - 0.2, finR));
    return m;
  }
  // Spindle board between two posts: bottom rail, top rail (optionally arched crest), round spindles.
  function spindleBoard(x0, x1, y, zBot, zTop, t, crestRise = 0, spacing = 7) {
    const m = new Mesh();
    const railH = Math.max(3.2, (zTop - zBot) * 0.12);
    const y0 = y - t / 2, y1 = y + t / 2;
    m.merge(cube(x0, y0, zBot, x1 - x0, t, railH));
    if (crestRise > 0) m.merge(extrude(archSlat(x0, x1, zTop - railH, railH, crestRise, 24), y0, y1));
    else m.merge(cube(x0, y0, zTop - railH, x1 - x0, t, railH));
    const n = Math.max(2, Math.floor((x1 - x0) / spacing));
    const step = (x1 - x0) / (n + 1);
    const r = t / 2;
    for (let i = 1; i <= n; i++) m.merge(spindle(x0 + i * step, y, zBot + railH - 0.2, zTop - railH + 0.2, r, 10));
    return m;
  }

  function buildBed(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const r = 2.8, t = 2.6;
    const railH = Math.max(7.0, H * 0.13), railZ = Math.max(8, H * 0.2);
    const mattressT = Math.max(6.0, Math.min(12.0, mm(6)));
    const footH = Math.max(railZ + railH + 14, H * 0.6);
    const frame = [];
    const yF = r, yH = D - r, xs = [r, W - r];
    for (const cx of xs) { frame.push(upright(turnedPost(cx, yF, footH, r))); frame.push(upright(turnedPost(cx, yH, H, r))); }
    const headTop = H * 0.84, footTop = footH * 0.86;
    const head = spindleBoard(xs[0] + r * 0.5, xs[1] - r * 0.5, yH, railZ + railH * 0.4, headTop, t, Math.min(10, H * 0.1));
    frame.push(flat(head, layFlat(head, "y")));
    const foot = spindleBoard(xs[0] + r * 0.5, xs[1] - r * 0.5, yF, railZ + railH * 0.4, footTop, t, 0);
    frame.push(flat(foot, layFlat(foot, "y")));
    for (const cx of xs) {
      const rail = cube(cx - t / 2, yF + r * 0.5, railZ, t, yH - yF - r, railH);
      frame.push(flatX(rail));
    }
    // Slat deck the mattress rests on.
    const deck = cube(xs[0] + t / 2, yF + r, railZ + railH * 0.35, xs[1] - xs[0] - t, yH - yF - 2 * r, 1.6);
    frame.push(flatZ(deck));
    const mz = railZ + railH * 0.35 + 1.6;
    const mx = xs[0] + t / 2 + 0.3, mw = xs[1] - xs[0] - t - 0.6, my = yF + r + 0.3, md = yH - yF - 2 * r - 0.6;
    const quilt = [];
    for (let i = 1; i <= 3; i++) for (let j = 1; j <= 5; j++) quilt.push([i / 4, j / 6]);
    const qopts = { edge: 0.7, soft: 1.4, nx: 18, ny: 24, dimples: quilt };
    const mattress = puffySlab(mx, my, mz, mw, md, mattressT, qopts);
    const pillowH = Math.min(6.5, mattressT * 0.8), pillowD = Math.min(18.0, md * 0.2), gap = 2.0;
    const pw = (mw - gap - 4) / 2;
    const popts = { edge: 0.3, soft: 1.2, nx: 12, ny: 8 };
    const py = my + md - pillowD - 1.5;
    const pillows = [0, 1].map((i) => {
      const px = mx + 2 + i * (pw + gap);
      return flat(puffySlab(px, py, mz + mattressT - 1.2, pw, pillowD, pillowH, popts), puffyFlat(pw, pillowD, pillowH, popts));
    });
    return [
      new Part("Frame", colors.Frame, frame),
      new Part("Mattress", colors.Mattress, [flat(mattress, puffyFlat(mw, md, mattressT, qopts))]),
      new Part("Pillows", colors.Pillows, pillows)
    ];
  }

  function buildBench(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const padT = Math.max(2.6, H * 0.12), seatT = 3.0;
    const legH = H - padT - seatT;
    const t = 2.6, ew = D * 0.84, y0 = (D - ew) / 2, y1 = y0 + ew, c = D / 2;
    const notchW = ew * 0.28, notchH = Math.min(legH * 0.35, ew * 0.55);
    // Bootjack ends: boards with a V cut out of the bottom, gently waisted.
    const end = [[y0, 0], [c - notchW, 0], [c, notchH], [c + notchW, 0], [y1, 0], [y1, legH * 0.5], [y1 - ew * 0.06, legH * 0.72], [y1, legH + 0.01], [y0, legH + 0.01], [y0 + ew * 0.06, legH * 0.72], [y0, legH * 0.5]];
    const frame = [];
    const xs = [W * 0.09, W * 0.91 - t];
    for (const x of xs) frame.push(flatX(extrudeX(end, x, x + t)));
    // Scalloped aprons front and back, running between and past the ends.
    const apronH = Math.min(9, legH * 0.38), at = 1.8;
    const ax0 = xs[0] - 3, ax1 = xs[1] + t + 3;
    const sc = scallopBoard(ax0, ax1, legH - apronH, legH + 0.01, apronH * 0.45, Math.max(2, pyRound((ax1 - ax0) / 28)), 8);
    frame.push(flatY(extrude(sc, y0, y0 + at)));
    frame.push(flatY(extrude(sc, y1 - at, y1)));
    const seat = plankTop(0, 0, legH, W, D, seatT);
    frame.push(flat(seat, plankTop(0, 0, 0, W, D, seatT)));
    const opts = { edge: 0.55, soft: 1.0 };
    const pw = W - 2.8, pd = D - 2.8;
    const pad = puffySlab(1.4, 1.4, legH + seatT - 0.2, pw, pd, padT, opts);
    return [
      new Part("Frame", colors.Frame, frame),
      new Part("Pad", colors.Pad, [flat(pad, puffyFlat(pw, pd, padT, opts))])
    ];
  }

  function buildStool(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const padT = 2.8, seatT = 3.2, seatH = H - padT;
    const r = Math.min(W, D) / 2, legR = 1.9, inset = r * 0.6, cx = r, cy = r;
    const bodies = [];
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [cx + sx * inset * 0.92, cy + sy * inset * 0.92]);
    for (const [px, py] of pts) bodies.push(upright(turnedLeg(px, py, 0, seatH - seatT + 0.3, legR, { pommel: false })));
    const rr = 1.2;
    [[0, 1, 0.24], [2, 3, 0.24], [1, 2, 0.4], [3, 0, 0.4]].forEach(([a, b, f]) => {
      bodies.push(rodBody([pts[a][0], pts[a][1], seatH * f], [pts[b][0], pts[b][1], seatH * f], rr));
    });
    const seat = lathe(cx, cy, seatH - seatT, [[0, r * 0.86], [seatT * 0.45, r * 0.98], [seatT * 0.8, r * 0.98], [seatT, r * 0.92]], 28);
    bodies.push(upright(seat));
    const rp = r * 0.86;
    const prof = [[0, rp], [padT * 0.35, rp], [padT * 0.7, rp * 0.86], [padT * 0.9, rp * 0.6], [padT, rp * 0.25], [padT, 0.05]];
    const pad = lathe(cx, cy, seatH - 0.1, prof, 28);
    return [
      new Part("Seat", colors.Seat, bodies),
      new Part("Pad", colors.Pad, [upright(pad)])
    ];
  }

  function buildLamp(wIn, dIn, hIn, colors) {
    const H = mm(hIn);
    const foot = Math.min(mm(wIn), mm(dIn)) / 2;
    const cx = foot;
    const stemTop = H * 0.62;
    const shadeH = H - stemTop;
    const shadeR0 = foot * 1.05, shadeR1 = shadeR0 * 0.6;
    const fr = foot * 0.86;
    // Turned urn base and column: plinth disk, urn, neck, long column with rings, cup under the shade.
    const L = stemTop + 2.0;
    const prof = [
      [0, fr], [2.0, fr], [2.6, fr * 0.86], [3.4, fr * 0.86], [4.0, fr * 0.6],
      [5.5, fr * 0.72], [8.5, fr * 0.8], [11.5, fr * 0.66], [13.5, fr * 0.36], [14.5, fr * 0.3],
      [15.2, fr * 0.42], [16.0, fr * 0.3], [17.0, 2.3],
      [L * 0.55, 2.0], [L * 0.55 + 0.8, 3.0], [L * 0.55 + 1.6, 2.0],
      [L - 4.0, 1.9], [L - 3.2, 2.4], [L - 1.6, 2.8], [L - 1.0, 2.2], [L, 1.4]
    ].filter(([z], i, arr) => i === 0 || z >= arr[i - 1][0]);
    const base = lathe(cx, cx, 0, prof, 20);
    const shadeA = frustumShell(cx, cx, stemTop, H, shadeR0, shadeR1, 1.6, 28);
    const shadeP = frustumShell(0, 0, 0, shadeH, shadeR0, shadeR1, 1.6, 28);
    return [
      new Part("Base", colors.Base, [upright(base)]),
      new Part("Shade", colors.Shade, [flat(shadeA, shadeP)])
    ];
  }

  function slatPanel(width, height, thick, along = "x") {
    const rail = 3.0, slat = 1.8, gap = 2.3;
    const assembly = new Mesh();
    const printable = new Mesh();
    function add(ax, ay, az, aw, ad, ah, px, py, pw, ph) {
      if (aw <= 0 || ad <= 0 || ah <= 0) return;
      assembly.merge(box(ax, ay, az, aw, ad, ah));
      printable.merge(box(px, py, 0, pw, ph, thick));
    }
    if (along === "x") {
      add(0, 0, 0, width, thick, rail, 0, 0, width, rail);
      add(0, 0, height - rail, width, thick, rail, 0, height - rail, width, rail);
      let x = rail;
      while (x + slat < width - rail) {
        add(x, 0, rail - 0.2, slat, thick, height - 2 * rail + 0.4, x, rail - 0.2, slat, height - 2 * rail + 0.4);
        x += slat + gap;
      }
    } else {
      add(0, 0, 0, thick, width, rail, 0, 0, width, rail);
      add(0, 0, height - rail, thick, width, rail, 0, height - rail, width, rail);
      let y = rail;
      while (y + slat < width - rail) {
        add(0, y, rail - 0.2, thick, slat, height - 2 * rail + 0.4, y, rail - 0.2, slat, height - 2 * rail + 0.4);
        y += slat + gap;
      }
    }
    return flat(assembly, printable);
  }

  function buildCrib(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const r = 2.4, t = 2.4;
    const sideH = H * 0.66, footH = H * 0.8;
    const mattressT = Math.max(5.0, Math.min(9.0, mm(4)));
    const bottom = 7.0;
    const frame = [];
    const xs = [r, W - r], yF = r, yH = D - r;
    for (const cx of xs) { frame.push(upright(turnedPost(cx, yF, footH, r))); frame.push(upright(turnedPost(cx, yH, H, r))); }
    const head = spindleBoard(xs[0] + r * 0.5, xs[1] - r * 0.5, yH, bottom, H * 0.86, t, Math.min(8, H * 0.08), 5.2);
    frame.push(flat(head, layFlat(head, "y")));
    const foot = spindleBoard(xs[0] + r * 0.5, xs[1] - r * 0.5, yF, bottom, footH * 0.9, t, 0, 5.2);
    frame.push(flat(foot, layFlat(foot, "y")));
    for (const cx of xs) {
      const side = spindleBoard(yF + r * 0.5, yH - r * 0.5, cx, bottom, sideH, t, 0, 5.2);
      xform(side, (x, y, z) => [y, x, z]);
      frame.push(flat(side, layFlat(side, "x")));
    }
    // Spring deck resting on the bottom rails.
    const deckZ = bottom + 3.2;
    const deck = cube(xs[0] + t / 2, yF + t / 2, deckZ, xs[1] - xs[0] - t, yH - yF - t, 1.4);
    frame.push(flatZ(deck));
    const mx = xs[0] + t / 2 + 0.4, my = yF + t / 2 + 0.4, mw = xs[1] - xs[0] - t - 0.8, md = yH - yF - t - 0.8;
    const opts = { edge: 0.65, soft: 1.0, nx: 12, ny: 18 };
    const mattress = puffySlab(mx, my, deckZ + 1.4, mw, md, mattressT, opts);
    return [
      new Part("Frame", colors.Frame, frame),
      new Part("Mattress", colors.Mattress, [flat(mattress, puffyFlat(mw, md, mattressT, opts))])
    ];
  }

  function archedPanel(x0, x1, z0, z1, rise, segs = 20) {
    const pts = [[x0, z0], [x1, z0], [x1, z1 - rise]];
    for (let i = 1; i < segs; i++) {
      const a = Math.PI * i / segs;
      pts.push([(x0 + x1) / 2 + (x1 - x0) / 2 * Math.cos(a), z1 - rise + rise * Math.sin(a)]);
    }
    pts.push([x0, z1 - rise]);
    return pts;
  }

  function buildVanity(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    let caseH = Math.min(H * 0.48, mm(30));
    if (caseH > H - 20) caseH = H * 0.55;
    const ov = 1.6, wall = 2.4, topT = 2.4, fh = Math.min(6, caseH * 0.1);
    const caseBodies = [];
    baseFeet(W, D, fh, ov, false, caseBodies);
    const cw = W - 2 * ov, cd = D - ov, ch = caseH - topT - fh;
    caseBodies.push(caseShell(ov, ov, fh, cw, cd, ch, wall));
    caseBodies.push(flat(roundedBox(0, 0, caseH - topT, W, D, topT, 0.8), roundedBox(0, 0, 0, W, D, topT, 0.8)));
    // Lower front: a fixed raised-panel door below the drawer.
    const ix0 = ov + wall + 0.4, ix1 = ov + cw - wall - 0.4, iz0 = fh + wall + 0.4, iz1 = fh + ch - wall - 0.4;
    const drH = Math.max(6, (iz1 - iz0) * 0.26), gap = 0.8;
    const doorH = iz1 - iz0 - drH - gap;
    caseBodies.push(flatFront(raisedDoor(ix0, ov - 0.3, iz0, ix1 - ix0, doorH, 1.6, 1)));
    // Scalloped backsplash on the top, along the back edge.
    const splH = Math.min(9, H * 0.08);
    const splash = [[0.5, caseH - 0.01], [W - 0.5, caseH - 0.01], [W - 0.5, caseH + splH * 0.55]];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, x = W - 0.5 - t * (W - 1);
      splash.push([x, caseH + splH * 0.55 + splH * 0.45 * Math.abs(Math.sin(3 * Math.PI * t))]);
    }
    splash.push([0.5, caseH + splH * 0.55]);
    caseBodies.push(flatY(extrude(splash, D - 2.0, D)));
    // Harp: two turned uprights holding an arched mirror frame.
    const ur = 1.7, uy = D - 4.2, ux = [ur + 1.0, W - ur - 1.0];
    const upTop = H - 2.8 * ur * 0.95;
    for (const x of ux) {
      const L = H - caseH;
      const post = lathe(x, uy, caseH - 0.2, profileOf(L - 2.8 * ur * 0.95, ur, [[0, 1.2], [0.05, 1.2], [0.08, 0.8], [0.4, 1.0], [0.45, 1.15], [0.5, 0.9], [0.92, 0.85], [0.96, 1.05], [1, 0.9]]), 12);
      post.merge(finial(x, uy, upTop - 0.4, ur * 0.95));
      caseBodies.push(upright(post));
    }
    const fx0 = ux[0] + ur * 0.6, fx1 = ux[1] - ur * 0.6;
    const fz0 = caseH + splH + 3, fz1 = H - 6;
    const rise = Math.min((fx1 - fx0) * 0.3, (fz1 - fz0) * 0.4);
    const frameM = extrude(archedPanel(fx0, fx1, fz0, fz1, rise), uy - 1.1, uy + 1.1);
    caseBodies.push(flatY(frameM));
    caseBodies.push(flatX(cube(ux[0], uy - 1.0, fz0 + (fz1 - fz0) * 0.4, fx0 - ux[0] + 0.5, 2.0, 2.4)));
    caseBodies.push(flatX(cube(fx1 - 0.5, uy - 1.0, fz0 + (fz1 - fz0) * 0.4, ux[1] - fx1 + 0.5, 2.0, 2.4)));
    const lip = 2.6;
    const glass = extrude(archedPanel(fx0 + lip, fx1 - lip, fz0 + lip, fz1 - lip, Math.max(1, rise - lip)), uy - 1.9, uy - 1.0);
    // Drawer with a knob.
    const dr = roundedBox(ix0, ov - 0.4, iz1 - drH, ix1 - ix0, 1.8, drH, 0.4);
    const kr = Math.max(1.2, Math.min(1.6, H * 0.013));
    return [
      new Part("Case", colors.Case, caseBodies),
      new Part("Drawer", colors.Drawer, [flat(dr, roundedBox(0, 0, 0, ix1 - ix0, drH, 1.8, 0.4))]),
      new Part("Knob", colors.Knob, [knobBody((ix0 + ix1) / 2, ov - 0.3, iz1 - drH / 2, kr)]),
      new Part("Mirror", colors.Mirror, [flatY(glass)])
    ];
  }

  const BUILDERS = {
    chair: buildChair, sofa: buildSofa, ottoman: buildOttoman, table: buildTable,
    drawers: buildDrawers, wardrobe: buildWardrobe, bookcase: buildBookcase, bed: buildBed,
    bench: buildBench, stool: buildStool, lamp: buildLamp, crib: buildCrib, vanity: buildVanity
  };
  const KIND_INFO = {
    chair: { label: "Side chair", parts: ["Frame", "Cushion"], blurb: "Ladder-back with turned posts, finials, three arched slats and a rush seat. Glue the rungs between the posts, slats into the back." },
    sofa: { label: "Sofa", parts: ["Body", "Cushions", "Legs"], blurb: "Rolled arms and a camelback, on short turned feet. Arms and back glue around the plinth; the plump cushions drop in." },
    ottoman: { label: "Ottoman", parts: ["Body", "Cushion", "Legs"], blurb: "Tufted cushion on a skirted base, on bun feet. The cushion drops onto the base." },
    table: { label: "Table", parts: ["Top", "Base"], blurb: "Farmhouse plank top with breadboard ends. Turned legs and a scalloped apron, or a trestle base on long tables." },
    drawers: { label: "Chest of drawers", parts: ["Case", "Fronts", "Knobs"], blurb: "Overhanging chamfered top, graduated drawers with mushroom knobs. Bracket feet and a shaped skirt on wide chests, bun feet on small ones." },
    wardrobe: { label: "Wardrobe", parts: ["Case", "Doors", "Knobs"], blurb: "Jelly cupboard: raised-panel doors, stepped crown, bracket feet. Print the case on its back; the doors print face up." },
    bookcase: { label: "Bookcase", parts: ["Case", "Shelves"], blurb: "Step-back hutch with ogee-cut sides, a scalloped valance, an arched crest and a plank back. Sides print flat; glue up around the boards." },
    bed: { label: "Bed", parts: ["Frame", "Mattress", "Pillows"], blurb: "Turned posts with finials, spindle headboard with an arched crest rail, spindle footboard, quilted mattress." },
    bench: { label: "Bench", parts: ["Frame", "Pad"], blurb: "Bootjack ends with V-notched feet, scalloped aprons, a plank seat and a pad." },
    stool: { label: "Stool", parts: ["Seat", "Pad"], blurb: "Round chamfered seat on four turned legs tied by rungs, with a domed pad." },
    lamp: { label: "Floor lamp", parts: ["Base", "Shade"], blurb: "Turned urn base and column under an empire drum shade. The shade is a thin shell; wide end on the bed, then drop it onto the stem." },
    crib: { label: "Crib", parts: ["Frame", "Mattress"], blurb: "Turned corner posts with finials and spindle sides. Spindle panels print flat; glue them between the posts." },
    vanity: { label: "Vanity", parts: ["Case", "Drawer", "Knob", "Mirror"], blurb: "Washstand with a scalloped backsplash, raised-panel door and drawer, and a swing mirror on turned harp posts." }
  };

  function chips(pairs) {
    return pairs.map(([id, name]) => ({ id, name, hex: SHELF_HEX[name] }));
  }

  const PRESETS = [
    { id: "side-chair", kind: "chair", name: "Side chair", room: "Dining", w: 18, d: 16, h: 36, colors: chips([["frame", "Honey Oak"], ["cushion", "Barn Red"]]), partColors: { Frame: "frame", Cushion: "cushion" } },
    { id: "dining-table", kind: "table", name: "Dining table", room: "Dining", w: 60, d: 36, h: 30, shelf: false, colors: chips([["top", "Walnut"], ["base", "Cream"]]), partColors: { Top: "top", Base: "base" } },
    { id: "sideboard", kind: "drawers", name: "Sideboard", room: "Dining", w: 54, d: 18, h: 34, drawers: 3, colors: chips([["case", "Milk Blue"], ["fronts", "Pine"], ["knobs", "Walnut"]]), partColors: { Case: "case", Fronts: "fronts", Knobs: "knobs" } },
    { id: "armchair", kind: "sofa", name: "Armchair", room: "Parlor", w: 32, d: 34, h: 36, colors: chips([["body", "Barn Red"], ["cushions", "Linen"], ["legs", "Walnut"]]), partColors: { Body: "body", Cushions: "cushions", Legs: "legs" } },
    { id: "sofa", kind: "sofa", name: "Sofa", room: "Parlor", w: 84, d: 36, h: 34, colors: chips([["body", "Sage"], ["cushions", "Linen"], ["legs", "Walnut"]]), partColors: { Body: "body", Cushions: "cushions", Legs: "legs" } },
    { id: "ottoman", kind: "ottoman", name: "Ottoman", room: "Parlor", w: 24, d: 18, h: 17, colors: chips([["body", "Sage"], ["cushion", "Linen"], ["legs", "Walnut"]]), partColors: { Body: "body", Cushion: "cushion", Legs: "legs" } },
    { id: "coffee-table", kind: "table", name: "Coffee table", room: "Parlor", w: 48, d: 24, h: 17, shelf: true, colors: chips([["top", "Pine"], ["base", "Barn Red"], ["shelf", "Honey Oak"]]), partColors: { Top: "top", Base: "base", Shelf: "shelf" } },
    { id: "end-table", kind: "table", name: "End table", room: "Parlor", w: 18, d: 18, h: 24, shelf: true, colors: chips([["top", "Walnut"], ["base", "Mustard"], ["shelf", "Pine"]]), partColors: { Top: "top", Base: "base", Shelf: "shelf" } },
    { id: "bookcase", kind: "bookcase", name: "Bookcase", room: "Parlor", w: 36, d: 12, h: 72, colors: chips([["case", "Barn Red"], ["shelves", "Pine"]]), partColors: { Case: "case", Shelves: "shelves" } },
    { id: "floor-lamp", kind: "lamp", name: "Floor lamp", room: "Parlor", w: 12, d: 12, h: 58, colors: chips([["base", "Walnut"], ["shade", "Linen"]]), partColors: { Base: "base", Shade: "shade" } },
    { id: "bed", kind: "bed", name: "Bed", room: "Bedroom", w: 54, d: 75, h: 48, colors: chips([["frame", "Cherry"], ["mattress", "Milk Blue"], ["pillows", "Cream"]]), partColors: { Frame: "frame", Mattress: "mattress", Pillows: "pillows" } },
    { id: "nightstand", kind: "drawers", name: "Nightstand", room: "Bedroom", w: 18, d: 16, h: 26, drawers: 2, colors: chips([["case", "Cherry"], ["fronts", "Honey Oak"], ["knobs", "Walnut"]]), partColors: { Case: "case", Fronts: "fronts", Knobs: "knobs" } },
    { id: "dresser", kind: "drawers", name: "Dresser", room: "Bedroom", w: 48, d: 20, h: 34, drawers: 3, colors: chips([["case", "Cherry"], ["fronts", "Honey Oak"], ["knobs", "Walnut"]]), partColors: { Case: "case", Fronts: "fronts", Knobs: "knobs" } },
    { id: "wardrobe", kind: "wardrobe", name: "Wardrobe", room: "Bedroom", w: 42, d: 22, h: 72, colors: chips([["case", "Barn Red"], ["doors", "Pine"], ["knobs", "Walnut"]]), partColors: { Case: "case", Doors: "doors", Knobs: "knobs" } },
    { id: "bench", kind: "bench", name: "Bench", room: "Bedroom", w: 48, d: 16, h: 18, colors: chips([["frame", "Honey Oak"], ["pad", "Barn Red"]]), partColors: { Frame: "frame", Pad: "pad" } },
    { id: "vanity", kind: "vanity", name: "Vanity", room: "Bedroom", w: 36, d: 18, h: 56, colors: chips([["case", "Cream"], ["drawer", "Honey Oak"], ["knob", "Walnut"], ["mirror", "Pewter"]]), partColors: { Case: "case", Drawer: "drawer", Knob: "knob", Mirror: "mirror" } },
    { id: "crib", kind: "crib", name: "Crib", room: "Bedroom", w: 30, d: 54, h: 40, colors: chips([["frame", "Cream"], ["mattress", "Milk Blue"]]), partColors: { Frame: "frame", Mattress: "mattress" } },
    { id: "kitchen-table", kind: "table", name: "Kitchen table", room: "Kitchen", w: 42, d: 28, h: 30, shelf: false, colors: chips([["top", "Pine"], ["base", "Milk Blue"]]), partColors: { Top: "top", Base: "base" } },
    { id: "stool", kind: "stool", name: "Stool", room: "Kitchen", w: 14, d: 14, h: 24, colors: chips([["seat", "Honey Oak"], ["pad", "Barn Red"]]), partColors: { Seat: "seat", Pad: "pad" } }
  ];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function defaultSpec(preset) {
    const spec = clone(preset);
    spec.custom = false;
    return spec;
  }

  function callBuilder(spec, partColors) {
    const fn = BUILDERS[spec.kind];
    if (spec.kind === "table") return fn(spec.w, spec.d, spec.h, partColors, !!spec.shelf);
    if (spec.kind === "drawers") return fn(spec.w, spec.d, spec.h, partColors, Number(spec.drawers || 3));
    return fn(spec.w, spec.d, spec.h, partColors);
  }

  function trisOf(mesh) {
    const out = [];
    for (const [a, b, c] of mesh.faces) {
      const A = mesh.verts[a], B = mesh.verts[b], C = mesh.verts[c];
      out.push([
        round1(A[0]), round1(A[1]), round1(A[2]),
        round1(B[0]), round1(B[1]), round1(B[2]),
        round1(C[0]), round1(C[1]), round1(C[2])
      ]);
    }
    return out;
  }

  function realize(spec) {
    const colors = spec.colors.map((c) => ({ ...c }));
    const known = new Set(colors.map((c) => c.id));
    const partColors = {};
    for (const [name, cid] of Object.entries(spec.partColors || {})) {
      if (known.has(cid)) partColors[name] = cid;
    }
    for (const name of KIND_INFO[spec.kind].parts) {
      if (!known.has(partColors[name])) partColors[name] = colors[0].id;
    }
    const parts = callBuilder(spec, partColors).filter((part) => part.bodies.some((body) => body.assembly.faces.length));
    const assembled = parts.map((part) => part.assemblyMesh());
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (const mesh of assembled) {
      if (!mesh.verts.length) continue;
      const b = mesh.bounds();
      x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); z0 = Math.min(z0, b[2]);
      x1 = Math.max(x1, b[3]); y1 = Math.max(y1, b[4]); z1 = Math.max(z1, b[5]);
    }
    const model = { w: round1(x1 - x0), d: round1(y1 - y0), h: round1(z1 - z0) };
    let platesFit = true;
    const payloadParts = [];
    for (let i = 0; i < parts.length; i++) {
      const [plate, pw, pd, fits] = parts[i].plate();
      platesFit = platesFit && fits;
      payloadParts.push({
        name: parts[i].name,
        colorId: parts[i].colorId,
        plate: { w: round1(pw), d: round1(pd), fits },
        tris: trisOf(assembled[i])
      });
    }
    const extra = {};
    if ("shelf" in spec) extra.shelf = spec.shelf;
    if ("drawers" in spec) extra.drawers = spec.drawers;
    return {
      public: {
        id: spec.id, name: spec.name, room: spec.room, kind: spec.kind,
        custom: !!spec.custom,
        real: { w: spec.w, d: spec.d, h: spec.h },
        model, fits: model.w <= 250 && model.d <= 250 && model.h <= 250 && platesFit,
        colors, parts: payloadParts,
        blurb: KIND_INFO[spec.kind].blurb,
        extra,
        partColorMemory: partColors
      },
      parts
    };
  }

  function view(spec) {
    const piece = realize(spec).public;
    if (!spec.custom) {
      const preset = PRESETS.find((item) => item.id === spec.id);
      if (preset) {
        piece.defaults = {
          name: preset.name, w: preset.w, d: preset.d, h: preset.h,
          colors: clone(preset.colors), partColors: { ...preset.partColors }
        };
      }
    }
    return piece;
  }

  function seedFor(kind) {
    const preferred = { sofa: "sofa", table: "dining-table", drawers: "dresser" };
    const target = preferred[kind];
    return PRESETS.find((preset) => target && preset.id === target) || PRESETS.find((preset) => preset.kind === kind);
  }

  function kinds() {
    return Object.entries(KIND_INFO).map(([id, info]) => {
      const preset = seedFor(id);
      return { id, label: info.label, room: preset.room, w: preset.w, d: preset.d, h: preset.h, parts: info.parts };
    });
  }

  function piecesFrom(state) {
    const specs = PRESETS.map((preset) => {
      const spec = defaultSpec(preset);
      const over = (state.overrides && state.overrides[preset.id]) || {};
      for (const key of ["name", "w", "d", "h", "colors", "partColors"]) {
        if (key in over) spec[key] = clone(over[key]);
      }
      return spec;
    });
    for (const spec of state.custom || []) specs.push(clone(spec));
    return specs;
  }

  function catalog(state) {
    return { shelf: SHELF.map((item) => ({ ...item })), bed: BED, kinds: kinds(), pieces: piecesFrom(state || {}).map(view) };
  }

  const ID_OK = /^[a-z][a-z0-9-]{0,24}$/;
  const HEX = /^#[0-9A-Fa-f]{6}$/;

  function validate(spec) {
    const name = String(spec.name || "").trim();
    if (!name || name.length > 48) return "Name needs 1 to 48 characters.";
    for (const key of ["w", "d", "h"]) {
      const number = Number(spec[key]);
      if (!(number >= 8 && number <= 120)) return "Keep each side between 8 and 120 real inches.";
    }
    if (!Array.isArray(spec.colors) || spec.colors.length < 1 || spec.colors.length > MAX_COLORS) {
      return "A print holds 1 to 4 colors.";
    }
    const seen = new Set();
    for (const color of spec.colors) {
      const id = String(color.id || "").trim().toLowerCase();
      if (!ID_OK.test(id)) return "Color id is not usable.";
      if (seen.has(id)) return "Two swatches share an id.";
      seen.add(id);
      if (!color.name || String(color.name).length > 24) return "Color name needs 1 to 24 characters.";
      if (!HEX.test(String(color.hex || ""))) return "Color must be a #RRGGBB value.";
    }
    return "";
  }

  function customSpec(input) {
    const seed = seedFor(input.kind);
    const spec = defaultSpec(seed);
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    spec.id = "c-" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    spec.custom = true;
    spec.name = String(input.name || seed.name).trim().slice(0, 48) || seed.name;
    spec.w = Number(input.w);
    spec.d = Number(input.d);
    spec.h = Number(input.h);
    spec.room = seed.room;
    return spec;
  }

  function signature(spec) {
    const source = typeof spec === "string" ? defaultSpec(PRESETS.find((item) => item.id === spec)) : spec;
    const piece = realize(source);
    return {
      id: piece.public.id,
      model: piece.public.model,
      fits: piece.public.fits,
      parts: piece.parts.map((part) => {
        const mesh = part.assemblyMesh();
        const b = mesh.verts.length ? mesh.bounds() : [0, 0, 0, 0, 0, 0];
        const plate = part.plate();
        return {
          name: part.name,
          colorId: part.colorId,
          faces: mesh.faces.length,
          verts: mesh.verts.length,
          bounds: b.map((n) => Math.round(n * 100) / 100),
          plate: [Math.round(plate[1] * 10) / 10, Math.round(plate[2] * 10) / 10, plate[3]]
        };
      })
    };
  }

  function slug(text) {
    const chars = [];
    for (const ch of String(text).toLowerCase()) {
      if (/[a-z0-9]/.test(ch)) chars.push(ch);
      else if (chars.length && chars[chars.length - 1] !== "-") chars.push("-");
    }
    return chars.join("").replace(/-$/, "") || "piece";
  }

  function stlBytes(mesh, name) {
    const header = new Uint8Array(80);
    const ascii = new TextEncoder().encode(String(name).replace(/[^\x20-\x7e]/g, "?")).slice(0, 80);
    header.set(ascii);
    const out = new ArrayBuffer(84 + mesh.faces.length * 50);
    const view = new DataView(out);
    new Uint8Array(out, 0, 80).set(header);
    view.setUint32(80, mesh.faces.length, true);
    let offset = 84;
    for (const [a, b, c] of mesh.faces) {
      const A = mesh.verts[a], B = mesh.verts[b], C = mesh.verts[c];
      let nx = (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]);
      let ny = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]);
      let nz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
      const length = Math.hypot(nx, ny, nz) || 1;
      nx /= length; ny /= length; nz /= length;
      for (const n of [nx, ny, nz, A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2]]) {
        view.setFloat32(offset, n, true);
        offset += 4;
      }
      view.setUint16(offset, 0, true);
      offset += 2;
    }
    return new Uint8Array(out);
  }

  const CRC = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (~c) >>> 0;
  }

  async function deflateRaw(data) {
    const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function u16(n) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n, true); return b; }
  function u32(n) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0, true); return b; }

  async function zipBytes(entries) {
    const locals = [];
    const centrals = [];
    let offset = 0;
    for (const entry of entries) {
      const name = new TextEncoder().encode(entry.name);
      const raw = entry.data instanceof Uint8Array ? entry.data : new TextEncoder().encode(entry.data);
      const comp = await deflateRaw(raw);
      const crc = crc32(raw);
      const local = [
        u32(0x04034b50), u16(20), u16(0), u16(8), u16(0), u16(0x552a),
        u32(crc), u32(comp.length), u32(raw.length), u16(name.length), u16(0), name, comp
      ];
      const size = local.reduce((n, part) => n + part.length, 0);
      const central = [
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(0), u16(0x552a),
        u32(crc), u32(comp.length), u32(raw.length), u16(name.length), u16(0), u16(0),
        u16(0), u16(0), u32(0), u32(offset), name
      ];
      locals.push(...local);
      centrals.push(...central);
      offset += size;
    }
    const centralStart = offset;
    const centralSize = centrals.reduce((n, part) => n + part.length, 0);
    const end = [
      u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
      u32(centralSize), u32(centralStart), u16(0)
    ];
    const parts = locals.concat(centrals, end);
    const total = parts.reduce((n, part) => n + part.length, 0);
    const out = new Uint8Array(total);
    let cursor = 0;
    for (const part of parts) { out.set(part, cursor); cursor += part.length; }
    return out;
  }

  function xml(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function uid(n) { return n.toString(16).padStart(8, "0") + "-b206-40ff-9872-83e8017abed1"; }
  function meshXml(mesh) {
    const verts = mesh.verts.map(([x, y, z]) => `<vertex x="${x.toFixed(4)}" y="${y.toFixed(4)}" z="${z.toFixed(4)}"/>`).join("");
    const tris = mesh.faces.map(([a, b, c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join("");
    return `<mesh><vertices>${verts}</vertices><triangles>${tris}</triangles></mesh>`;
  }

  async function build3mf(spec) {
    const built = realize(spec);
    const order = [];
    for (const color of spec.colors) {
      if (built.parts.some((part) => part.colorId === color.id) && !order.includes(color.id)) order.push(color.id);
    }
    if (order.length > MAX_COLORS) throw new Error("A print holds at most 4 colors.");
    const slots = Object.fromEntries(order.map((id, index) => [id, String(index + 1)]));
    const colors = Object.fromEntries(spec.colors.map((color) => [color.id, color]));
    const meshes = built.parts.map((part) => part.assemblyMesh());
    centerFloor(meshes);
    const named = [];
    built.parts.forEach((part, index) => {
      if (!meshes[index].faces.length) return;
      named.push([`${part.name} · ${colors[part.colorId].name}`, slots[part.colorId], meshes[index]]);
    });
    const ns = 'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p"';
    const rel = "http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel";
    const part0 = 65537;
    const objs = named.map(([, , mesh], i) => `<object id="${part0 + i}" p:UUID="${uid(0x10000 + i)}" type="model">${meshXml(mesh)}</object>`).join("");
    const objModel = `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" ${ns}><metadata name="BambuStudio:3mfVersion">1</metadata><resources>${objs}</resources><build/></model>`;
    const comps = named.map((_, i) => `<component p:path="/3D/Objects/object_1.model" objectid="${part0 + i}" p:UUID="${uid(0x20000 + i)}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>`).join("");
    const buildId = crypto.randomUUID();
    const rootModel = `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" ${ns}><metadata name="Application">Doll House Furniture 3D Builder</metadata><metadata name="BambuStudio:3mfVersion">1</metadata><metadata name="Designer">Master David</metadata><metadata name="Title">${xml(spec.name)}</metadata><resources><object id="1" p:UUID="${uid(1)}" type="model"><components>${comps}</components></object></resources><build p:UUID="${buildId}"><item objectid="1" p:UUID="${uid(3)}" transform="1 0 0 0 1 0 0 0 1 130 130 0" printable="1"/></build></model>`;
    let pcfg = "";
    named.forEach(([name, ext], i) => {
      pcfg += `<part id="${part0 + i}" subtype="normal_part"><metadata key="name" value="${xml(name)}"/><metadata key="extruder" value="${ext}"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/><mesh_stat edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/></part>`;
    });
    const cfg = `<?xml version="1.0" encoding="UTF-8"?>\n<config><object id="1"><metadata key="name" value="${xml(spec.name)}"/><metadata key="extruder" value="${named[0][1]}"/>${pcfg}</object><plate><metadata key="plater_id" value="1"/><metadata key="plater_name" value=""/><metadata key="locked" value="false"/><model_instance><metadata key="object_id" value="1"/><metadata key="instance_id" value="0"/></model_instance></plate><assemble><assemble_item object_id="1" instance_id="0" transform="1 0 0 0 1 0 0 0 1 130 130 0" offset="0 0 0"/></assemble></config>`;
    const ct = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`;
    const rels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="${rel}"/></Relationships>`;
    const mrels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/Objects/object_1.model" Id="rel-1" Type="${rel}"/></Relationships>`;
    return zipBytes([
      { name: "[Content_Types].xml", data: ct },
      { name: "_rels/.rels", data: rels },
      { name: "3D/3dmodel.model", data: rootModel },
      { name: "3D/_rels/3dmodel.model.rels", data: mrels },
      { name: "3D/Objects/object_1.model", data: objModel },
      { name: "Metadata/model_settings.config", data: cfg }
    ]);
  }

  function printSheet(spec, piece) {
    const colors = Object.fromEntries(spec.colors.map((color) => [color.id, color]));
    const lines = [
      piece.name,
      "Doll House Furniture 3D Builder  ·  1:12 dollhouse furniture for the Creality K2",
      "",
      "Scale is already 1:12 (one inch to the foot).",
      "In Creality Print, trust the size in millimetres and leave scale at 100%.",
      "The Scale % box resets itself after you apply it, so it will lie to you.",
      "Do not select everything and scale — that scales the gaps too and throws the parts off the plate.",
      "The K2 bed is 260 × 260 × 260 mm. Not 350.",
      "",
      `Real size:  ${spec.w} × ${spec.d} × ${spec.h} in`,
      `Model size: ${piece.model.w} × ${piece.model.d} × ${piece.model.h} mm`,
      "",
      piece.blurb,
      "",
      "Colors on this piece:"
    ];
    for (const color of spec.colors) lines.push(`  ${color.name}  ${color.hex}`);
    lines.push("", "Parts (each STL is one color, laid on the bed):");
    for (const part of piece.parts) {
      const color = colors[part.colorId] || {};
      lines.push(`  ${part.name} — ${color.name || part.colorId}  plate ${part.plate.w} × ${part.plate.d} mm`);
    }
    lines.push(
      "",
      "The 3MF is one print: the assembled piece, each part pinned to a CFS slot.",
      "A print holds four colors. That is all the CFS can load.",
      "The STLs are split so you can print one spool per plate and skip the purge.",
      "",
      "Suggested PETG on the textured PEI sheet: 0.4 mm nozzle, 0.20 mm layers,",
      "3 walls, 15% infill, brim on legs and posts. Nozzle 230–250 °C, bed 70–85 °C.",
      "Walls and legs are a little heavier than true scale so they survive a 0.4 mm nozzle.",
      "There is no brown on the shelf — gray is the wood.",
      "Glue the parts with a dot of cyanoacrylate.",
      ""
    );
    return lines.join("\n");
  }

  async function buildZip(spec) {
    const built = realize(spec);
    const colors = Object.fromEntries(spec.colors.map((color) => [color.id, color]));
    const folder = slug(spec.name);
    const used = new Set();
    const entries = [{ name: `${folder}/PRINT.txt`, data: printSheet(spec, built.public) }];
    for (const part of built.parts) {
      const [plate] = part.plate();
      if (!plate.faces.length) continue;
      const color = colors[part.colorId];
      let filename = slug(`${part.name}-${color.name}`);
      if (used.has(filename)) filename += "-" + part.colorId;
      used.add(filename);
      entries.push({ name: `${folder}/${filename}.stl`, data: stlBytes(plate, part.name) });
    }
    return zipBytes(entries);
  }

  function buildStl(spec, partName) {
    const built = realize(spec);
    const colors = Object.fromEntries(spec.colors.map((color) => [color.id, color]));
    const part = built.parts.find((item) => item.name === partName);
    if (!part) return null;
    const [plate] = part.plate();
    const color = colors[part.colorId];
    return { name: `${slug(spec.name)}-${slug(part.name)}-${slug(color.name)}.stl`, data: stlBytes(plate, part.name) };
  }

  root.Dollhouse = {
    SHELF, BED, MAX_COLORS, PRESETS, catalog, view, validate, customSpec, signature,
    build3mf, buildZip, buildStl, slug, defaultSpec
  };
})(typeof window !== "undefined" ? window : globalThis);
