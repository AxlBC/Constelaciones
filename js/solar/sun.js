import * as THREE from 'three';

const SUN_COLOR = 0xff4f7d;

export function createSun({ world }, { sunGlowTex }) {
  const sunMat = new THREE.MeshStandardMaterial({
    color: SUN_COLOR,
    emissive: new THREE.Color(0xff2f6a),
    emissiveIntensity: 1.35,
    roughness: 0.55,
    metalness: 0.05
  });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(9, 64, 48), sunMat);
  world.add(sun);

  const halo1 = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunGlowTex, color: 0xff7aa8, transparent: true, opacity: 0.80,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  halo1.scale.set(60, 60, 1);
  world.add(halo1);

  const halo2 = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunGlowTex, color: 0xff4f7d, transparent: true, opacity: 0.26,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  halo2.scale.set(140, 140, 1);
  world.add(halo2);

  function update(dt, elapsed) {
    const pulse = 1 + Math.sin(elapsed * 1.6) * 0.02;
    sun.scale.setScalar(pulse);
    sun.rotation.y += dt * 0.08;
    halo1.scale.setScalar(60 * (1 + Math.sin(elapsed * 1.6) * 0.03));
    halo2.scale.setScalar(140 * (1 + Math.sin(elapsed * 1.6 + 1) * 0.03));
  }

  return { update };
}
