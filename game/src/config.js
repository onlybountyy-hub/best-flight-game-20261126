// Storm Courier — configuration: every tunable number for the game lives here.
// One short delivery run through a storm: collect rings, dodge storm cells,
// land on the runway before the clock runs out.
export const CONFIG = {
  canvasWidth: 1280,
  canvasHeight: 720,
  // World: the route is this long in world pixels; the runway sits at the end.
  routeLength: 9200,
  runwayStart: 8300,
  runwayEnd: 9050,
  // Plane physics (forgiving arcade feel, not a simulator).
  planeScreenX: 330,
  baseSpeed: 260, // world px per second at cruise
  boostSpeed: 430,
  boostDuration: 1.6, // seconds of boost per press
  boostCooldown: 4.0,
  climbSpeed: 300, // vertical px per second
  gravityPull: 26, // gentle sink when the player does nothing
  // Run rules.
  timeLimit: 100, // seconds
  ringCount: 14,
  ringRadius: 34,
  ringScore: 100,
  ringTimeBonus: 2, // seconds added per ring
  stormCount: 9,
  stormRadius: 74, // collision radius of a storm cell core
  turbulenceRadius: 190, // shake starts inside this distance
  // Look and feel.
  seed: 20261126,
  skyTop: '#1b2340',
  skyMid: '#3a466e',
  skyLow: '#6d5a6e',
  groundFar: '#2e3d33',
  groundNear: '#4a5d3a',
  ringColor: '#ffd34d',
  planeBody: '#ffcf3d',
  planeAccent: '#e2483d',
};

export const GAME_TITLE = 'Storm Courier';
export const GAME_TAGLINE = 'Fly the storm route, grab every ring, land before the clock runs out.';
