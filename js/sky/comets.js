import * as THREE from 'three';
import { randPointOnSphere } from '../utils/math.js';

/* Solo 2 cometas. La cola son dos planos cruzados que se extienden
   en +X local del grupo; el grupo se orienta de modo que +X apunte
   SIEMPRE en contra de la dirección de movimiento. */
const MAX_COMETS = 2;

function orientCometToDirection(group, dir) {
  // +X local del grupo = -dir (contra la dirección de movimiento)
  const xAxis = dir.clone().negate().normalize();
  const upRef = Math.abs(xAxis.y) > 0.95
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);
  const yAxis = upRef.clone()
    .sub(xAxis.clone().multiplyScalar(upRef.dot(xAxis)))
    .normalize();
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis);
  const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  group.quaternion.setFromRotationMatrix(m);
}

export function createComets({ world }, { cometHeadTex, cometTailTex }) {
  const comets = [];

  function createComet() {
    const hue = Math.random();
    let color;
    if (hue < 0.45)      color = 0xffe4ee;
    else if (hue < 0.75) color = 0xbfe6ff;
    else                 color = 0xffd8b8;

    const group = new THREE.Group();

    /* Cabeza */
    const headMat = new THREE.SpriteMaterial({
      map: cometHeadTex,
      color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const head = new THREE.Sprite(headMat);
    head.scale.set(9, 9, 1);
    group.add(head);

    /* Halo */
    const haloMat = new THREE.SpriteMaterial({
      map: cometHeadTex,
      color,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const headHalo = new THREE.Sprite(haloMat);
    headHalo.scale.set(22, 22, 1);
    group.add(headHalo);

    /* Cola: dos planos cruzados que se extienden en +X local.
       La textura va de opaco (izquierda, en el origen) a transparente
       (derecha, en el extremo). El plano se centra en X = length/2
       para que su borde izquierdo quede en el origen (la cabeza). */
    const tailLength = 65 + Math.random() * 70;
    const tailWidth  = 8 + Math.random() * 6;
    const tailGeo = new THREE.PlaneGeometry(tailLength, tailWidth, 1, 1);

    const tailMatA = new THREE.MeshBasicMaterial({
      map: cometTailTex,
      color,
      transparent: true,
      opacity: 0.60,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const tailMatB = tailMatA.clone();

    const tailA = new THREE.Mesh(tailGeo, tailMatA);
    tailA.position.set(tailLength / 2, 0, 0);
    group.add(tailA);

    const tailB = new THREE.Mesh(tailGeo, tailMatB);
    tailB.rotation.x = Math.PI / 2;
    tailB.position.set(tailLength / 2, 0, 0);
    group.add(tailB);

    /* Puntos de trayectoria */
    const start = randPointOnSphere(900 + Math.random() * 200);
    const end   = randPointOnSphere(900 + Math.random() * 200);
    if (start.distanceTo(end) < 500) end.multiplyScalar(1.6);

    group.position.copy(start);
    orientCometToDirection(group, end.clone().sub(start).normalize());
    world.add(group);

    /* Velocidad variable por cometa: 30 – 110 u/s */
    const speed = 30 + Math.random() * 80;

    comets.push({
      group,
      headMat, haloMat, tailMatA, tailMatB,
      start, end,
      t: 0,
      speed,
      totalDist: start.distanceTo(end),
      twPhase: Math.random() * Math.PI * 2
    });
  }

  for (let i = 0; i < MAX_COMETS; i++) createComet();

  function resetComet(c) {
    const start = randPointOnSphere(900 + Math.random() * 200);
    const end   = randPointOnSphere(900 + Math.random() * 200);
    if (start.distanceTo(end) < 500) end.multiplyScalar(1.6);
    c.start.copy(start);
    c.end.copy(end);
    c.totalDist = start.distanceTo(end);
    c.t = 0;
    /* Nueva velocidad variable en cada reinicio */
    c.speed = 30 + Math.random() * 80;
    orientCometToDirection(c.group, c.end.clone().sub(c.start).normalize());
  }

  function update(dt, time) {
    for (const c of comets) {
      c.t += (c.speed * dt) / c.totalDist;
      if (c.t >= 1) resetComet(c);

      c.group.position.lerpVectors(c.start, c.end, c.t);

      // Orientación fija hacia su destino (garantiza cola opuesta al movimiento)
      orientCometToDirection(c.group, c.end.clone().sub(c.start).normalize());

      // Parpadeo suave
      const tw = 0.72 + Math.sin(time * 3 + c.twPhase) * 0.16;
      c.headMat.opacity = 0.95 * tw;
      c.haloMat.opacity = 0.35 * tw;
      c.tailMatA.opacity = 0.60 * tw;
      c.tailMatB.opacity = 0.60 * tw;
    }
  }

  return { update };
}
