import * as THREE from 'three';
import { clamp } from '../utils/math.js';

/* Renderer, escena, cámara, grupo "world" y zoom. */
export function createContext(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06020c);

  const camera = new THREE.PerspectiveCamera(
    55, window.innerWidth / window.innerHeight, 0.5, 8000
  );

  const CAM_DIR = new THREE.Vector3(0, 38, 185).normalize();
  let camDist = Math.sqrt(38 * 38 + 185 * 185);
  const CAM_MIN = 55;
  const CAM_MAX = 720;

  function applyCamera() {
    camera.position.copy(CAM_DIR).multiplyScalar(camDist);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  }
  applyCamera();

  /* factor > 1 aleja, factor < 1 acerca */
  function zoomBy(factor) {
    camDist = clamp(camDist * factor, CAM_MIN, CAM_MAX);
    applyCamera();
  }

  /* dir > 0 aleja, dir < 0 acerca (paso fijo, usado por la rueda) */
  function zoom(dir) {
    zoomBy(1 + dir * 0.09);
  }

  const world = new THREE.Group();
  world.rotation.order = 'YXZ';
  scene.add(world);

  return { canvas, renderer, scene, camera, world, applyCamera, zoom, zoomBy };
}
