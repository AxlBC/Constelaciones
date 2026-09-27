/* Convierte una máscara binaria (texto rasterizado) en un grafo de trazos:
   estrellas (vértices) y líneas (aristas) que siguen el eje central de cada letra.

   Pasos:
     1. Adelgazado (Zhang-Suen) → esqueleto de 1 píxel de grosor.
     2. Nodos = extremos y cruces del esqueleto (agrupados si son contiguos).
     3. Aristas = cadenas de píxeles entre nodos (y ciclos sueltos, p. ej. la "o").
     4. Se podan las "espuelas" cortas que deja el adelgazado en los cruces.
     5. Se simplifica cada cadena (Douglas-Peucker) y se subdivide para que las
        estrellas queden separadas de forma regular a lo largo del trazo.

   Devuelve { stars: [{x, y}], links: [[i, j]] } en coordenadas de píxel. */

/* ---------- 1) Adelgazado Zhang-Suen ---------- */
function thin(img, W, H) {
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (img[y * W + x]) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  x0 = Math.max(1, x0); x1 = Math.min(W - 2, x1);
  y0 = Math.max(1, y0); y1 = Math.min(H - 2, y1);

  const toDelete = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      toDelete.length = 0;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = y * W + x;
          if (!img[i]) continue;
          const p2 = img[i - W], p3 = img[i - W + 1], p4 = img[i + 1], p5 = img[i + W + 1];
          const p6 = img[i + W], p7 = img[i + W - 1], p8 = img[i - 1], p9 = img[i - W - 1];
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;
          const A = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6)
                  + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
          if (A !== 1) continue;
          if (step === 0) {
            if (p2 * p4 * p6 || p4 * p6 * p8) continue;
          } else {
            if (p2 * p4 * p8 || p2 * p6 * p8) continue;
          }
          toDelete.push(i);
        }
      }
      for (const i of toDelete) img[i] = 0;
      if (toDelete.length) changed = true;
    }
  }
}

