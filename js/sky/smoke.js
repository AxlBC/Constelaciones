import * as THREE from 'three';
import { makeNebulaTexture } from './nebulaTexture.js';

/* Nebulosas: cada nube se compone de 3-4 capas superpuestas, con texturas
   fractales distintas, tamaños, giros y colores ligeramente diferentes.
   Así resultan irregulares y con filamentos, no una mancha redonda.
   La visibilidad se reparte de muy tenue a claramente visible. */
const CLOUD_COUNT = 12;
const TEXTURE_VARIANTS = 5;

/* Paleta inspirada en nebulosas reales */
const EMISSION   = [0xff5f8f, 0xff7aa3, 0xf0507a, 0xff8a70];   // hidrógeno-alfa: rosas y rojos
const REFLECTION = [0x6fa0ff, 0x8fb8ff, 0x7f8cff];             // reflexión: azules
const OXYGEN     = [0x4fd6c8, 0x6fe0cf];                       // oxígeno: verde azulado
const DUST       = [0xa47bd6, 0xb18fd6];                       // polvo: violetas

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* Color principal y color de acento (el acento suele ser más frío) */
function pickPalette() {
  const r = Math.random();
  if (r < 0.45) return [pick(EMISSION), pick(REFLECTION.concat(OXYGEN))];
  if (r < 0.70) return [pick(REFLECTION), pick(DUST)];
  if (r < 0.88) return [pick(DUST), pick(EMISSION)];
  return [pick(OXYGEN), pick(REFLECTION)];
}

export function createSmoke({ world }) {
  const textures = [];
  for (let i = 0; i < TEXTURE_VARIANTS; i++) {
    textures.push(makeNebulaTexture(1000 + i * 7919));
  }

  const layers = [];

  for (let i = 0; i < CLOUD_COUNT; i++) {
    /* Visibilidad repartida (estratificada): siempre hay algunas nubes claras
       y muchas muy tenues. Rango de 0.05 (casi invisible) a 0.70 (claramente visible). */
    const t = (i + Math.random()) / CLOUD_COUNT;
    const intensity = 0.05 + t * t * 0.50;

    const [main, accent] = pickPalette();

    // Centro de la nube en la esfera
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = 520 + Math.random() * 380;
    const center = new THREE.Vector3(
      Math.cos(th) * s * r,
      u * r * 0.75,
      Math.sin(th) * s * r
    );

    // Ejes tangentes para desplazar las capas dentro de la nube
    const n = center.clone().normalize();
    const tA = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0));
    if (tA.lengthSq() < 1e-4) tA.set(1, 0, 0);
    tA.normalize();
    const tB = new THREE.Vector3().crossVectors(n, tA).normalize();

    const cloudSize = 300 + Math.random() * 300;
    const nLayers = 3 + (Math.random() < 0.5 ? 1 : 0);

    for (let k = 0; k < nLayers; k++) {
      const isAccent = k === nLayers - 1;             // la última capa lleva el acento
      const baseOpacity = intensity * (isAccent ? 0.55 : 0.60 + Math.random() * 0.35);

      const mat = new THREE.SpriteMaterial({
        map: textures[Math.floor(Math.random() * TEXTURE_VARIANTS)],
        color: isAccent ? accent : main,
        transparent: true,
        opacity: baseOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        rotation: Math.random() * Math.PI * 2
      });

      const sprite = new THREE.Sprite(mat);

      const spread = cloudSize * 0.22;
      sprite.position.copy(center)
        .addScaledVector(tA, (Math.random() - 0.5) * 2 * spread)
        .addScaledVector(tB, (Math.random() - 0.5) * 2 * spread);

      const w = cloudSize * (isAccent ? 0.55 + Math.random() * 0.25 : 0.80 + Math.random() * 0.45);
      sprite.scale.set(w, w * (0.55 + Math.random() * 0.6), 1);

      world.add(sprite);

      layers.push({
        mat,
        baseOpacity,
        pulseSpeed: 0.08 + Math.random() * 0.16,
        phase: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.012
      });
    }
  }

  function update(dt, elapsed) {
    for (const l of layers) {
      const s = 0.84 + Math.sin(elapsed * l.pulseSpeed + l.phase) * 0.16;
      l.mat.opacity = l.baseOpacity * s;
      l.mat.rotation += l.spinSpeed * dt;
    }
  }

  return { update };
}
