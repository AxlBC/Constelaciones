import * as THREE from 'three';

export function addLights({ scene, world }) {
  world.add(new THREE.PointLight(0xff9ec4, 2.6, 0, 0));
  scene.add(new THREE.AmbientLight(0x4a1536, 1.1));
}
