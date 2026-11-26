// Storm Courier — game loop and state machine.
// States: title → play → win / lose, with instant restart (R or click).
// ?shot=title|cover|storm|landing renders a chosen moment for screenshots.
import { CONFIG } from './config.js';
import { createInput } from './input.js';
import { createSound } from './audio.js';
import { createWorld, resetWorld, updateWorld } from './world.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

const input = createInput(canvas);
const sound = createSound();
const world = createWorld();

let state = 'title';
let endReason = '';
let lastTime = performance.now();
let elapsed = 0;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  state = applyShot(world, shot);
  // In shot mode the scene holds still-ish: no timer drain, no collisions.
  if (state === 'play') world.frozen = true;
}

function startRun() {
  resetWorld(world);
  state = 'play';
  endReason = '';
  sound.unlock();
}

function endRun(won, reason) {
  state = won ? 'win' : 'lose';
  endReason = reason;
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  elapsed += dt;

  if (input.consumeRestart() && state !== 'title') startRun();
  if (state === 'title' && input.consumeStart()) startRun();
  if ((state === 'win' || state === 'lose') && input.consumeStart()) startRun();
  if (input.pressedStart) input.consumeStart();

  if (state === 'play' && !world.frozen) {
    sound.setEngine(world.speed / CONFIG.boostSpeed, world.boostTime > 0);
    const event = updateWorld(world, input, dt, sound);
    if (event === 'landed') endRun(true, '');
    else if (event === 'crash-storm') endRun(false, 'Caught in a storm cell — the courier went down in the lightning.');
    else if (event === 'crash-ground') endRun(false, 'Clipped the hillside — watch your altitude over the terrain.');
    else if (event === 'timeout') endRun(false, 'Out of time — the delivery window closed before you reached runway 27.');
  }
  if (state === 'title') {
    // A slow scenic drift behind the title screen.
    world.routeX = (elapsed * 40) % 4000;
    world.planeY = 300 + Math.sin(elapsed * 0.6) * 24;
  }

  render(ctx, world, state, elapsed, endReason);
  statusLine.textContent =
    state === 'title'
      ? 'Storm Courier. Press Enter to fly.'
      : state === 'play'
        ? `Flying. ${world.ringsCollected} of ${CONFIG.ringCount} rings, ${Math.ceil(world.timeLeft)} seconds left, score ${world.score}.`
        : state === 'win'
          ? `Delivered! Score ${world.score}.`
          : `Run failed. ${endReason}`;
  requestAnimationFrame(frame);
}

// Mute toggle (M) — small convenience, wired outside the input module.
window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyM') sound.toggleMute();
});

// Debug hook for automated play-tests: read-only snapshot of the run.
window.__stormCourier = {
  get state() {
    return state;
  },
  get world() {
    return world;
  },
  start: startRun,
};

requestAnimationFrame(frame);
