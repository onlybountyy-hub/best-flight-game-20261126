// Storm Courier — screenshot presets for ?shot=.
// The game renders its real state; these presets only choose where the plane
// is and what the clock says, so each screenshot is a genuine render.
import { CONFIG } from './config.js';
import { groundHeightAt } from './world.js';

function placePlane(world, routeX, altitudeAboveGround) {
  world.routeX = routeX;
  world.distance = routeX;
  const ground = groundHeightAt(routeX + 330, world.bumps);
  world.planeY = ground - altitudeAboveGround;
  world.planeVy = -40;
  world.speed = CONFIG.baseSpeed;
}

export function applyShot(world, shot) {
  if (shot === 'title') return 'title';
  if (shot === 'cover') {
    // Mid-flight over the town: plane, a ring ahead, terrain, full HUD.
    placePlane(world, 4700, 260);
    world.timeLeft = 62;
    world.score = 300;
    world.ringsCollected = 3;
    for (let i = 0; i < 3; i++) world.rings[i].collected = true;
    return 'play';
  }
  if (shot === 'storm') {
    // Right beside a storm cell: turbulence warning lit, ring in view.
    const storm = world.storms[4];
    placePlane(world, storm.x - 330 - 150, 0);
    world.planeY = storm.y + 10;
    world.planeVy = 30;
    storm.flash = 1;
    world.shake = 7; // turbulence warning lamp + shake banner lit in the shot
    world.timeLeft = 48;
    world.score = 500;
    world.ringsCollected = 5;
    for (let i = 0; i < 5; i++) world.rings[i].collected = true;
    return 'play';
  }
  if (shot === 'landing') {
    // Final approach: runway 27 ahead, plane descending toward it.
    placePlane(world, 7950, 190);
    world.planeVy = 120;
    world.timeLeft = 18;
    world.score = 1100;
    world.ringsCollected = 11;
    for (let i = 0; i < 11; i++) world.rings[i].collected = true;
    return 'play';
  }
  return 'title';
}
