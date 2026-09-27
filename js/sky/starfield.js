import * as THREE from 'three';

export function createStarfield({ world }, { starTex }) {
  const N = Math.round(2600 * 1.20 * 1.15 * 1.15);
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const size = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = 760 + Math.random() * 420;

    pos[i * 3 + 0] = Math.cos(th) * s * r;
    pos[i * 3 + 1] = u * r;
    pos[i * 3 + 2] = Math.sin(th) * s * r;

    const t = Math.random();
    let cr, cg, cb;

    if (t < 0.60) {
      const b = 0.75 + Math.random() * 0.25;
      cr = cg = cb = b;
    } else if (t < 0.80) {
      cr = 1.0; cg = 0.74; cb = 0.90;
    } else if (t < 0.92) {
      cr = 0.76; cg = 0.88; cb = 1.0;
    } else {
      cr = 1.0; cg = 0.95; cb = 0.82;
    }

    col[i * 3 + 0] = cr;
    col[i * 3 + 1] = cg;
    col[i * 3 + 2] = cb;

    // Multiplicador de tamaño: muchas estrellas pequeñas y pocas grandes
    size[i] = 0.5 + Math.pow(Math.random(), 2.5) * 1.9;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

  const mat = new THREE.PointsMaterial({
    size: 8.5,
    map: starTex,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  // PointsMaterial solo admite un tamaño global: se añade un atributo por estrella
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'attribute float aSize;\nvoid main() {')
      .replace('gl_PointSize = size;', 'gl_PointSize = size * aSize;');
  };

  const points = new THREE.Points(geo, mat);
  world.add(points);

  return { points };
}
