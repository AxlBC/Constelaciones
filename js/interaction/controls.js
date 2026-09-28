import { clamp } from '../utils/math.js';

const DRAG_K = 0.0045;
const PITCH_LIMIT = 1.15;

/* Arrastre con inercia (gira "world"), rueda y pellizco (zoom de cámara). */
export function createControls({ canvas, world, zoom, zoomBy }) {
  let yaw = 0, pitch = 0;
  let velYaw = 0, velPitch = 0;
  let dragging = false;
  let prevX = 0, prevY = 0;

  const pointers = new Map(); // pointerId -> {x, y}, para detectar el pellizco
  let pinchDist = 0;

  function pinchDistance() {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  canvas.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);

    if (pointers.size === 2) {
      dragging = false;
      velYaw = 0;
      velPitch = 0;
      pinchDist = pinchDistance();
    } else if (pointers.size === 1) {
      dragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      velYaw = 0;
      velPitch = 0;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const dist = pinchDistance();
      if (pinchDist > 0) zoomBy(pinchDist / dist);
      pinchDist = dist;
      return;
    }

    if (!dragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    prevX = e.clientX;
    prevY = e.clientY;

    const dYaw = dx * DRAG_K;
    const dPitch = dy * DRAG_K;

    yaw += dYaw;
    pitch = clamp(pitch + dPitch, -PITCH_LIMIT, PITCH_LIMIT);

    velYaw = dYaw;
    velPitch = dPitch;
  });

  function endDrag(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (canvas.hasPointerCapture?.(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (pointers.size === 1) {
      // queda un dedo: retoma el arrastre desde su posición actual
      const [p] = pointers.values();
      dragging = true;
      prevX = p.x;
      prevY = p.y;
      velYaw = 0;
      velPitch = 0;
    } else {
      dragging = false;
    }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom(Math.sign(e.deltaY) || 0);
  }, { passive: false });

  /* Aplica la inercia y escribe la rotación en world */
  function update() {
    if (!dragging && (Math.abs(velYaw) > 1e-5 || Math.abs(velPitch) > 1e-5)) {
      yaw += velYaw;
      pitch = clamp(pitch + velPitch, -PITCH_LIMIT, PITCH_LIMIT);
      velYaw *= 0.94;
      velPitch *= 0.94;
      if (Math.abs(velYaw) < 1e-5) velYaw = 0;
      if (Math.abs(velPitch) < 1e-5) velPitch = 0;
    }

    world.rotation.y = yaw;
    world.rotation.x = pitch;
  }

  return { update };
}
