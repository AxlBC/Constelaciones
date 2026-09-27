import * as THREE from 'three';

import { createContext }       from './core/context.js';
import { createTextures }      from './core/textures.js';
import { addLights }           from './core/lights.js';
import { bindResize }          from './core/resize.js';

import { createSun }           from './solar/sun.js';
import { createPlanets, planetDefs } from './solar/planets.js';
import { createAsteroidBelt }  from './solar/asteroidBelt.js';

import { createStarfield }     from './sky/starfield.js';
import { createSmoke }         from './sky/smoke.js';
import { createComets }        from './sky/comets.js';
import { createConstellations } from './sky/constellation.js';
import { constellationTexts }  from './data/constellationTexts.js';

import { createControls }      from './interaction/controls.js';
import { createGame }          from './interaction/game.js';

/* Núcleo */
const ctx = createContext(document.getElementById('scene'));
const tex = createTextures();
addLights(ctx);
bindResize(ctx);

/* Escena */
const updatables = [
  createSun(ctx, tex),
  createPlanets(ctx),
  createAsteroidBelt(ctx, planetDefs),
  createStarfield(ctx, tex),
  createSmoke(ctx, tex),
  createComets(ctx, tex)
];
const constellations = createConstellations(ctx, tex, constellationTexts);

/* Interacción */
const controls = createControls(ctx);
const game = createGame(ctx, constellations);

/* Bucle */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  controls.update();
  ctx.world.updateMatrixWorld();   // antes de los update (los planetas usan world.quaternion)

  for (const u of updatables) u.update?.(dt, elapsed);
  game.update(elapsed, dt);

  ctx.renderer.render(ctx.scene, ctx.camera);
}
animate();
