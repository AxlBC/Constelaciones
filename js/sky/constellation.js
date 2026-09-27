import * as THREE from 'three';
import { extractStrokeGraph } from './strokeGraph.js';
import { basisFromAngles, placeConstellations } from './placement.js';

/* Constelaciones ocultas: cada string se rasteriza, se convierte en un grafo
   de trazos (estrellas + líneas) y se coloca en un punto aleatorio de la esfera
   sin solaparse con las demás. */
const C_RADIUS = 850;               // distancia al centro
const FONT_PX = 250;                // tamaño de la fuente al rasterizar
const FONT = `bold ${FONT_PX}px "Segoe UI", "Trebuchet MS", Arial, sans-serif`;
const WORLD_PER_PX = 0.38;          // unidades 3D por píxel del raster
const MAX_WIDTH = 520;              // ancho máximo (unidades 3D) para textos largos

/* ---------- Raster + grafo de una cadena (en píxeles) ---------- */
function buildStrokeGraph(text) {
  const pad = 50;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = FONT;
  const W = Math.ceil(measure.measureText(text).width) + pad * 2;
  const H = Math.ceil(FONT_PX * 1.5);

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, H / 2);

  const data = ctx.getImageData(0, 0, W, H).data;
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) mask[i] = data[i * 4] > 128 ? 1 : 0;

  const { stars, links } = extractStrokeGraph(mask, W, H);
  if (!stars.length) return null;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of stars) {
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.y > maxY) maxY = s.y;
  }
  const pxW = Math.max(1, maxX - minX);
  const scale = Math.min(WORLD_PER_PX, MAX_WIDTH / pxW);
  const width = pxW * scale;
  const height = (maxY - minY) * scale;

  return {
    text, stars, links, scale, width, height,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    // radio angular (visto desde el centro) del rectángulo que ocupa
    angularRadius: Math.atan(Math.hypot(width, height) / 2 / C_RADIUS)
  };
}

/* ---------- Objetos 3D de una constelación ya colocada ---------- */
function buildConstellationObject(g, angles, { starTex, sunGlowTex }) {
  const { normal, right, up } = basisFromAngles(angles.yaw, angles.pitch);

  const stars3D = g.stars.map((s) => {
    const ux = (s.x - g.cx) * g.scale;
    const uy = -(s.y - g.cy) * g.scale;
    return normal.clone().multiplyScalar(C_RADIUS)
      .addScaledVector(right, ux)
      .addScaledVector(up, uy);
  });

  /* Puntos */
  const positions = [];
  const colors = [];
  for (const p of stars3D) {
    positions.push(p.x, p.y, p.z);
    const b = 0.88 + Math.random() * 0.12;
    colors.push(b, b * 0.95, b * 0.99);
  }
  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  pointsGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const points = new THREE.Points(pointsGeo, new THREE.PointsMaterial({
    size: 17,
    map: starTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.93,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  }));

  /* Líneas (invisibles hasta que el minijuego las revela) */
  const linePositions = [];
  for (const [i, j] of g.links) {
    const a = stars3D[i], b = stars3D[j];
    linePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffd0e6,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const lines = new THREE.LineSegments(lineGeo, lineMaterial);

  /* Resplandor detrás del texto */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunGlowTex,
    color: 0xff8fc0,
    transparent: true,
    opacity: 0.10,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  glow.position.copy(normal).multiplyScalar(C_RADIUS);
  const glowSize = Math.max(g.width, g.height) * 1.15;
  glow.scale.set(glowSize, glowSize, 1);

  const group = new THREE.Group();
  group.add(points, lines, glow);

  return { text: g.text, group, points, lineMaterial, glow, normal, angles };
}

/* Crea una constelación por cada string, en lugares aleatorios sin solaparse.
   Devuelve [{ text, points, lineMaterial, glow, normal }]. */
export function createConstellations({ world }, tex, texts) {
  const graphs = texts.map(buildStrokeGraph).filter(Boolean);
  const spots = placeConstellations(graphs.map((g) => g.angularRadius));

  const result = [];
  graphs.forEach((g, i) => {
    if (!spots[i]) {
      console.warn(`Constelación "${g.text}": no hay sitio libre en la esfera, se omite.`);
      return;
    }
    const c = buildConstellationObject(g, spots[i], tex);
    world.add(c.group);
    result.push(c);
  });

  return result;
}
