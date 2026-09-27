import { clamp } from '../utils/math.js';

const DRAG_K = 0.0045;
const PITCH_LIMIT = 1.15;

/* Arrastre con inercia (gira "world") y rueda (zoom de cámara). */
export function createControls({ canvas, world, zoom }) {
  let yaw = 0, pitch = 0;
  let velYaw = 0, velPitch = 0;
  let dragging = false;
  let prevX = 0, prevY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
    velYaw = 0;
    velPitch = 0;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
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
    if (!dragging) return;
    dragging = false;
    if (e && e.pointerId !== undefined && canvas.hasPointerCapture?.(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
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
