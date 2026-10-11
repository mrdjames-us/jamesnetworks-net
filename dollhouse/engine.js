/* 1:12 dollhouse furniture for the Creality K2.
   Browser copy of the house generator in C:\Users\mrdja\dollhouse.
   A print holds four colors. Units are millimetres, Z up. */
(function (root) {
  const INCH = 25.4 / 12;
  const BED = 260;
  const MAX_COLORS = 4;
  const SHELF = [
    { name: "Yellow", hex: "#E8B10C" },
    { name: "Pink", hex: "#E84A7F" },
    { name: "Red", hex: "#D62222" },
    { name: "Black", hex: "#141414" },
    { name: "Blue", hex: "#1E4D8C" },
    { name: "Green", hex: "#12643C" },
    { name: "Purple", hex: "#4A1C6B" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Gray", hex: "#8E8A84" }
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

  function buildChair(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const seatH = H * 0.50, legR = 2.15, seatT = 3.0, cushT = 2.8, inset = legR + 0.4;
    const bodies = [];
    for (const [cx, cy, top] of [[inset, inset, seatH], [W - inset, inset, seatH], [inset, D - inset, H], [W - inset, D - inset, H]]) {
      bodies.push(leg(cx, cy, 0, top, legR));
    }
    const seat = box(legR, legR, seatH - seatT, W - 2 * legR, D - 2 * legR, seatT);
    bodies.push(flat(seat, panelFlat(W - 2 * legR, D - 2 * legR, seatT)));
    const splatT = 2.4;
    const splatY = (D - inset + legR) - splatT - 0.3;
    const splatW = Math.max(2.0, W - 2 * inset);
    const splatH = Math.max(2.0, H - seatH - 3.2);
    const splat = box(inset, splatY, seatH, splatW, splatT, splatH);
    bodies.push(flat(splat, panelFlat(splatW, splatH, splatT)));
    const railH = 3.0;
    const rail = box(inset, splatY, H - railH, splatW, splatT, railH);
    bodies.push(flat(rail, panelFlat(splatW, railH, splatT)));
    const x0 = inset + legR + 0.5, y0 = inset + legR + 0.5;
    const x1 = W - inset - legR - 0.5, y1 = D - inset - legR - 0.5;
    const cw = Math.max(2.0, x1 - x0), cd = Math.max(2.0, y1 - y0);
    const cush = box(x0, y0, seatH, cw, cd, cushT);
    return [
      new Part("Frame", colors.Frame, bodies),
      new Part("Cushion", colors.Cushion, [flat(cush, panelFlat(cw, cd, cushT))])
    ];
  }

  function buildSofa(wIn, dIn, hIn, colors, cushions = 3) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const legH = Math.min(8.0, H * 0.14);
    const armT = Math.max(7.0, W * 0.09);
    const backT = Math.max(7.0, D * 0.18);
    const seatZ = H * 0.46;
    const armH = H * 0.78;
    const legs = [];
    const inset = 6.0;
    for (const [cx, cy] of [[inset, inset], [W - inset, inset], [inset, D - inset], [W - inset, D - inset]]) {
      const foot = frustum(cx, cy, 0, legH * 0.35, 2.4, 2.4, 14);
      const ankle = frustum(cx, cy, legH * 0.35, legH, 1.7, 2.2, 14);
      legs.push(upright(foot.merge(ankle)));
    }
    const plinth = box(0, 0, legH, W, D, seatZ - legH);
    const armHgt = Math.max(2.4, armH - seatZ);
    const backHgt = Math.max(2.4, H - seatZ);
    const armL = box(0, 0, seatZ, armT, D, armHgt);
    const armR = box(W - armT, 0, seatZ, armT, D, armHgt);
    const back = box(armT, D - backT, seatZ, W - 2 * armT, backT, backHgt);
    const body = [
      flat(plinth, panelFlat(W, D, seatZ - legH)),
      flat(armL, panelFlat(armT, D, armHgt)),
      flat(armR, panelFlat(armT, D, armHgt)),
      flat(back, panelFlat(W - 2 * armT, backHgt, backT))
    ];
    const n = W > 80 ? cushions : 1;
    const gap = 1.4;
    const innerW = W - 2 * armT - 1.6;
    const cw = (innerW - gap * (n - 1)) / n;
    const cushT = Math.min(7.5, (H - seatZ) * 0.42);
    const backCH = H - seatZ - cushT - 1.2;
    const cushionsBodies = [];
    for (let i = 0; i < n; i++) {
      const x = armT + 0.8 + i * (cw + gap);
      const seatC = box(x, 1.0, seatZ, cw, D - backT - 2.2, cushT);
      cushionsBodies.push(flat(seatC, panelFlat(cw, D - backT - 2.2, cushT)));
      if (backCH > 4) {
        const backC = box(x, D - backT - 2.8, seatZ + cushT, cw, 2.4, backCH);
        cushionsBodies.push(flat(backC, panelFlat(cw, backCH, 2.4)));
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
    const legH = Math.min(6.0, H * 0.28);
    const cushT = Math.max(4.0, H * 0.32);
    const baseH = H - legH - cushT;
    const legs = [];
    const inset = 5.0;
    for (const [cx, cy] of [[inset, inset], [W - inset, inset], [inset, D - inset], [W - inset, D - inset]]) {
      legs.push(leg(cx, cy, 0, legH, 2.0));
    }
    const base = box(0, 0, legH, W, D, baseH);
    const cush = box(1.2, 1.2, legH + baseH, W - 2.4, D - 2.4, cushT);
    return [
      new Part("Body", colors.Body, [flat(base, panelFlat(W, D, baseH))]),
      new Part("Cushion", colors.Cushion, [flat(cush, panelFlat(W - 2.4, D - 2.4, cushT))]),
      new Part("Legs", colors.Legs, legs)
    ];
  }

  function buildTable(wIn, dIn, hIn, colors, shelf = false) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const topT = 3.2;
    const apronH = Math.max(6.5, Math.min(12.0, H * 0.22));
    const apronT = 2.8;
    const legR = Math.max(2.15, Math.min(W, D) * 0.045);
    const inset = legR + 2.0;
    const legH = H - topT;
    const zApron = legH - apronH;
    const legs = [];
    for (const [cx, cy] of [[inset, inset], [W - inset, inset], [W - inset, D - inset], [inset, D - inset]]) {
      legs.push(leg(cx, cy, 0, zApron + 0.2, legR));
    }
    const apron = new Mesh();
    const spanX = W - 2 * inset, spanY = D - 2 * inset;
    apron.merge(box(inset, inset, zApron, spanX, apronT, apronH));
    apron.merge(box(inset, D - inset - apronT, zApron, spanX, apronT, apronH));
    apron.merge(box(inset, inset, zApron, apronT, spanY, apronH));
    apron.merge(box(W - inset - apronT, inset, zApron, apronT, spanY, apronH));
    const top = box(0, 0, legH, W, D, topT);
    const parts = [
      new Part("Top", colors.Top, [flat(top, panelFlat(W, D, topT))]),
      new Part("Base", colors.Base, legs.concat([flat(apron, dropToBed(apron.copy()))]))
    ];
    if (shelf) {
      const shelfT = 2.6;
      const shelfZ = Math.max(4.0, legH * 0.28);
      const gap = legR + 0.6;
      const sw = W - 2 * (inset + gap);
      const sd = D - 2 * (inset + gap);
      if (sw > 2 && sd > 2 && shelfZ + shelfT < zApron - 0.4) {
        const slab = box(inset + gap, inset + gap, shelfZ, sw, sd, shelfT);
        parts.push(new Part("Shelf", colors.Shelf || colors.Top, [flat(slab, panelFlat(sw, sd, shelfT))]));
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

  function buildDrawers(wIn, dIn, hIn, colors, drawers) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    return [new Part("Case", colors.Case, carcass(W, D, H))].concat(
      drawerStack(W, D, H, drawers, colors.Fronts, colors.Knobs)
    );
  }

  function buildWardrobe(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const wall = 2.6;
    const doorT = 2.2, gap = 1.0;
    const dw = (W - 2 * wall - gap - 1.6) / 2;
    const dh = H - 2 * wall - 1.6;
    const x1 = wall + 0.8, x2 = x1 + dw + gap, z = wall + 0.8;
    return [
      new Part("Case", colors.Case, carcass(W, D, H, wall)),
      new Part("Doors", colors.Doors, [
        flat(box(x1, 0, z, dw, doorT, dh), panelFlat(dw, dh, doorT)),
        flat(box(x2, 0, z, dw, doorT, dh), panelFlat(dw, dh, doorT))
      ]),
      new Part("Knobs", colors.Knobs, [
        upright(cylinderY(x1 + dw - 3.2, -1.8, 0, z + dh * 0.55, 1.15, 14)),
        upright(cylinderY(x2 + 3.2, -1.8, 0, z + dh * 0.55, 1.15, 14))
      ])
    ];
  }

  function buildBookcase(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const wall = 2.6;
    const n = Math.max(2, pyRound(hIn / 12) - 1);
    const innerH = H - 2 * wall;
    const step = innerH / (n + 1);
    const thick = 2.2, sw = W - 2 * wall, sd = D - wall - 2.0;
    const shelves = [];
    for (let i = 1; i <= n; i++) {
      const z = wall + step * i - thick / 2;
      shelves.push(flat(box(wall, 0, z, sw, sd, thick), panelFlat(sw, sd, thick)));
    }
    return [
      new Part("Case", colors.Case, carcass(W, D, H, wall)),
      new Part("Shelves", colors.Shelves, shelves)
    ];
  }

  function buildBed(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const post = 4.2, boardT = 3.2;
    const railH = Math.max(8.0, H * 0.16), railT = 3.0;
    const mattressT = Math.max(6.0, Math.min(14.0, mm(6)));
    const mattressZ = railH;
    const footH = Math.max(railH + 6.0, H * 0.46);
    const head = box(0, D - boardT, 0, W, boardT, H);
    head.merge(box(0, D - boardT - 0.8, 0, post, boardT + 0.8, H));
    head.merge(box(W - post, D - boardT - 0.8, 0, post, boardT + 0.8, H));
    const foot = box(0, 0, 0, W, boardT, footH);
    foot.merge(box(0, 0, 0, post, boardT + 0.6, footH));
    foot.merge(box(W - post, 0, 0, post, boardT + 0.6, footH));
    const railReach = post + 1.4;
    const railL = box(0, boardT, mattressZ - railH, railReach, D - boardT * 2, railH);
    const railR = box(W - railReach, boardT, mattressZ - railH, railReach, D - boardT * 2, railH);
    const mattress = box(post + 0.5, boardT + 1.1, mattressZ, W - 2 * post - 1.0, D - 2 * boardT - 2.2, mattressT);
    const pillowH = Math.min(8.0, mattressT);
    const pillowD = Math.min(18.0, (D - 2 * boardT) * 0.28);
    const gap = 1.6;
    const pw = (W - 2 * post - gap - 3) / 2;
    const pillows = [
      box(post + 1.2, D - boardT - pillowD - 1.0, mattressZ + mattressT, pw, pillowD, pillowH),
      box(post + 1.2 + pw + gap, D - boardT - pillowD - 1.0, mattressZ + mattressT, pw, pillowD, pillowH)
    ];
    const [mw, md] = mattress.size();
    return [
      new Part("Frame", colors.Frame, [
        flat(head, panelFlat(W, H, boardT + 0.8)),
        flat(foot, panelFlat(W, footH, boardT + 0.6)),
        flat(railL, panelFlat(D - boardT * 2, railH, railT)),
        flat(railR, panelFlat(D - boardT * 2, railH, railT))
      ]),
      new Part("Mattress", colors.Mattress, [flat(mattress, panelFlat(mw, md, mattressT))]),
      new Part("Pillows", colors.Pillows, [
        flat(pillows[0], panelFlat(pw, pillowD, pillowH)),
        flat(pillows[1], panelFlat(pw, pillowD, pillowH))
      ])
    ];
  }

  function buildBench(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const padT = Math.max(2.6, H * 0.16), seatT = 3.2;
    const legH = H - padT - seatT, legR = 2.15, inset = legR + 2.0;
    const legs = [[inset, inset], [W - inset, inset], [W - inset, D - inset], [inset, D - inset]]
      .map(([cx, cy]) => leg(cx, cy, 0, legH, legR));
    const stretcher = box(inset, D / 2 - 1.3, legH * 0.28, W - 2 * inset, 2.6, 2.4);
    const seat = box(0, 0, legH, W, D, seatT);
    const pad = box(1.4, 1.4, legH + seatT, W - 2.8, D - 2.8, padT);
    return [
      new Part("Frame", colors.Frame, legs.concat([
        flat(stretcher, panelFlat(W - 2 * inset, 2.6, 2.4)),
        flat(seat, panelFlat(W, D, seatT))
      ])),
      new Part("Pad", colors.Pad, [flat(pad, panelFlat(W - 2.8, D - 2.8, padT))])
    ];
  }

  function buildStool(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    const padT = 2.6, seatT = 3.2, seatH = H - padT;
    const r = Math.min(W, D) / 2, legR = 2.05, inset = r * 0.62, cx = r, cy = r;
    const legs = [];
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      legs.push(leg(cx + sx * inset, cy + sy * inset, 0, seatH - seatT + 0.2, legR));
    }
    const seat = cylinder(cx, cy, seatH - seatT, seatH, r * 0.98, 24);
    const pad = cylinder(cx, cy, seatH, H, r * 0.86, 24);
    return [
      new Part("Seat", colors.Seat, legs.concat([upright(seat)])),
      new Part("Pad", colors.Pad, [upright(pad)])
    ];
  }

  function buildLamp(wIn, dIn, hIn, colors) {
    const H = mm(hIn);
    const foot = Math.min(mm(wIn), mm(dIn)) / 2;
    const cx = foot;
    const baseH = Math.max(4.0, H * 0.06);
    const stemTop = H * 0.62;
    const shadeH = H - stemTop;
    const shadeR0 = foot * 1.05, shadeR1 = shadeR0 * 0.62;
    const base = frustum(cx, cx, 0, baseH, foot * 0.72, foot * 0.46, 24);
    const stem = frustum(cx, cx, baseH, stemTop, 1.8, 1.5, 16);
    const shadeA = frustumShell(cx, cx, stemTop, H, shadeR0, shadeR1, 1.6, 28);
    const shadeP = frustumShell(0, 0, 0, shadeH, shadeR0, shadeR1, 1.6, 28);
    return [
      new Part("Base", colors.Base, [upright(base.merge(stem))]),
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
    const post = 4.6, sideH = H * 0.62, footH = H * 0.72;
    const mattressT = Math.max(5.0, Math.min(10.0, mm(4)));
    const mattressZ = 8.0;
    const posts = [];
    for (const [cx, cy, top] of [[post / 2, post / 2, footH], [W - post / 2, post / 2, footH], [post / 2, D - post / 2, H], [W - post / 2, D - post / 2, H]]) {
      posts.push(upright(box(cx - post / 2, cy - post / 2, 0, post, post, top)));
    }
    const head = slatPanel(W - 2 * post, H - 6, 2.4, "x");
    head.assembly.translate(post, D - post - 2.4, 4);
    const foot = slatPanel(W - 2 * post, footH - 6, 2.4, "x");
    foot.assembly.translate(post, post, 4);
    const sideA = slatPanel(D - 2 * post, sideH - 4, 2.4, "y");
    sideA.assembly.translate(post, post, 4);
    const sideB = slatPanel(D - 2 * post, sideH - 4, 2.4, "y");
    sideB.assembly.translate(W - post - 2.4, post, 4);
    const lip = post + 2.8;
    const mattress = box(lip, lip, mattressZ, Math.max(4.0, W - 2 * lip), Math.max(4.0, D - 2 * lip), mattressT);
    const [mw, md] = mattress.size();
    return [
      new Part("Frame", colors.Frame, posts.concat([head, foot, sideA, sideB])),
      new Part("Mattress", colors.Mattress, [flat(mattress, panelFlat(mw, md, mattressT))])
    ];
  }

  function buildVanity(wIn, dIn, hIn, colors) {
    const W = mm(wIn), D = mm(dIn), H = mm(hIn);
    let caseH = Math.min(H * 0.48, mm(30));
    if (caseH > H - 20) caseH = H * 0.55;
    const drawers = drawerStack(W, D, caseH, 1, colors.Drawer, colors.Knob, 2.6, "Drawer", "Knob");
    const mirrorH = H - caseH, frameT = 3.0, lip = 3.2, glassT = 1.6, my = D - frameT;
    const frame = new Mesh();
    frame.merge(box(0, my, caseH, W, frameT, mirrorH));
    const glass = box(lip, my - glassT, caseH + lip, W - 2 * lip, glassT, mirrorH - 2 * lip);
    return [
      new Part("Case", colors.Case, carcass(W, D, caseH)),
      drawers[0],
      drawers[1],
      new Part("Mirror", colors.Mirror, [
        flat(frame, panelFlat(W, mirrorH, frameT)),
        flat(glass, panelFlat(W - 2 * lip, mirrorH - 2 * lip, glassT))
      ])
    ];
  }

  const BUILDERS = {
    chair: buildChair, sofa: buildSofa, ottoman: buildOttoman, table: buildTable,
    drawers: buildDrawers, wardrobe: buildWardrobe, bookcase: buildBookcase, bed: buildBed,
    bench: buildBench, stool: buildStool, lamp: buildLamp, crib: buildCrib, vanity: buildVanity
  };
  const KIND_INFO = {
    chair: { label: "Side chair", parts: ["Frame", "Cushion"], blurb: "Print one for a desk, four for the dining table." },
    sofa: { label: "Sofa", parts: ["Body", "Cushions", "Legs"], blurb: "Arms, back, and plinth glue up around the cushions." },
    ottoman: { label: "Ottoman", parts: ["Body", "Cushion", "Legs"], blurb: "The cushion drops onto the plinth." },
    table: { label: "Table", parts: ["Top", "Base"], blurb: "The apron is a flat frame. Glue the legs into the corners, then the top on." },
    drawers: { label: "Chest of drawers", parts: ["Case", "Fronts", "Knobs"], blurb: "Print the case on its back. Glue the fronts and knobs on after." },
    wardrobe: { label: "Wardrobe", parts: ["Case", "Doors", "Knobs"], blurb: "Print the case on its back. The doors are flat panels." },
    bookcase: { label: "Bookcase", parts: ["Case", "Shelves"], blurb: "Print the case on its back and slide the shelves in." },
    bed: { label: "Bed", parts: ["Frame", "Mattress", "Pillows"], blurb: "Headboard, footboard, and rails glue into a frame. Mattress drops in." },
    bench: { label: "Bench", parts: ["Frame", "Pad"], blurb: "A stretcher ties the legs. The pad sits on the seat." },
    stool: { label: "Stool", parts: ["Seat", "Pad"], blurb: "Round seat, four legs, a pad on top." },
    lamp: { label: "Floor lamp", parts: ["Base", "Shade"], blurb: "The shade is a thin shell. Wide end on the bed, then drop it onto the stem." },
    crib: { label: "Crib", parts: ["Frame", "Mattress"], blurb: "Slat panels are printed flat. Glue them between the posts." },
    vanity: { label: "Vanity", parts: ["Case", "Drawer", "Knob", "Mirror"], blurb: "The mirror stands on the back edge of the case." }
  };

  function chips(pairs) {
    return pairs.map(([id, name]) => ({ id, name, hex: SHELF_HEX[name] }));
  }

  const PRESETS = [
    { id: "side-chair", kind: "chair", name: "Side chair", room: "Dining", w: 18, d: 16, h: 36, colors: chips([["frame", "Gray"], ["cushion", "Pink"]]), partColors: { Frame: "frame", Cushion: "cushion" } },
    { id: "dining-table", kind: "table", name: "Dining table", room: "Dining", w: 60, d: 36, h: 30, shelf: false, colors: chips([["top", "Gray"], ["base", "Black"]]), partColors: { Top: "top", Base: "base" } },
    { id: "sideboard", kind: "drawers", name: "Sideboard", room: "Dining", w: 54, d: 18, h: 34, drawers: 3, colors: chips([["case", "Black"], ["fronts", "Gray"], ["knobs", "Yellow"]]), partColors: { Case: "case", Fronts: "fronts", Knobs: "knobs" } },
    { id: "armchair", kind: "sofa", name: "Armchair", room: "Parlor", w: 32, d: 34, h: 36, colors: chips([["body", "Red"], ["cushions", "White"], ["legs", "Black"]]), partColors: { Body: "body", Cushions: "cushions", Legs: "legs" } },
    { id: "sofa", kind: "sofa", name: "Sofa", room: "Parlor", w: 84, d: 36, h: 34, colors: chips([["body", "Green"], ["cushions", "White"], ["legs", "Black"]]), partColors: { Body: "body", Cushions: "cushions", Legs: "legs" } },
    { id: "ottoman", kind: "ottoman", name: "Ottoman", room: "Parlor", w: 24, d: 18, h: 17, colors: chips([["body", "Green"], ["cushion", "White"], ["legs", "Black"]]), partColors: { Body: "body", Cushion: "cushion", Legs: "legs" } },
    { id: "coffee-table", kind: "table", name: "Coffee table", room: "Parlor", w: 48, d: 24, h: 17, shelf: true, colors: chips([["top", "Gray"], ["base", "Black"], ["shelf", "White"]]), partColors: { Top: "top", Base: "base", Shelf: "shelf" } },
    { id: "end-table", kind: "table", name: "End table", room: "Parlor", w: 18, d: 18, h: 24, shelf: true, colors: chips([["top", "Gray"], ["base", "Black"], ["shelf", "White"]]), partColors: { Top: "top", Base: "base", Shelf: "shelf" } },
    { id: "bookcase", kind: "bookcase", name: "Bookcase", room: "Parlor", w: 36, d: 12, h: 72, colors: chips([["case", "Gray"], ["shelves", "White"]]), partColors: { Case: "case", Shelves: "shelves" } },
    { id: "floor-lamp", kind: "lamp", name: "Floor lamp", room: "Parlor", w: 12, d: 12, h: 58, colors: chips([["base", "Yellow"], ["shade", "White"]]), partColors: { Base: "base", Shade: "shade" } },
    { id: "bed", kind: "bed", name: "Bed", room: "Bedroom", w: 54, d: 75, h: 48, colors: chips([["frame", "White"], ["mattress", "Blue"], ["pillows", "Pink"]]), partColors: { Frame: "frame", Mattress: "mattress", Pillows: "pillows" } },
    { id: "nightstand", kind: "drawers", name: "Nightstand", room: "Bedroom", w: 18, d: 16, h: 26, drawers: 2, colors: chips([["case", "White"], ["fronts", "Gray"], ["knobs", "Yellow"]]), partColors: { Case: "case", Fronts: "fronts", Knobs: "knobs" } },
    { id: "dresser", kind: "drawers", name: "Dresser", room: "Bedroom", w: 48, d: 20, h: 34, drawers: 3, colors: chips([["case", "White"], ["fronts", "Gray"], ["knobs", "Yellow"]]), partColors: { Case: "case", Fronts: "fronts", Knobs: "knobs" } },
    { id: "wardrobe", kind: "wardrobe", name: "Wardrobe", room: "Bedroom", w: 42, d: 22, h: 72, colors: chips([["case", "White"], ["doors", "Gray"], ["knobs", "Yellow"]]), partColors: { Case: "case", Doors: "doors", Knobs: "knobs" } },
    { id: "bench", kind: "bench", name: "Bench", room: "Bedroom", w: 48, d: 16, h: 18, colors: chips([["frame", "Gray"], ["pad", "Red"]]), partColors: { Frame: "frame", Pad: "pad" } },
    { id: "vanity", kind: "vanity", name: "Vanity", room: "Bedroom", w: 36, d: 18, h: 56, colors: chips([["case", "White"], ["drawer", "Pink"], ["knob", "Yellow"], ["mirror", "Blue"]]), partColors: { Case: "case", Drawer: "drawer", Knob: "knob", Mirror: "mirror" } },
    { id: "crib", kind: "crib", name: "Crib", room: "Bedroom", w: 30, d: 54, h: 40, colors: chips([["frame", "White"], ["mattress", "Green"]]), partColors: { Frame: "frame", Mattress: "mattress" } },
    { id: "kitchen-table", kind: "table", name: "Kitchen table", room: "Kitchen", w: 42, d: 28, h: 30, shelf: false, colors: chips([["top", "Gray"], ["base", "Black"]]), partColors: { Top: "top", Base: "base" } },
    { id: "stool", kind: "stool", name: "Stool", room: "Kitchen", w: 14, d: 14, h: 24, colors: chips([["seat", "Gray"], ["pad", "Red"]]), partColors: { Seat: "seat", Pad: "pad" } }
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
