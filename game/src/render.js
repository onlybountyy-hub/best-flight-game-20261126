// Storm Courier — all drawing: stormy parallax sky, terrain, town, runway,
// glowing rings, storm cells, the courier plane, HUD and lit instruments.
import { CONFIG } from './config.js';
import { flightReadouts, groundHeightAt } from './world.js';
import { clamp, mulberry32, range } from './random.js';

// Pre-generated cloud puffs and rain streaks so the sky is stable per frame.
const skyRand = mulberry32(777);
const clouds = [];
for (let layer = 0; layer < 3; layer++) {
  for (let i = 0; i < 14; i++) {
    clouds.push({
      layer,
      x: range(skyRand, 0, 1600),
      y: range(skyRand, 30, 300 - layer * 60),
      size: range(skyRand, 60, 150 - layer * 20),
      speed: 6 + layer * 9,
    });
  }
}
const rain = [];
for (let i = 0; i < 90; i++) {
  rain.push({ x: range(skyRand, 0, 1280), y: range(skyRand, 0, 720), len: range(skyRand, 12, 26), speed: range(skyRand, 420, 640) });
}

function drawSky(ctx, world, time) {
  const g = ctx.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, CONFIG.skyTop);
  g.addColorStop(0.55, CONFIG.skyMid);
  g.addColorStop(1, CONFIG.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 720);
  // A bruised sun glowing through the storm.
  const sun = ctx.createRadialGradient(1020, 130, 10, 1020, 130, 180);
  sun.addColorStop(0, 'rgba(255, 214, 120, 0.55)');
  sun.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(820, -60, 400, 380);
  // Parallax cloud layers drift with the route.
  for (const cloud of clouds) {
    const parallax = 0.12 + cloud.layer * 0.16;
    let x = (cloud.x - world.routeX * parallax - time * cloud.speed) % 1500;
    if (x < -220) x += 1500;
    ctx.fillStyle = cloud.layer === 2 ? 'rgba(24, 26, 48, 0.85)' : 'rgba(52, 58, 96, 0.6)';
    ctx.beginPath();
    ctx.ellipse(x, cloud.y, cloud.size, cloud.size * 0.42, 0, 0, Math.PI * 2);
    ctx.ellipse(x + cloud.size * 0.6, cloud.y + 8, cloud.size * 0.7, cloud.size * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Slanted rain.
  ctx.strokeStyle = 'rgba(180, 200, 235, 0.28)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const drop of rain) {
    const y = (drop.y + time * drop.speed) % 760;
    ctx.moveTo(drop.x, y);
    ctx.lineTo(drop.x - 6, y + drop.len);
  }
  ctx.stroke();
}

