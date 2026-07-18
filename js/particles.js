'use strict';

/**
 * Lightweight particle / VFX system for Bottle Sort.
 * Types: spark, blob, confetti, ring, star, mote
 */
const particles = [];
const MAX_PARTICLES = 280;

function clearParticles() {
  particles.length = 0;
}

function pushParticle(p) {
  if (particles.length >= MAX_PARTICLES) {
    // Drop oldest non-mote first
    const i = particles.findIndex(x => x.kind !== 'mote');
    if (i >= 0) particles.splice(i, 1);
    else particles.shift();
  }
  particles.push(p);
}

function randRange(a, b) {
  return a + Math.random() * (b - a);
}

function colorHex(colorId) {
  const def = COLORS[colorId] || COLORS[0];
  return { color: def.color, glow: def.glow };
}

/** Small sparks at a point (pour splash, select). */
function spawnSparks(x, y, colorId, count = 10) {
  const { color, glow } = colorHex(colorId);
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = randRange(40, 180);
    pushParticle({
      kind: 'spark',
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - randRange(20, 80),
      life: randRange(0.25, 0.55),
      maxLife: 0.55,
      r: randRange(1.5, 3.5),
      color, glow,
      g: 420,
    });
  }
}

/** Soft liquid blobs (pour landing). */
function spawnSplash(x, y, colorId, count = 8) {
  const { color, glow } = colorHex(colorId);
  for (let i = 0; i < count; i++) {
    const ang = -Math.PI / 2 + randRange(-1.1, 1.1);
    const sp = randRange(60, 200);
    pushParticle({
      kind: 'blob',
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: randRange(0.35, 0.7),
      maxLife: 0.7,
      r: randRange(3, 7),
      color, glow,
      g: 520,
    });
  }
}

/** Expanding ring when a bottle completes. */
function spawnRing(x, y, colorId) {
  const { color, glow } = colorHex(colorId);
  pushParticle({
    kind: 'ring',
    x, y,
    vx: 0, vy: 0,
    life: 0.55,
    maxLife: 0.55,
    r: 8,
    rMax: 52,
    color, glow,
    g: 0,
  });
  // star burst
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + randRange(-0.1, 0.1);
    const sp = randRange(90, 220);
    pushParticle({
      kind: 'star',
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: randRange(0.4, 0.75),
      maxLife: 0.75,
      r: randRange(2.5, 5),
      color, glow,
      g: 80,
      spin: randRange(-8, 8),
      rot: Math.random() * Math.PI,
    });
  }
}

/** Stream sparks along a pour path (called each frame while pouring). */
function spawnStreamSpark(x, y, colorId) {
  if (particles.length > MAX_PARTICLES - 20) return;
  const { color, glow } = colorHex(colorId);
  pushParticle({
    kind: 'spark',
    x: x + randRange(-4, 4),
    y: y + randRange(-4, 4),
    vx: randRange(-30, 30),
    vy: randRange(-20, 40),
    life: randRange(0.15, 0.35),
    maxLife: 0.35,
    r: randRange(1.2, 2.8),
    color, glow,
    g: 200,
  });
}

/** Level-clear confetti from top. */
function spawnConfetti(count = 60) {
  for (let i = 0; i < count; i++) {
    const colorId = Math.floor(Math.random() * Math.min(8, COLORS.length));
    const { color, glow } = colorHex(colorId);
    pushParticle({
      kind: 'confetti',
      x: randRange(20, W - 20),
      y: randRange(-40, 40),
      vx: randRange(-60, 60),
      vy: randRange(80, 220),
      life: randRange(1.4, 2.4),
      maxLife: 2.4,
      r: randRange(3, 6),
      color, glow,
      g: 280,
      spin: randRange(-12, 12),
      rot: Math.random() * Math.PI,
      w: randRange(4, 9),
      h: randRange(6, 12),
    });
  }
  // center firework
  spawnRing(W / 2, H * 0.38, Math.floor(Math.random() * 6));
  spawnSparks(W / 2, H * 0.38, 0, 18);
  spawnSparks(W / 2, H * 0.38, 5, 14);
}

/** Gentle floating motes in the playfield. */
function ensureAmbientMotes(target = 14) {
  let n = 0;
  for (const p of particles) if (p.kind === 'mote') n++;
  while (n < target) {
    const colorId = Math.floor(Math.random() * 6);
    const { color, glow } = colorHex(colorId);
    pushParticle({
      kind: 'mote',
      x: randRange(20, W - 20),
      y: randRange(80, H - 60),
      vx: randRange(-12, 12),
      vy: randRange(-18, -4),
      life: randRange(3, 7),
      maxLife: 7,
      r: randRange(1, 2.2),
      color, glow,
      g: 0,
      phase: Math.random() * Math.PI * 2,
    });
    n++;
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      // recycle ambient motes
      if (p.kind === 'mote') {
        p.life = p.maxLife;
        p.x = randRange(20, W - 20);
        p.y = H - 40;
        continue;
      }
      particles.splice(i, 1);
      continue;
    }

    if (p.kind === 'mote') {
      p.phase = (p.phase || 0) + dt * 1.4;
      p.x += (p.vx + Math.sin(p.phase) * 18) * dt;
      p.y += p.vy * dt;
      if (p.y < 60) p.y = H - 50;
      if (p.x < 10) p.x = W - 12;
      if (p.x > W - 10) p.x = 12;
      continue;
    }

    p.vy += (p.g || 0) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.spin) p.rot = (p.rot || 0) + p.spin * dt;

    if (p.kind === 'ring') {
      const t = 1 - p.life / p.maxLife;
      p.r = p.rMax * (0.15 + 0.85 * t);
    }

    // light drag
    p.vx *= 1 - 1.6 * dt;
  }
}

function drawParticles(ctx) {
  for (const p of particles) {
    const a = Math.max(0, Math.min(1, p.life / Math.max(0.01, p.maxLife * 0.85)));
    ctx.save();
    ctx.globalAlpha = a;

    if (p.kind === 'ring') {
      ctx.strokeStyle = p.glow;
      ctx.lineWidth = 3 * a;
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = a * 0.35;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'star') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 8;
      const s = p.r;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const ox = Math.cos(ang) * s;
        const oy = Math.sin(ang) * s;
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        const ang2 = ang + Math.PI / 4;
        ctx.lineTo(Math.cos(ang2) * s * 0.35, Math.sin(ang2) * s * 0.35);
      }
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === 'confetti') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 6;
      ctx.fillRect(-(p.w || 5) / 2, -(p.h || 8) / 2, p.w || 5, p.h || 8);
    } else if (p.kind === 'blob') {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.4);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.35, p.color);
      g.addColorStop(1, p.glow + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 1.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // spark / mote
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = p.kind === 'mote' ? 6 : 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      if (p.kind === 'spark') {
        ctx.globalAlpha = a * 0.7;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
