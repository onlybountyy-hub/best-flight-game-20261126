// Storm Courier — keyboard + mouse input.
// Arrow keys / WASD steer, Space boosts, Enter or click starts, R restarts.
export function createInput(canvas) {
  const keys = new Set();
  const state = {
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
    mouseDown: false,
    mouseX: 0,
    mouseY: 0,
    // Edge-triggered actions, consumed by the game loop each frame.
    pressedStart: false,
    pressedRestart: false,
  };

  function refresh() {
    state.up = keys.has('ArrowUp') || keys.has('KeyW');
    state.down = keys.has('ArrowDown') || keys.has('KeyS');
    state.left = keys.has('ArrowLeft') || keys.has('KeyA');
    state.right = keys.has('ArrowRight') || keys.has('KeyD');
    state.boost = keys.has('Space');
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.code === 'Enter' || event.code === 'Space') state.pressedStart = true;
    if (event.code === 'KeyR') state.pressedRestart = true;
    if (!event.repeat) keys.add(event.code);
    refresh();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    refresh();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    refresh();
  });

  function trackMouse(event) {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    state.mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
  }
  canvas.addEventListener('pointerdown', (event) => {
    trackMouse(event);
    state.mouseDown = true;
    state.pressedStart = true;
  });
  canvas.addEventListener('pointermove', trackMouse);
  window.addEventListener('pointerup', () => {
    state.mouseDown = false;
  });

  state.consumeStart = () => {
    const value = state.pressedStart;
    state.pressedStart = false;
    return value;
  };
  state.consumeRestart = () => {
    const value = state.pressedRestart;
    state.pressedRestart = false;
    return value;
  };
  return state;
}
