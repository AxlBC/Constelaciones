import * as THREE from 'three';

/* Textura procedural de nebulosa: ruido fractal (fBm) con distorsión de dominio
   para lograr filamentos y bordes irregulares, atenuado hacia los extremos.
   Es blanca con alfa variable; el color se aplica luego con el material. */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeFbm(rnd) {
  const G = 64;                                   // rejilla periódica de valores
  const grid = new Float32Array(G * G);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();

  const smooth = (t) => t * t * (3 - 2 * t);
  const at = (x, y) => grid[(y & (G - 1)) * G + (x & (G - 1))];

  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = smooth(x - xi), fy = smooth(y - yi);
    const a = at(xi, yi),     b = at(xi + 1, yi);
    const c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  return function fbm(x, y) {
    let sum = 0, amp = 0.5, norm = 0, f = 1;
    for (let o = 0; o < 5; o++) {
      sum += amp * noise(x * f, y * f);
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return sum / norm;                            // ~0..1
  };
}

export function makeNebulaTexture(seed, size = 256) {
  const rnd = mulberry32(seed);
  const fbm = makeFbm(rnd);
  const ox = rnd() * 40, oy = rnd() * 40;         // desplazamiento único por textura
  const freq = 2.6 + rnd() * 1.4;

  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const px = u * freq + ox, py = v * freq + oy;

      // distorsión de dominio: da forma de filamentos y remolinos
      const qx = fbm(px, py);
      const qy = fbm(px + 5.2, py + 1.3);
      const f = fbm(px + 3.0 * (qx - 0.5), py + 3.0 * (qy - 0.5));

      // contraste: zonas densas frente a huecos casi vacíos
      let d = Math.min(1, Math.max(0, (f - 0.40) / 0.36));
      d = Math.pow(d * d * (3 - 2 * d), 1.3);

      // máscara radial con borde irregular: nunca llega a tocar el borde de la textura
      const r = Math.hypot(u - 0.5, v - 0.5) * 2 + (qx - 0.5) * 0.55;
      let m = Math.min(1, Math.max(0, 1 - r));
      m = Math.pow(m, 1.25);

      const a = m * (0.16 + 0.84 * d);

      const k = (y * size + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
      img.data[k + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
