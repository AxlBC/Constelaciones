import * as THREE from 'three';

function makeRadialTexture(stops, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [pos, col] of stops) g.addColorStop(pos, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* Cola de cometa: degradado horizontal + recorte vertical.
   La parte opaca va a la IZQUIERDA (junto a la cabeza). */
function makeCometTailTexture() {
  const W = 256, H = 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  const gx = ctx.createLinearGradient(0, 0, W, 0);
  gx.addColorStop(0.00, 'rgba(255,255,255,0.95)');
  gx.addColorStop(0.30, 'rgba(255,255,255,0.55)');
  gx.addColorStop(0.70, 'rgba(255,255,255,0.15)');
  gx.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = gx;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'destination-in';
  const gy = ctx.createLinearGradient(0, 0, 0, H);
  gy.addColorStop(0.00, 'rgba(0,0,0,0)');
  gy.addColorStop(0.50, 'rgba(0,0,0,1)');
  gy.addColorStop(1.00, 'rgba(0,0,0,0)');
  ctx.fillStyle = gy;
  ctx.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTextures() {
  const starTex = makeRadialTexture([
    [0.00, 'rgba(255,255,255,1)'],
    [0.18, 'rgba(255,255,255,1)'],
    [0.38, 'rgba(255,255,255,0.55)'],
    [0.62, 'rgba(255,255,255,0.16)'],
    [1.00, 'rgba(255,255,255,0)']
  ], 128);

  const sunGlowTex = makeRadialTexture([
    [0.00, 'rgba(255,255,255,1)'],
    [0.10, 'rgba(255,225,238,0.92)'],
    [0.28, 'rgba(255,110,160,0.55)'],
    [0.58, 'rgba(255,60,120,0.16)'],
    [1.00, 'rgba(255,40,100,0)']
  ], 256);

  const cometHeadTex = makeRadialTexture([
    [0.00, 'rgba(255,255,255,1)'],
    [0.25, 'rgba(255,255,255,0.85)'],
    [0.50, 'rgba(255,255,255,0.30)'],
    [0.78, 'rgba(255,255,255,0.06)'],
    [1.00, 'rgba(255,255,255,0)']
  ], 128);

  const cometTailTex = makeCometTailTexture();

  return { starTex, sunGlowTex, cometHeadTex, cometTailTex };
}