/* ---------- utilidades geométricas ---------- */
function distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function simplify(pts, eps) {
  const n = pts.length;
  if (n <= 2) return pts.slice();
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = distToSegment(pts[i], pts[s], pts[e]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx >= 0 && maxD > eps) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

function polyLength(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) {
    l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return l;
}

/* ---------- función principal ---------- */
export function extractStrokeGraph(mask, W, H, opts = {}) {
  const {
    epsilon = 4,        // tolerancia de simplificación (px)
    maxSpacing = 80,    // separación máxima entre estrellas de un mismo trazo (px)
    spur = 26,          // las ramas terminales más cortas que esto se podan (px)
    extend = 0.7,       // fracción de medio grosor que se prolonga en los extremos
    minGap = 22         // estrellas más cercanas que esto se fusionan (px)
  } = opts;

  const img = new Uint8Array(mask);
  let inkPixels = 0;
  for (let i = 0; i < img.length; i++) if (img[i]) inkPixels++;

  /* Bordes a cero para poder mirar vecinos sin comprobar límites */
  for (let x = 0; x < W; x++) { img[x] = 0; img[(H - 1) * W + x] = 0; }
  for (let y = 0; y < H; y++) { img[y * W] = 0; img[y * W + W - 1] = 0; }

  thin(img, W, H);

  const OFF = [-W - 1, -W, -W + 1, 1, W + 1, W, W - 1, -1];
  const skelPixels = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) if (img[y * W + x]) skelPixels.push(y * W + x);
  }
  if (!skelPixels.length) return { stars: [], links: [] };

  const strokeWidth = inkPixels / skelPixels.length;

  /* ---------- 2) Nodos: extremos (grado 1), cruces (grado >= 3) y puntos aislados ---------- */
  const isNode = new Uint8Array(W * H);
  for (const i of skelPixels) {
    let d = 0;
    for (const o of OFF) if (img[i + o]) d++;
    if (d !== 2) isNode[i] = 1;
  }

  const cid = new Int32Array(W * H).fill(-1);
  const clusters = [];
  for (const i of skelPixels) {
    if (!isNode[i] || cid[i] >= 0) continue;
    const id = clusters.length;
    const px = [];
    const stack = [i];
    cid[i] = id;
    while (stack.length) {
      const p = stack.pop();
      px.push(p);
      for (const o of OFF) {
        const n = p + o;
        if (isNode[n] && cid[n] < 0) { cid[n] = id; stack.push(n); }
      }
    }
    let sx = 0, sy = 0;
    for (const p of px) { sx += p % W; sy += (p / W) | 0; }
    clusters.push({ x: sx / px.length, y: sy / px.length });
  }

  /* ---------- 3) Aristas: cadenas de píxeles entre nodos ---------- */
  const toPt = (p) => ({ x: p % W, y: (p / W) | 0 });
  const visited = new Uint8Array(W * H);
  let edges = [];

  function walk(first, from) {
    const chain = [first];
    visited[first] = 1;
    let cur = first;
    let endCluster = -1;
    for (;;) {
      let next = -1, endC = -1;
      for (const o of OFF) {
        const n = cur + o;
        if (!img[n]) continue;
        if (cid[n] >= 0) {
          if (cid[n] !== from || chain.length >= 3) endC = cid[n];
          continue;
        }
        if (!visited[n] && next < 0) next = n;
      }
      if (endC >= 0) { endCluster = endC; break; }
      if (next < 0) break;
      visited[next] = 1;
      chain.push(next);
      cur = next;
    }
    return { chain, endCluster };
  }

  for (const i of skelPixels) {
    if (cid[i] < 0) continue;
    for (const o of OFF) {
      const n = i + o;
      if (!img[n] || cid[n] >= 0 || visited[n]) continue;
      const { chain, endCluster } = walk(n, cid[i]);
      if (endCluster < 0) continue;                       // callejón sin salida: se descarta
      const a = cid[i], b = endCluster;
      if (a === b && chain.length < 8) continue;          // bucle diminuto: ruido del adelgazado
      edges.push({
        a, b,
        pts: [clusters[a], ...chain.map(toPt), clusters[b]]
      });
    }
  }

  /* Ciclos sin nodos (p. ej. el aro de una "o") */
  for (const i of skelPixels) {
    if (cid[i] >= 0 || visited[i]) continue;
    const chain = [i];
    visited[i] = 1;
    let cur = i;
    for (;;) {
      let next = -1;
      for (const o of OFF) {
        const n = cur + o;
        if (img[n] && cid[n] < 0 && !visited[n]) { next = n; break; }
      }
      if (next < 0) break;
      visited[next] = 1;
      chain.push(next);
      cur = next;
    }
    if (chain.length < 8) continue;
    const pts = chain.map(toPt);
    pts.push(pts[0]);
    edges.push({ a: -1, b: -1, pts });
  }

  /* ---------- 4) Poda de espuelas ---------- */
  const degree = new Array(clusters.length).fill(0);
  for (const e of edges) {
    if (e.a >= 0) degree[e.a]++;
    if (e.b >= 0) degree[e.b]++;
  }
  const isolated = clusters.map((_, c) => degree[c] === 0);   // puntos sueltos (p. ej. punto de la "i")
  const snap = degree.slice();

  edges = edges.filter((e) => {
    if (e.a < 0 || e.a === e.b) return true;
    const spurA = snap[e.a] === 1 && snap[e.b] >= 3;
    const spurB = snap[e.b] === 1 && snap[e.a] >= 3;
    return !((spurA || spurB) && polyLength(e.pts) < spur);
  });

  /* Fusión de nodos de grado 2: dejan de ser vértices y las dos aristas se unen */
  for (let guard = 0; guard < 1000; guard++) {
    const inc = new Map();
    edges.forEach((e, k) => {
      if (e.a >= 0) (inc.get(e.a) || inc.set(e.a, []).get(e.a)).push({ k, end: 'a' });
      if (e.b >= 0) (inc.get(e.b) || inc.set(e.b, []).get(e.b)).push({ k, end: 'b' });
    });
    let did = false;
    for (const [c, list] of inc) {
      if (list.length !== 2 || list[0].k === list[1].k) continue;
      const e1 = edges[list[0].k], e2 = edges[list[1].k];
      // e1 debe terminar en c y e2 empezar en c
      const p1 = list[0].end === 'b' ? e1 : { a: e1.b, b: e1.a, pts: e1.pts.slice().reverse() };
      const p2 = list[1].end === 'a' ? e2 : { a: e2.b, b: e2.a, pts: e2.pts.slice().reverse() };
      const merged = { a: p1.a, b: p2.b, pts: [...p1.pts, ...p2.pts.slice(1)] };
      edges = edges.filter((_, k) => k !== list[0].k && k !== list[1].k);
      edges.push(merged);
      did = true;
      break;
    }
    if (!did) break;
  }

  /* Grado final de cada nodo (para prolongar los extremos) */
  const finalDeg = new Array(clusters.length).fill(0);
  for (const e of edges) {
    if (e.a >= 0) finalDeg[e.a]++;
    if (e.b >= 0) finalDeg[e.b]++;
  }

  /* Los extremos libres se retraen ~medio grosor con el adelgazado: se compensa */
  const ext = (strokeWidth / 2) * extend;
  function extendEnd(pts, atStart) {
    const tip = atStart ? pts[0] : pts[pts.length - 1];
    let ref = null, acc = 0;
    for (let k = 1; k < pts.length; k++) {
      const q = atStart ? pts[k] : pts[pts.length - 1 - k];
      acc += Math.hypot(q.x - tip.x, q.y - tip.y);
      if (acc >= 6) { ref = q; break; }
      ref = q;
    }
    if (!ref) return;
    const dx = tip.x - ref.x, dy = tip.y - ref.y;
    const l = Math.hypot(dx, dy);
    if (l < 1e-6) return;
    const moved = { x: tip.x + (dx / l) * ext, y: tip.y + (dy / l) * ext };
    if (atStart) pts[0] = moved; else pts[pts.length - 1] = moved;
  }
  for (const e of edges) {
    if (e.a >= 0 && finalDeg[e.a] === 1) extendEnd(e.pts, true);
    if (e.b >= 0 && finalDeg[e.b] === 1) extendEnd(e.pts, false);
  }

  /* ---------- 5) Estrellas y líneas ---------- */
  const stars = [];
  const links = [];
  const nodeStar = new Map();
  const starOfNode = (c, pt) => {
    if (!nodeStar.has(c)) { nodeStar.set(c, stars.length); stars.push({ x: pt.x, y: pt.y }); }
    return nodeStar.get(c);
  };

  for (const e of edges) {
    let verts = simplify(e.pts, epsilon);

    // subdividir tramos largos para repartir estrellas
    const dense = [verts[0]];
    for (let k = 1; k < verts.length; k++) {
      const a = verts[k - 1], b = verts[k];
      const parts = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / maxSpacing));
      for (let s = 1; s <= parts; s++) {
        const t = s / parts;
        dense.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    verts = dense;

    const ids = verts.map((v, k) => {
      if (k === 0 && e.a >= 0) return starOfNode(e.a, v);
      if (k === verts.length - 1 && e.b >= 0) return starOfNode(e.b, v);
      stars.push({ x: v.x, y: v.y });
      return stars.length - 1;
    });
    if (e.a < 0) ids[ids.length - 1] = ids[0];   // ciclo cerrado

    for (let k = 1; k < ids.length; k++) {
      if (ids[k] !== ids[k - 1]) links.push([ids[k - 1], ids[k]]);
    }
  }

  /* Puntos sueltos (punto de la "i", etc.) */
  clusters.forEach((c, k) => {
    if (isolated[k]) starOfNode(k, c);
  });

  return mergeCloseStars(stars, links, minGap);
}

/* Fusiona estrellas demasiado cercanas (típico en cruces y ápices)
   y descarta las líneas que quedan repetidas o de longitud cero. */
function mergeCloseStars(stars, links, minGap) {
  const groups = [];
  const groupOf = stars.map((s) => {
    for (let g = 0; g < groups.length; g++) {
      if (Math.hypot(groups[g].x - s.x, groups[g].y - s.y) < minGap) {
        const gr = groups[g];
        gr.sx += s.x; gr.sy += s.y; gr.n++;
        gr.x = gr.sx / gr.n; gr.y = gr.sy / gr.n;
        return g;
      }
    }
    groups.push({ x: s.x, y: s.y, sx: s.x, sy: s.y, n: 1 });
    return groups.length - 1;
  });

  const seen = new Set();
  const outLinks = [];
  for (const [i, j] of links) {
    const a = groupOf[i], b = groupOf[j];
    if (a === b) continue;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    outLinks.push([a, b]);
  }
  return { stars: groups.map((g) => ({ x: g.x, y: g.y })), links: outLinks };
}
