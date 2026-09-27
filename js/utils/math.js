import * as THREE from 'three';

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function randPointOnSphere(radius) {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return new THREE.Vector3(
    Math.cos(t) * s * radius,
    u * radius * 0.7,
    Math.sin(t) * s * radius
  );
}
