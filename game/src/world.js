// Storm Courier — the world: terrain, river, town, runway, rings, storm cells,
// and the flight model (movement, turbulence, collisions, win/lose rules).
import { CONFIG } from './config.js';
import { clamp, lerp, mulberry32, range } from './random.js';

// Rolling hills: a few sines plus seeded bumps, flat where the runway sits.
export function groundHeightAt(x, bumps) {
  if (x >= CONFIG.runwayStart - 120) return 600;
  let y = 600;
  y += Math.sin(x * 0.0011) * 26;
  y += Math.sin(x * 0.0031 + 1.7) * 14;
  for (const bump of bumps) {
    const d = (x - bump.x) / bump.width;
    if (Math.abs(d) < 1) y -= bump.height * (1 - d * d);
  }
  return y;
}

export function createWorld() {
  const rand = mulberry32(CONFIG.seed);
  const bumps = [];
  for (let i = 0; i < 26; i++) {
    bumps.push({ x: range(rand, 200, CONFIG.routeLength - 900), width: range(rand, 180, 420), height: range(rand, 18, 64) });
  }
  // The river crossing: a blue band of low ground around x = 3050.
  const river = { x: 3050, width: 260 };
  // A small town with lit windows around x = 5600.
  const town = [];
  for (let i = 0; i < 14; i++) {
    town.push({
      x: 5200 + i * 62 + range(rand, -14, 14),
      width: range(rand, 34, 52),
      height: range(rand, 42, 110),
      lit: rand() > 0.35,
    });
  }
  // Delivery rings arc along the route at friendly heights.
  const rings = [];
  for (let i = 0; i < CONFIG.ringCount; i++) {
    const x = 700 + (i * (CONFIG.routeLength - 1900)) / (CONFIG.ringCount - 1);
    const ground = groundHeightAt(x, bumps);
    rings.push({
      x,
      y: ground - range(rand, 150, 320),
      collected: false,
      phase: rand() * Math.PI * 2,
    });
  }
  // Storm cells hover above the route, denser toward the far end.
  const storms = [];
  for (let i = 0; i < CONFIG.stormCount; i++) {
    const x = 1100 + i * 880 + range(rand, -160, 160);
    const ground = groundHeightAt(x, bumps);
    storms.push({
      x,
      y: ground - range(rand, 190, 330),
      radius: CONFIG.stormRadius + range(rand, -10, 22),
      drift: range(rand, -14, 14),
      phase: rand() * Math.PI * 2,
      flash: 0,
    });
  }
  return {
    bumps,
    river,
    town,
    rings,
    storms,
    routeX: 0,
    planeY: 330,
    planeVy: 0,
    speed: CONFIG.baseSpeed,
    boostTime: 0,
    boostCooldown: 0,
    timeLeft: CONFIG.timeLimit,
    score: 0,
    ringsCollected: 0,
    shake: 0,
    distance: 0,
    landed: false,
  };
}

export function resetWorld(world) {
  const fresh = createWorld();
  Object.assign(world, fresh);
}

// One simulation step. Returns an event string: 'ring' | 'crash-storm' |
// 'crash-ground' | 'timeout' | 'landed' | null.
export function updateWorld(world, input, dt, sound) {
  const cfg = CONFIG;
  // Boost: short burst, then a cooldown shown on the gauge.
  if (input.boost && world.boostCooldown <= 0 && world.boostTime <= 0) {
    world.boostTime = cfg.boostDuration;
    world.boostCooldown = cfg.boostDuration + cfg.boostCooldown;
    sound.boost();
  }
  const boosting = world.boostTime > 0;
  if (world.boostTime > 0) world.boostTime -= dt;
  if (world.boostCooldown > 0) world.boostCooldown -= dt;
  const targetSpeed = boosting ? cfg.boostSpeed : cfg.baseSpeed;
  world.speed = lerp(world.speed, targetSpeed, Math.min(1, dt * 3));

  // Steering: climb/dive, plus a gentle sink when hands are off the keys.
  let vy = 0;
  if (input.up) vy -= cfg.climbSpeed;
  if (input.down) vy += cfg.climbSpeed;
  if (input.mouseDown) {
    vy = clamp((input.mouseY - world.planeY) * 4, -cfg.climbSpeed, cfg.climbSpeed);
  }
  if (!input.up && !input.down && !input.mouseDown) vy += cfg.gravityPull;
  // Turbulence near a storm cell: the plane shudders and steering gets mushy.
  let nearestStorm = null;
  let nearestDist = Infinity;
  for (const storm of world.storms) {
    const dx = storm.x - world.routeX - 330;
    const dy = storm.y - world.planeY;
    const dist = Math.hypot(dx, dy);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestStorm = storm;
    }
  }
  const turbulence = nearestStorm && nearestDist < cfg.turbulenceRadius
    ? 1 - nearestDist / cfg.turbulenceRadius
    : 0;
  if (turbulence > 0) {
    world.shake = turbulence * 9;
    vy += Math.sin(performance.now() * 0.045) * 90 * turbulence;
    vy *= 1 - turbulence * 0.45;
  } else {
    world.shake = Math.max(0, world.shake - dt * 30);
  }
  world.planeVy = lerp(world.planeVy, vy, Math.min(1, dt * 8));
  world.planeY = clamp(world.planeY + world.planeVy * dt, 60, 690);
  world.routeX += world.speed * dt;
  world.distance = world.routeX;
  world.timeLeft -= dt;

  // Storm cells drift and flash lightning.
  for (const storm of world.storms) {
    storm.x += storm.drift * dt;
    storm.flash = Math.max(0, storm.flash - dt * 2);
    if (Math.random() < dt * 0.12) {
      storm.flash = 1;
      sound.thunder();
    }
  }

  // Rings: fly through one to collect it.
  for (const ring of world.rings) {
    if (ring.collected) continue;
    const dx = ring.x - world.routeX - 330;
    const dy = ring.y - world.planeY;
    if (Math.hypot(dx, dy) < cfg.ringRadius + 26) {
      ring.collected = true;
      world.ringsCollected += 1;
      world.score += cfg.ringScore;
      world.timeLeft = Math.min(cfg.timeLimit, world.timeLeft + cfg.ringTimeBonus);
      sound.ring();
      return 'ring';
    }
  }

  // Storm collision: the cell core is deadly.
  if (nearestStorm && nearestDist < nearestStorm.radius * 0.62) {
    sound.crash();
    return 'crash-storm';
  }
  // Terrain collision.
  const ground = groundHeightAt(world.routeX + 330, world.bumps);
  if (world.planeY + 16 >= ground) {
    sound.crash();
    return 'crash-ground';
  }
  // Reached the runway: land to win.
  if (world.routeX + 330 >= cfg.runwayStart + 260) {
    world.landed = true;
    sound.win();
    return 'landed';
  }
  if (world.timeLeft <= 0) {
    world.timeLeft = 0;
    return 'timeout';
  }
  return null;
}

// Readouts for the HUD, in pilot units.
export function flightReadouts(world) {
  const ground = groundHeightAt(world.routeX + 330, world.bumps);
  const altitudeFt = Math.max(0, Math.round((ground - world.planeY) * 3.1));
  const speedKt = Math.round(world.speed * 0.62);
  const heading = Math.round(90 + clamp(world.planeVy / CONFIG.climbSpeed, -1, 1) * 24);
  return { altitudeFt, speedKt, heading };
}
