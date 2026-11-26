// Storm Courier — small deterministic random helpers (mulberry32).
// The route, terrain and storm cells are generated from one fixed seed so
// every run — and every screenshot — looks the same unless the player acts.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rand, min, max) {
  return min + rand() * (max - min);
}

export function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
