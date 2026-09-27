import * as THREE from 'three';
import { clamp } from '../utils/math.js';

const ALIGN_THRESHOLD = 0.88;
const LOST_THRESHOLD  = 0.80;

/* Minijuego: detectar cuándo la cámara mira a alguna de las constelaciones.
   Cada constelación lleva su propio estado (alineada, líneas reveladas, hallada). */
export function createGame({ camera, world }, constellations) {
  const foundEl = document.getElementById('found');
  const foundTextEl = foundEl.querySelector('.sub');
  const hintEl = document.getElementById('hint');

  const camDirV = new THREE.Vector3();
  const constDirWorld = new THREE.Vector3();

  const states = constellations.map((c) => ({
    c,
    found: false,
    lineReveal: 0,
    alignedSince: -1,
    aligned: false
  }));

  function updateOne(s, elapsed, dt) {
    const { points, lineMaterial, glow, normal } = s.c;

    constDirWorld.copy(normal).applyQuaternion(world.quaternion);
    const dot = constDirWorld.dot(camDirV);

    const prox = clamp((dot - 0.60) / (0.99 - 0.60), 0, 1);
    points.material.size = 15 + prox * 5;
    glow.material.opacity = 0.07 + prox * 0.22;

    const isAligned = dot > ALIGN_THRESHOLD;
    const isLost = dot < LOST_THRESHOLD;

    if (isAligned && !s.aligned) {
      s.alignedSince = elapsed;
      s.aligned = true;
    }

    if (s.aligned && isLost) {
      s.aligned = false;
      s.alignedSince = -1;
    }

    if (s.aligned && s.alignedSince >= 0 && elapsed - s.alignedSince > 1.0) {
      s.lineReveal = Math.min(1, s.lineReveal + dt * 0.62);
    } else {
      s.lineReveal = Math.max(0, s.lineReveal - dt * 1.6);
    }

    lineMaterial.opacity = s.lineReveal * 0.72;

    if (!s.found && isAligned) {
      s.found = true;
      hintEl.classList.add('hide');
    }
  }

  /* El mensaje sigue exactamente la misma curva que las líneas:
     aparece y desaparece con el lineReveal de la constelación más revelada. */
  let shownText = '';
  function updateMessage() {
    let best = states[0];
    for (const s of states) if (s.lineReveal > best.lineReveal) best = s;

    if (best.lineReveal > 0 && best.c.text !== shownText) {
      shownText = best.c.text;
      foundTextEl.textContent = shownText;
    }
    foundEl.style.opacity = best.lineReveal;
  }

  function update(elapsed, dt) {
    camera.getWorldDirection(camDirV);
    for (const s of states) updateOne(s, elapsed, dt);
    updateMessage();
  }

  return { update };
}
