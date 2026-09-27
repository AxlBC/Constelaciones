import * as THREE from 'three';

/* Cinturón de asteroides entre el planeta 4 y el 5 */
export function createAsteroidBelt({ world }, planetDefs) {
  const p4 = planetDefs[3];
  const p5 = planetDefs[4];

  const beltCenter = (p4.radius + p5.radius) / 2;
  let beltInner = beltCenter - 5;
  let beltOuter = beltCenter + 5;
  const beltThickness = beltOuter - beltInner;

  for (let attempt = 0; attempt < 24; attempt++) {
    let collision = false;
    for (const def of planetDefs) {
      const margin = def.size * 2.0 + 2.5;
      const pInner = def.radius - margin;
      const pOuter = def.radius + margin;

      if (beltOuter > pInner && beltInner < pOuter) {
        beltInner = pOuter + 3.0;
        beltOuter = beltInner + beltThickness;
        collision = true;
        break;
      }
    }
    if (!collision) break;
  }

  const asteroidCount = 420;
  const asteroidGeo = new THREE.IcosahedronGeometry(0.62, 0);
  const asteroidMat = new THREE.MeshStandardMaterial({
    color: 0xe4b3c9,
    emissive: new THREE.Color(0x7a3558),
    emissiveIntensity: 0.45,
    roughness: 0.85,
    metalness: 0.12
  });
  const asteroids = new THREE.InstancedMesh(asteroidGeo, asteroidMat, asteroidCount);
  asteroids.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  world.add(asteroids);

  const asteroidData = [];
  const dummy = new THREE.Object3D();

  for (let i = 0; i < asteroidCount; i++) {
    const r = beltInner + Math.random() * (beltOuter - beltInner);
    const a = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 2.4;
    const sx = 0.28 + Math.random() * 0.95;
    const sy = 0.28 + Math.random() * 0.95;
    const sz = 0.28 + Math.random() * 0.95;

    asteroidData.push({
      r, a, y,
      scale: { x: sx, y: sy, z: sz },
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      spinX: (Math.random() - 0.5) * 1.2,
      spinY: (Math.random() - 0.5) * 1.2,
      speed: 0.08 + Math.random() * 0.09
    });
  }

  function update(dt) {
    for (let i = 0; i < asteroidCount; i++) {
      const d = asteroidData[i];
      d.a += d.speed * dt;
      d.rotX += d.spinX * dt;
      d.rotY += d.spinY * dt;

      dummy.position.set(Math.cos(d.a) * d.r, d.y, Math.sin(d.a) * d.r);
      dummy.rotation.set(d.rotX, d.rotY, d.rotZ);
      dummy.scale.set(d.scale.x, d.scale.y, d.scale.z);
      dummy.updateMatrix();
      asteroids.setMatrixAt(i, dummy.matrix);
    }
    asteroids.instanceMatrix.needsUpdate = true;
  }
  update(0);

  return { update };
}