function drawTerrain(ctx, world) {
  const { canvasWidth: W } = CONFIG;
  // Far ridge.
  ctx.fillStyle = CONFIG.groundFar;
  ctx.beginPath();
  ctx.moveTo(0, 720);
  for (let sx = 0; sx <= W; sx += 16) {
    const wx = world.routeX * 0.5 + sx;
    ctx.lineTo(sx, groundHeightAt(wx, world.bumps) - 46 - Math.sin(wx * 0.002) * 18);
  }
  ctx.lineTo(W, 720);
  ctx.closePath();
  ctx.fill();
  // Near ground.
  ctx.fillStyle = CONFIG.groundNear;
  ctx.beginPath();
  ctx.moveTo(0, 720);
  for (let sx = 0; sx <= W; sx += 8) {
    ctx.lineTo(sx, groundHeightAt(world.routeX + sx, world.bumps));
  }
  ctx.lineTo(W, 720);
  ctx.closePath();
  ctx.fill();
  // Grass highlight along the crest.
  ctx.strokeStyle = 'rgba(140, 180, 100, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let sx = 0; sx <= W; sx += 8) {
    const y = groundHeightAt(world.routeX + sx, world.bumps);
    if (sx === 0) ctx.moveTo(sx, y);
    else ctx.lineTo(sx, y);
  }
  ctx.stroke();
  // The river crossing.
  const riverScreenX = world.river.x - world.routeX;
  if (riverScreenX > -300 && riverScreenX < W + 300) {
    const ground = groundHeightAt(world.river.x, world.bumps);
    ctx.fillStyle = '#3f7fb8';
    ctx.fillRect(riverScreenX - world.river.width / 2, ground - 26, world.river.width, 40);
    ctx.fillStyle = 'rgba(190, 225, 255, 0.5)';
    ctx.fillRect(riverScreenX - world.river.width / 2 + 12, ground - 20, world.river.width - 24, 4);
  }
  // The little town: rooftops and lit windows.
  for (const house of world.town) {
    const sx = house.x - world.routeX;
    if (sx < -80 || sx > W + 80) continue;
    const ground = groundHeightAt(house.x, world.bumps);
    ctx.fillStyle = '#5a4636';
    ctx.fillRect(sx, ground - house.height, house.width, house.height);
    ctx.fillStyle = '#8a4a3a';
    ctx.beginPath();
    ctx.moveTo(sx - 4, ground - house.height);
    ctx.lineTo(sx + house.width / 2, ground - house.height - 18);
    ctx.lineTo(sx + house.width + 4, ground - house.height);
    ctx.closePath();
    ctx.fill();
    if (house.lit) {
      ctx.fillStyle = '#ffd97a';
      ctx.fillRect(sx + 8, ground - house.height + 12, 10, 12);
      ctx.fillRect(sx + house.width - 18, ground - house.height + 12, 10, 12);
    }
  }
  // The runway: flat strip, centre dashes, edge lights, windsock.
  // It sits just above the instrument panel so the strip stays visible.
  const runwayScreenX = CONFIG.runwayStart - world.routeX;
  if (runwayScreenX < W + 200) {
    const gy = 600;
    ctx.fillStyle = '#3c3f46';
    ctx.fillRect(Math.max(0, runwayScreenX), gy, W, 40);
    ctx.fillStyle = '#f2f2f2';
    for (let i = 0; i < 12; i++) {
      const dashX = runwayScreenX + 40 + i * 70;
      if (dashX > -40 && dashX < W) ctx.fillRect(dashX, gy + 17, 34, 6);
    }
    // Threshold chevrons and edge lights.
    ctx.fillStyle = '#ffd34d';
    for (let i = 0; i < 6; i++) {
      const lightX = runwayScreenX + 20 + i * 130;
      if (lightX > 0 && lightX < W) {
        ctx.beginPath();
        ctx.arc(lightX, gy + 4, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('27', Math.max(14, runwayScreenX + 24), gy + 34);
    // Windsock on a pole beside the threshold.
    const poleX = runwayScreenX + 8;
    if (poleX > 0 && poleX < W) {
      ctx.strokeStyle = '#d8d8d8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(poleX, gy);
      ctx.lineTo(poleX, gy - 52);
      ctx.stroke();
      ctx.fillStyle = '#ff7a3d';
      ctx.beginPath();
      ctx.moveTo(poleX, gy - 52);
      ctx.lineTo(poleX + 34, gy - 44);
      ctx.lineTo(poleX, gy - 36);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawRings(ctx, world, time) {
  for (const ring of world.rings) {
    if (ring.collected) continue;
    const sx = ring.x - world.routeX;
    if (sx < -90 || sx > 1370) continue;
    const pulse = 1 + Math.sin(time * 3 + ring.phase) * 0.08;
    const r = CONFIG.ringRadius * pulse;
    const glow = ctx.createRadialGradient(sx, ring.y, r * 0.4, sx, ring.y, r * 1.7);
    glow.addColorStop(0, 'rgba(255, 211, 77, 0.5)');
    glow.addColorStop(1, 'rgba(255, 211, 77, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, ring.y, r * 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CONFIG.ringColor;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(sx, ring.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sx, ring.y, r - 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawStorms(ctx, world, time) {
  for (const storm of world.storms) {
    const sx = storm.x - world.routeX;
    if (sx < -220 || sx > 1500) continue;
    // Lightning flash lights the cell from inside.
    if (storm.flash > 0) {
      const flash = ctx.createRadialGradient(sx, storm.y, 10, sx, storm.y, storm.radius * 2.2);
      flash.addColorStop(0, `rgba(190, 210, 255, ${0.5 * storm.flash})`);
      flash.addColorStop(1, 'rgba(190, 210, 255, 0)');
      ctx.fillStyle = flash;
      ctx.beginPath();
      ctx.arc(sx, storm.y, storm.radius * 2.2, 0, Math.PI * 2);
      ctx.fill();
      // Jagged bolt.
      ctx.strokeStyle = `rgba(230, 240, 255, ${storm.flash})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      let bx = sx;
      let by = storm.y + storm.radius * 0.4;
      ctx.moveTo(bx, by);
      for (let i = 0; i < 5; i++) {
        bx += (i % 2 === 0 ? -14 : 14);
        by += 22;
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }
    // Dark cell: stacked puffs with a purple bruise.
    const wobble = Math.sin(time * 1.4 + storm.phase) * 6;
    ctx.fillStyle = 'rgba(38, 32, 68, 0.92)';
    for (const [ox, oy, s] of [[-46, 6, 52], [0, -12 + wobble, 66], [48, 8, 50], [-18, 18, 46], [24, 20, 44]]) {
      ctx.beginPath();
      ctx.ellipse(sx + ox, storm.y + oy, s, s * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(96, 70, 140, 0.55)';
    ctx.beginPath();
    ctx.ellipse(sx, storm.y - 6, 44, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Danger ring so the hazard reads clearly.
    ctx.strokeStyle = 'rgba(255, 90, 90, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(sx, storm.y, storm.radius * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawPlane(ctx, world, time) {
  const x = CONFIG.planeScreenX;
  const y = world.planeY;
  const pitch = clamp(world.planeVy / CONFIG.climbSpeed, -0.45, 0.45) * 0.7;
  ctx.save();
  ctx.translate(x, y);
  if (world.shake > 0.4) ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  ctx.rotate(pitch);
  // Propeller blur.
  ctx.strokeStyle = 'rgba(220, 230, 255, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(52, 0, 4, 26 + Math.sin(time * 40) * 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Tail wing and fin.
  ctx.fillStyle = CONFIG.planeAccent;
  ctx.beginPath();
  ctx.moveTo(-34, -2);
  ctx.lineTo(-52, -16);
  ctx.lineTo(-44, -2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-30, 2);
  ctx.lineTo(-48, 14);
  ctx.lineTo(-38, 4);
  ctx.closePath();
  ctx.fill();
  // Main wing.
  ctx.fillStyle = '#c93a30';
  ctx.beginPath();
  ctx.moveTo(-6, -4);
  ctx.lineTo(16, -30);
  ctx.lineTo(26, -28);
  ctx.lineTo(12, 0);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  const body = ctx.createLinearGradient(0, -12, 0, 12);
  body.addColorStop(0, '#ffe27a');
  body.addColorStop(0.55, CONFIG.planeBody);
  body.addColorStop(1, '#d99a1f');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-52, 0);
  ctx.quadraticCurveTo(-30, -13, 6, -11);
  ctx.quadraticCurveTo(40, -9, 52, 0);
  ctx.quadraticCurveTo(40, 9, 6, 11);
  ctx.quadraticCurveTo(-30, 13, -52, 0);
  ctx.closePath();
  ctx.fill();
  // Lit cockpit window.
  ctx.fillStyle = '#bfe8ff';
  ctx.beginPath();
  ctx.ellipse(26, -6, 13, 7, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(22, -8, 5, 2.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Courier stripe + parcel marking.
  ctx.fillStyle = CONFIG.planeAccent;
  ctx.fillRect(-34, -2, 62, 4);
  ctx.fillStyle = '#2b2f3a';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('COURIER 7', -30, -16);
  // Blinking navigation lights.
  const blink = Math.sin(time * 6) > 0;
  ctx.fillStyle = blink ? '#ff4444' : '#881111';
  ctx.beginPath();
  ctx.arc(-50, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = blink ? '#44ff88' : '#116633';
  ctx.beginPath();
  ctx.arc(50, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Boost flame.
  if (world.boostTime > 0) {
    ctx.fillStyle = 'rgba(255, 150, 40, 0.9)';
    ctx.beginPath();
    ctx.moveTo(-52, -6);
    ctx.lineTo(-52 - 26 - Math.random() * 14, 0);
    ctx.lineTo(-52, 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawGauge(ctx, cx, cy, radius, label, value, max, unit, color) {
  ctx.save();
  ctx.translate(cx, cy);
  // Lit dial face.
  const face = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
  face.addColorStop(0, '#2a3350');
  face.addColorStop(1, '#12172a');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  // Ticks.
  ctx.strokeStyle = 'rgba(220, 230, 255, 0.7)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (radius - 4), Math.sin(a) * (radius - 4));
    ctx.lineTo(Math.cos(a) * (radius - 10), Math.sin(a) * (radius - 10));
    ctx.stroke();
  }
  // Needle.
  const angle = Math.PI * 0.75 + (clamp(value / max, 0, 1)) * Math.PI * 1.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle) * (radius - 12), Math.sin(angle) * (radius - 12));
  ctx.stroke();
  ctx.fillStyle = '#e8ecff';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8ecff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, radius + 16);
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(`${Math.round(value)}${unit}`, 0, -radius + 16);
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawHud(ctx, world, time) {
  const { altitudeFt, speedKt, heading } = flightReadouts(world);
  // Top bar.
  ctx.fillStyle = 'rgba(10, 14, 28, 0.72)';
  ctx.fillRect(0, 0, 1280, 58);
  ctx.fillStyle = '#e8ecff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('STORM COURIER', 18, 24);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#9fb2e8';
  ctx.fillText('DELIVERY RUN 7  •  ARROWS/WASD FLY  •  SPACE BOOST', 18, 44);
  // Readouts, big and legible.
  const items = [
    ['ALT', `${altitudeFt} FT`, '#7dd8ff'],
    ['SPD', `${speedKt} KT`, '#ffd34d'],
    ['HDG', `${String(heading).padStart(3, '0')}°`, '#8dff9e'],
    ['TIME', `${Math.ceil(world.timeLeft)}s`, world.timeLeft < 20 ? '#ff6b5e' : '#e8ecff'],
    ['SCORE', `${world.score}`, '#e8ecff'],
  ];
  let x = 470;
  ctx.textAlign = 'left';
  for (const [label, value, color] of items) {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#9fb2e8';
    ctx.fillText(label, x, 22);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(value, x, 48);
    x += label === 'TIME' ? 130 : 150;
  }
  // Rings pill.
  ctx.fillStyle = 'rgba(255, 211, 77, 0.16)';
  ctx.strokeStyle = CONFIG.ringColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(1150, 12, 112, 34, 17);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = CONFIG.ringColor;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`◉ ${world.ringsCollected}/${CONFIG.ringCount}`, 1162, 36);
  // Route progress strip.
  ctx.fillStyle = 'rgba(10, 14, 28, 0.6)';
  ctx.fillRect(18, 66, 300, 10);
  ctx.fillStyle = '#ffd34d';
  ctx.fillRect(18, 66, 300 * clamp(world.routeX / CONFIG.routeLength, 0, 1), 10);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '11px sans-serif';
  ctx.fillText('ROUTE', 18, 88);
  ctx.fillStyle = '#ff6b5e';
  ctx.fillText('⚡ STORM AHEAD', 90, 88);
  // Turbulence warning.
  if (world.shake > 2) {
    const blink = Math.sin(time * 10) > 0;
    ctx.fillStyle = blink ? '#ff6b5e' : 'rgba(255,107,94,0.4)';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ TURBULENCE — HOLD STEADY ⚠', 640, 100);
    ctx.textAlign = 'left';
  }
  // Bottom instrument panel: lit dials + boost gauge.
  ctx.fillStyle = 'rgba(10, 14, 28, 0.78)';
  ctx.fillRect(0, 640, 1280, 80);
  ctx.strokeStyle = 'rgba(140, 160, 220, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 640);
  ctx.lineTo(1280, 640);
  ctx.stroke();
  drawGauge(ctx, 90, 676, 26, 'ALTITUDE', altitudeFt, 1200, '', '#7dd8ff');
  drawGauge(ctx, 210, 676, 26, 'SPEED', speedKt, 300, '', '#ffd34d');
  drawGauge(ctx, 330, 676, 26, 'HEADING', heading, 360, '°', '#8dff9e');
  // Artificial horizon mini.
  ctx.save();
  ctx.translate(450, 676);
  ctx.fillStyle = '#12172a';
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.clip();
  const roll = clamp(world.planeVy / CONFIG.climbSpeed, -1, 1) * 14;
  ctx.fillStyle = '#3a6ea8';
  ctx.fillRect(-26, -26 + roll, 52, 26 - roll);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-26, roll, 52, 26 - roll + 26);
  ctx.restore();
  ctx.strokeStyle = '#e8ecff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(18, 0);
  ctx.stroke();
  ctx.fillStyle = '#e8ecff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HORIZON', 0, 42);
  ctx.restore();
  // Boost gauge with lamps.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fb2e8';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('BOOST', 520, 662);
  const boostReady = world.boostCooldown <= 0;
  const boostFraction = world.boostTime > 0 ? world.boostTime / CONFIG.boostDuration : boostReady ? 1 : 1 - world.boostCooldown / (CONFIG.boostDuration + CONFIG.boostCooldown);
  ctx.fillStyle = '#1a2138';
  ctx.fillRect(520, 670, 180, 14);
  ctx.fillStyle = world.boostTime > 0 ? '#ff9a2e' : boostReady ? '#44ff88' : '#ffd34d';
  ctx.fillRect(520, 670, 180 * clamp(boostFraction, 0, 1), 14);
  ctx.strokeStyle = 'rgba(220,230,255,0.5)';
  ctx.strokeRect(520, 670, 180, 14);
  ctx.fillStyle = boostReady ? '#44ff88' : '#8a93ad';
  ctx.beginPath();
  ctx.arc(716, 677, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8ecff';
  ctx.font = '13px sans-serif';
  ctx.fillText(world.boostTime > 0 ? 'BOOSTING!' : boostReady ? 'READY — SPACE' : 'RECHARGING…', 732, 682);
  // Storm proximity lamp.
  const nearStorm = world.shake > 2;
  ctx.fillStyle = nearStorm ? (Math.sin(time * 8) > 0 ? '#ff4444' : '#881111') : '#22304a';
  ctx.beginPath();
  ctx.arc(868, 677, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8ecff';
  ctx.fillText('STORM LAMP', 884, 682);
  ctx.fillStyle = '#9fb2e8';
  ctx.font = '12px sans-serif';
  ctx.fillText('R restart  •  M mute', 1030, 664);
  ctx.fillText(`DISTANCE ${Math.round(world.distance)} m`, 1030, 684);
}

function drawTitle(ctx, time) {
  ctx.fillStyle = 'rgba(8, 10, 24, 0.55)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('STORM COURIER', 640, 240);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '28px sans-serif';
  ctx.fillText('Fly the storm route. Grab every ring. Land before the clock runs out.', 640, 292);
  ctx.fillStyle = '#9fb2e8';
  ctx.font = '20px sans-serif';
  ctx.fillText('ARROWS / WASD — steer      SPACE — boost      R — restart', 640, 340);
  ctx.fillText('Storm cells crash you. Rings add +2s. Runway 27 is at the end of the route.', 640, 372);
  const pulse = 0.6 + Math.sin(time * 4) * 0.4;
  ctx.fillStyle = `rgba(255, 211, 77, ${pulse})`;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('PRESS ENTER OR CLICK TO FLY', 640, 440);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, world, won, reason) {
  ctx.fillStyle = won ? 'rgba(10, 40, 20, 0.6)' : 'rgba(40, 10, 14, 0.6)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#44ff88' : '#ff6b5e';
  ctx.font = 'bold 58px sans-serif';
  ctx.fillText(won ? 'DELIVERED!' : 'RUN FAILED', 640, 280);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '24px sans-serif';
  ctx.fillText(
    won
      ? `Landed on runway 27 with ${world.ringsCollected}/${CONFIG.ringCount} rings — score ${world.score}.`
      : reason,
    640,
    330,
  );
  ctx.fillStyle = '#9fb2e8';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Score ${world.score}   •   Rings ${world.ringsCollected}/${CONFIG.ringCount}   •   Distance ${Math.round(world.distance)} m`, 640, 372);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', 640, 430);
  ctx.textAlign = 'left';
}

export function render(ctx, world, state, time, endReason) {
  ctx.clearRect(0, 0, 1280, 720);
  drawSky(ctx, world, time);
  drawTerrain(ctx, world);
  drawRings(ctx, world, time);
  drawStorms(ctx, world, time);
  if (state !== 'title') drawPlane(ctx, world, time);
  drawHud(ctx, world, time);
  if (state === 'title') drawTitle(ctx, time);
  if (state === 'win') drawEnd(ctx, world, true, '');
  if (state === 'lose') drawEnd(ctx, world, false, endReason);
}
