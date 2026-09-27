import * as THREE from 'three';
import { clamp } from '../utils/math.js';

/* El pitch de los controles se limita a ±1.15 rad; se deja margen para
   que toda constelación sea alcanzable y quede bien centrada. */
const PITCH_MAX = 1.0;

/* Separación mínima (rad) respecto a la vista inicial (yaw 0, pitch 0),
   para que ninguna constelación esté ya a la vista al cargar. */
const START_CLEARANCE = 0.7;
const START_DIR = new THREE.Vector3(0, 0, -1);

/* Base ortonormal de una constelación colocada con (yaw, pitch):
   al girar el mundo a esos ángulos, la constelación queda de frente y derecha. */
export function basisFromAngles(yaw, pitch) {
  const qInv = new THREE.Quaternion()
    .setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'))
    .invert();
  return {
    normal: new THREE.Vector3(0, 0, -1).applyQuaternion(qInv).normalize(),
    right:  new THREE.Vector3(1, 0, 0).applyQuaternion(qInv).normalize(),
    up:     new THREE.Vector3(0, 1, 0).applyQuaternion(qInv).normalize()
  };
}

const angleBetween = (a, b) => Math.acos(clamp(a.dot(b), -1, 1));

/* Reparte constelaciones en puntos aleatorios de la esfera sin que se solapen.
   `radii` son los radios angulares (rad) de cada una. Devuelve un array del mismo
   tamaño con { yaw, pitch } (o null si no se encontró sitio). */
export function placeConstellations(radii, { margin = 0.10, attempts = 600 } = {}) {
  const result = new Array(radii.length).fill(null);
  const placed = [];

  // las grandes primero: son las más difíciles de acomodar
  const order = radii.map((_, i) => i).sort((a, b) => radii[b] - radii[a]);

  for (const i of order) {
    const rho = radii[i];

    // si no hay sitio, se relaja el margen entre constelaciones
    for (const m of [margin, margin * 0.5, 0]) {
      for (let k = 0; k < attempts && !result[i]; k++) {
        // seno del pitch uniforme => distribución uniforme sobre la esfera
        const sMax = Math.sin(PITCH_MAX);
        const pitch = Math.asin((Math.random() * 2 - 1) * sMax);
        const yaw = Math.random() * Math.PI * 2;
        const { normal } = basisFromAngles(yaw, pitch);

        if (angleBetween(normal, START_DIR) < rho + START_CLEARANCE) continue;
        if (placed.some((p) => angleBetween(normal, p.normal) < rho + p.rho + m)) continue;

        result[i] = { yaw, pitch };
        placed.push({ normal, rho });
      }
      if (result[i]) break;
    }
  }
  return result;
}
