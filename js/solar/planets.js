import * as THREE from 'three';
import { makeHeartGeometry } from './heartGeometry.js';

export const planetDefs = [
  { radius: 22,  size: 1.6, color: 0xffc2d1, speed: 0.72, phase: 0.4 },
  { radius: 33,  size: 2.4, color: 0xff9ab5, speed: 0.55, phase: 2.1 },
  { radius: 44,  size: 3.2, color: 0xff7fa3, speed: 0.43, phase: 4.0 },
  { radius: 55,  size: 2.0, color: 0xe07a9e, speed: 0.34, phase: 1.2 },
  { radius: 100, size: 3.8, color: 0xc98ab8, speed: 0.22, phase: 5.3 },
  { radius: 130, size: 1.9, color: 0xb388c9, speed: 0.17, phase: 3.1 },
  { radius: 165, size: 3.2, color: 0xffa8b8, speed: 0.13, phase: 0.9 }
];

/* Planetas corazón + órbitas + lunas */
export function createPlanets({ world }) {
  const planets = [];
  const moonSphereGeo = new THREE.SphereGeometry(1, 20, 14);

  for (const def of planetDefs) {
    const pts = [];
    const SEG = 160;
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * def.radius, 0, Math.sin(a) * def.radius));
    }
    world.add(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({
        color: 0xff9ec9, transparent: true, opacity: 0.13, depthWrite: false
      })
    ));

    const host = new THREE.Group();
    world.add(host);

    const heartMat = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: new THREE.Color(def.color),
      emissiveIntensity: 0.30,
      roughness: 0.42,
      metalness: 0.18
    });
    const heart = new THREE.Mesh(makeHeartGeometry(def.size), heartMat);
    host.add(heart);

    const nMoons = Math.floor(Math.random() * 4);
    const moons = [];

    const planetRadius = def.size * 0.5;
    const maxMoonRadius = planetRadius * 0.25;

    for (let i = 0; i < nMoons; i++) {
      const orbitR = def.size * (0.95 + i * 0.55 + Math.random() * 0.35);

      const minMoonSize = maxMoonRadius * 0.20;
      const moonSize = minMoonSize + Math.random() * (maxMoonRadius - minMoonSize);

      const tint = new THREE.Color().setHSL(
        0.90 + Math.random() * 0.10,
        0.32 + Math.random() * 0.35,
        0.72 + Math.random() * 0.22
      );

      const moonMat = new THREE.MeshStandardMaterial({
        color: tint,
        emissive: tint.clone().multiplyScalar(0.55),
        emissiveIntensity: 0.75,
        roughness: 0.5,
        metalness: 0.1
      });

      const moonMesh = new THREE.Mesh(moonSphereGeo, moonMat);
      moonMesh.scale.setScalar(moonSize);

      const orbitGroup = new THREE.Group();
      orbitGroup.rotation.x = (Math.random() - 0.5) * 0.85;
      orbitGroup.rotation.z = (Math.random() - 0.5) * 0.85;
      orbitGroup.rotation.y = Math.random() * Math.PI * 2;
      host.add(orbitGroup);
      orbitGroup.add(moonMesh);

      const mPts = [];
      const MS = 64;
      for (let k = 0; k <= MS; k++) {
        const a = (k / MS) * Math.PI * 2;
        mPts.push(new THREE.Vector3(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR));
      }
      orbitGroup.add(new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(mPts),
        new THREE.LineBasicMaterial({
          color: 0xffb8d8, transparent: true, opacity: 0.05, depthWrite: false
        })
      ));

      moons.push({
        mesh: moonMesh,
        radius: orbitR,
        speed: (1.5 + Math.random() * 2.4) * 0.5,
        angle: Math.random() * Math.PI * 2
      });
    }

    planets.push({
      host,
      mesh: heart,
      moons,
      radius: def.radius,
      speed: def.speed,
      angle: def.phase
    });
  }

  const worldInvQuat = new THREE.Quaternion();

  /* Requiere que world.updateMatrixWorld() ya se haya llamado este frame */
  function update(dt) {
    worldInvQuat.copy(world.quaternion).invert();

    for (const p of planets) {
      p.angle += p.speed * dt;
      p.host.position.set(
        Math.cos(p.angle) * p.radius,
        0,
        Math.sin(p.angle) * p.radius
      );
      // Los corazones siempre miran de frente a la cámara
      p.mesh.quaternion.copy(worldInvQuat);

      for (const m of p.moons) {
        m.angle += m.speed * dt;
        m.mesh.position.set(
          Math.cos(m.angle) * m.radius,
          0,
          Math.sin(m.angle) * m.radius
        );
      }
    }
  }

  return { update };
}
