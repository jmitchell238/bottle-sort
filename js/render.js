'use strict';

function resizeCanvas(cv) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const scale = Math.min(maxW / W, maxH / H);
  const cssW = Math.floor(W * scale);
  const cssH = Math.floor(H * scale);
  cv.style.width = cssW + 'px';
  cv.style.height = cssH + 'px';
  cv.width = Math.floor(W * dpr);
  cv.height = Math.floor(H * dpr);
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, scale, cssW, cssH };
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function shade(hex, amt) {
  const n = hex.replace('#', '');
  const num = parseInt(n.length === 3
    ? n.split('').map(c => c + c).join('')
    : n, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

function hexAlpha(hex, a) {
  const n = hex.replace('#', '');
  const full = n.length === 3 ? n.split('').map(c => c + c).join('') : n;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}

function drawBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a1024');
  g.addColorStop(0.5, '#0d1530');
  g.addColorStop(1, '#080c18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const a = ctx.createRadialGradient(70, 90, 10, 70, 90, 240);
  a.addColorStop(0, 'rgba(61,231,255,0.12)');
  a.addColorStop(1, 'rgba(61,231,255,0)');
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, W, H);

  const b = ctx.createRadialGradient(W - 50, H - 100, 10, W - 50, H - 100, 280);
  b.addColorStop(0, 'rgba(255,79,216,0.1)');
  b.addColorStop(1, 'rgba(255,79,216,0)');
  ctx.fillStyle = b;
  ctx.fillRect(0, 0, W, H);

  // shelf
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, H - 78);
  ctx.lineTo(W - 24, H - 78);
  ctx.stroke();
  ctx.fillStyle = 'rgba(61,231,255,0.04)';
  ctx.fillRect(20, H - 78, W - 40, 10);
}

function drawHud(ctx, levelNum, moveCount) {
  ctx.fillStyle = 'rgba(8,12,24,0.55)';
  roundRect(ctx, 14, 14, 120, 54, 14);
  ctx.fill();
  ctx.fillStyle = 'rgba(148,160,194,0.95)';
  ctx.font = '700 11px system-ui,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LEVEL', 28, 32);
  ctx.fillStyle = '#fff';
  ctx.font = '800 22px system-ui,sans-serif';
  ctx.fillText(String(levelNum), 28, 54);

  ctx.fillStyle = 'rgba(8,12,24,0.55)';
  roundRect(ctx, W - 134, 14, 120, 54, 14);
  ctx.fill();
  ctx.fillStyle = 'rgba(148,160,194,0.95)';
  ctx.font = '700 11px system-ui,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('MOVES', W - 28, 32);
  ctx.fillStyle = '#ffd56a';
  ctx.font = '800 22px system-ui,sans-serif';
  ctx.fillText(String(moveCount), W - 28, 54);

  ctx.fillStyle = 'rgba(8,12,24,0.45)';
  roundRect(ctx, W / 2 - 52, 20, 104, 42, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,210,240,0.75)';
  ctx.font = '700 11px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BOTTLE SORT', W / 2, 45);
}

/**
 * Geometry for a bottle drawn inside rect (with optional lift applied to y).
 * Returns measurements used by both path + liquid fill.
 */
function bottleGeom(rect, lift = 0) {
  const x = rect.x;
  const y = rect.y - lift;
  const w = rect.w;
  const h = rect.h;

  const lipH = Math.max(4, h * 0.035);
  const neckH = h * 0.11;
  const shoulderH = h * 0.08;
  const bodyTop = y + lipH + neckH + shoulderH;
  const bodyBottom = y + h;
  const bodyH = bodyBottom - bodyTop;

  const bodyW = w * 0.88;
  const bodyX = x + (w - bodyW) / 2;
  const neckW = bodyW * 0.38;
  const neckX = x + (w - neckW) / 2;
  const lipW = neckW * 1.28;
  const lipX = x + (w - lipW) / 2;

  const corner = Math.min(bodyW * 0.42, bodyH * 0.18, 22);
  const cx = x + w / 2;

  // Liquid lives in the body with a small glass rim inset
  const inset = Math.max(2.5, bodyW * 0.07);
  const liquidX = bodyX + inset;
  const liquidW = bodyW - inset * 2;
  const liquidBottom = bodyBottom - inset * 0.9;
  const liquidTop = bodyTop + inset * 0.35;
  const liquidH = liquidBottom - liquidTop;

  return {
    x, y, w, h, cx,
    lipH, neckH, shoulderH,
    bodyTop, bodyBottom, bodyH, bodyW, bodyX,
    neckW, neckX, lipW, lipX, corner,
    liquidX, liquidW, liquidTop, liquidBottom, liquidH,
  };
}

/** Outer glass silhouette path (closed). */
function pathBottleOuter(ctx, g) {
  const {
    lipX, lipW, lipH, y,
    neckX, neckW, neckH,
    bodyX, bodyW, bodyTop, bodyBottom, corner,
  } = g;
  const shoulderY = y + lipH + neckH;

  ctx.beginPath();
  // lip top
  ctx.moveTo(lipX, y + lipH * 0.35);
  ctx.lineTo(lipX + lipW, y + lipH * 0.35);
  // lip right down into neck
  ctx.lineTo(neckX + neckW, y + lipH);
  ctx.lineTo(neckX + neckW, shoulderY);
  // shoulder curve out to body
  ctx.quadraticCurveTo(neckX + neckW, bodyTop, bodyX + bodyW, bodyTop + corner * 0.15);
  // right side down
  ctx.lineTo(bodyX + bodyW, bodyBottom - corner);
  // rounded bottom
  ctx.quadraticCurveTo(bodyX + bodyW, bodyBottom, bodyX + bodyW - corner, bodyBottom);
  ctx.lineTo(bodyX + corner, bodyBottom);
  ctx.quadraticCurveTo(bodyX, bodyBottom, bodyX, bodyBottom - corner);
  // left side up
  ctx.lineTo(bodyX, bodyTop + corner * 0.15);
  // shoulder into neck
  ctx.quadraticCurveTo(neckX, bodyTop, neckX, shoulderY);
  ctx.lineTo(neckX, y + lipH);
  ctx.lineTo(lipX, y + lipH * 0.35);
  ctx.closePath();
}

/** Interior clip path for liquid (slightly inset body + rounded bottom). */
function pathBottleInner(ctx, g) {
  const { liquidX, liquidW, liquidTop, liquidBottom } = g;
  const r = Math.min(liquidW * 0.42, 16);
  ctx.beginPath();
  ctx.moveTo(liquidX, liquidTop);
  ctx.lineTo(liquidX + liquidW, liquidTop);
  ctx.lineTo(liquidX + liquidW, liquidBottom - r);
  ctx.quadraticCurveTo(liquidX + liquidW, liquidBottom, liquidX + liquidW - r, liquidBottom);
  ctx.lineTo(liquidX + r, liquidBottom);
  ctx.quadraticCurveTo(liquidX, liquidBottom, liquidX, liquidBottom - r);
  ctx.closePath();
}

/**
 * Draw one liquid unit as a soft capsule / rounded slab (not a hard rect).
 * i = 0 is bottom unit.
 */
function drawLiquidUnit(ctx, g, colorId, i, unitH, isBottom, isTop) {
  const def = COLORS[colorId] || COLORS[0];
  const { liquidX, liquidW, liquidBottom } = g;
  const uy = liquidBottom - (i + 1) * unitH;
  const uh = unitH + 0.6; // slight overlap kills seams
  const rSide = Math.min(liquidW * 0.48, uh * 0.45, 14);
  const rBot = isBottom ? Math.min(liquidW * 0.42, uh * 0.55, 16) : rSide * 0.6;

  ctx.save();

  // soft outer glow (sits behind, clipped by caller)
  if (isTop) {
    const glow = ctx.createRadialGradient(
      liquidX + liquidW / 2, uy + uh * 0.2, 2,
      liquidX + liquidW / 2, uy + uh * 0.2, liquidW * 0.85
    );
    glow.addColorStop(0, hexAlpha(def.glow, 0.45));
    glow.addColorStop(1, hexAlpha(def.glow, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(liquidX - 6, uy - 10, liquidW + 12, uh + 16);
  }

  // body gradient — vertical depth + horizontal cylinder shading
  const grad = ctx.createLinearGradient(liquidX, uy, liquidX + liquidW, uy);
  grad.addColorStop(0, shade(def.glow, -35));
  grad.addColorStop(0.18, def.color);
  grad.addColorStop(0.5, shade(def.color, 40));
  grad.addColorStop(0.82, def.glow);
  grad.addColorStop(1, shade(def.glow, -40));
  ctx.fillStyle = grad;

  // Rounded capsule path
  const x0 = liquidX;
  const x1 = liquidX + liquidW;
  const y0 = uy;
  const y1 = uy + uh;
  const rt = isTop ? Math.min(rSide, uh * 0.4) : 1.5;
  const rb = isBottom ? rBot : 1.5;

  ctx.beginPath();
  ctx.moveTo(x0 + rt, y0);
  ctx.lineTo(x1 - rt, y0);
  ctx.quadraticCurveTo(x1, y0, x1, y0 + rt);
  ctx.lineTo(x1, y1 - rb);
  ctx.quadraticCurveTo(x1, y1, x1 - rb, y1);
  ctx.lineTo(x0 + rb, y1);
  ctx.quadraticCurveTo(x0, y1, x0, y1 - rb);
  ctx.lineTo(x0, y0 + rt);
  ctx.quadraticCurveTo(x0, y0, x0 + rt, y0);
  ctx.closePath();
  ctx.fill();

  // meniscus / surface for top unit
  if (isTop) {
    ctx.beginPath();
    ctx.ellipse(
      liquidX + liquidW / 2,
      uy + Math.max(2, uh * 0.08),
      liquidW * 0.42,
      Math.max(2.5, uh * 0.12),
      0, 0, Math.PI * 2
    );
    const men = ctx.createRadialGradient(
      liquidX + liquidW * 0.4, uy, 1,
      liquidX + liquidW / 2, uy + 2, liquidW * 0.5
    );
    men.addColorStop(0, 'rgba(255,255,255,0.55)');
    men.addColorStop(0.4, hexAlpha(def.color, 0.55));
    men.addColorStop(1, hexAlpha(def.glow, 0.15));
    ctx.fillStyle = men;
    ctx.fill();
  }

  // left glass highlight stripe on liquid
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  const hx = liquidX + liquidW * 0.16;
  const hw = Math.max(2, liquidW * 0.1);
  ctx.ellipse(
    hx, uy + uh * 0.5,
    hw, uh * 0.38,
    0, 0, Math.PI * 2
  );
  ctx.fill();

  // soft separator toward the unit above (not on top surface)
  if (!isTop) {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(liquidX + 3, uy);
    ctx.lineTo(liquidX + liquidW - 3, uy);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw a single glass bottle with stacked neon liquid.
 */
function drawBottle(ctx, bottle, rect, opts = {}) {
  const { selected = false, lift = 0, hideTop = 0, completeBoost = 0 } = opts;
  const cap = capacity || CAPACITY;
  const g = bottleGeom(rect, lift);

  // selection glow under the bottle
  if (selected) {
    const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(selectPulse));
    ctx.save();
    ctx.shadowColor = `rgba(61,231,255,${0.4 + pulse * 0.45})`;
    ctx.shadowBlur = 20 + pulse * 12;
    ctx.strokeStyle = `rgba(61,231,255,${0.55 + pulse * 0.4})`;
    ctx.lineWidth = 3.5;
    pathBottleOuter(ctx, g);
    ctx.stroke();
    ctx.restore();
  }

  // just-completed pulse halo
  if (completeBoost > 0 && bottle.length === cap) {
    const def = COLORS[bottle[0]] || COLORS[0];
    const t = Math.min(1, completeBoost / 0.7);
    ctx.save();
    ctx.shadowColor = def.glow;
    ctx.shadowBlur = 18 + 24 * t;
    ctx.strokeStyle = hexAlpha(def.glow, 0.35 + 0.55 * t);
    ctx.lineWidth = 2 + 3 * t;
    pathBottleOuter(ctx, g);
    ctx.stroke();
    ctx.restore();
  }

  // 1) faint inner glass fill (empty look)
  ctx.save();
  pathBottleOuter(ctx, g);
  ctx.clip();
  const empty = ctx.createLinearGradient(g.bodyX, g.y, g.bodyX + g.bodyW, g.y);
  empty.addColorStop(0, 'rgba(160,200,255,0.07)');
  empty.addColorStop(0.45, 'rgba(255,255,255,0.03)');
  empty.addColorStop(1, 'rgba(120,160,220,0.08)');
  ctx.fillStyle = empty;
  ctx.fillRect(g.x - 4, g.y - 4, g.w + 8, g.h + 8);
  ctx.restore();

  // 2) liquid — clipped to bottle interior
  const visible = bottle.slice(0, Math.max(0, bottle.length - hideTop));
  if (visible.length) {
    const unitH = g.liquidH / cap;
    ctx.save();
    pathBottleInner(ctx, g);
    ctx.clip();

    for (let i = 0; i < visible.length; i++) {
      drawLiquidUnit(
        ctx, g, visible[i], i, unitH,
        i === 0,
        i === visible.length - 1
      );
    }
    ctx.restore();
  }

  // 3) glass outline + neck/lip on top so liquid reads as "inside"
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // outer stroke
  pathBottleOuter(ctx, g);
  ctx.strokeStyle = selected
    ? 'rgba(160,235,255,0.9)'
    : 'rgba(200,220,255,0.55)';
  ctx.lineWidth = selected ? 2.4 : 2;
  ctx.stroke();

  // inner rim hint
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  pathBottleInner(ctx, g);
  ctx.stroke();

  // lip highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.lipX + 1, g.y + g.lipH * 0.4);
  ctx.lineTo(g.lipX + g.lipW - 1, g.y + g.lipH * 0.4);
  ctx.stroke();

  // vertical glass shine
  const shine = ctx.createLinearGradient(g.bodyX, g.bodyTop, g.bodyX + g.bodyW * 0.35, g.bodyTop);
  shine.addColorStop(0, 'rgba(255,255,255,0)');
  shine.addColorStop(0.4, 'rgba(255,255,255,0.22)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.ellipse(
    g.bodyX + g.bodyW * 0.28,
    g.bodyTop + g.bodyH * 0.42,
    g.bodyW * 0.1,
    g.bodyH * 0.32,
    0, 0, Math.PI * 2
  );
  ctx.fill();

  // complete bottle glow
  if (isBottleComplete(bottle, cap) && bottle.length === cap) {
    const def = COLORS[bottle[0]] || COLORS[0];
    ctx.shadowColor = def.glow;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = hexAlpha(def.glow, 0.75);
    ctx.lineWidth = 2.2;
    pathBottleOuter(ctx, g);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

/**
 * Draw pour stream animation between two bottles.
 */
function drawPourStream(ctx, anim, layoutArr) {
  if (!anim) return;
  const fromR = layoutArr[anim.from];
  const toR = layoutArr[anim.to];
  if (!fromR || !toR) return;

  const t = Math.min(1, anim.t / anim.duration);
  const def = COLORS[anim.color] || COLORS[0];
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const x0 = fromR.cx;
  const y0 = fromR.y - 20;
  const x1 = toR.cx;
  const y1 = toR.y + toR.h * 0.1;
  const mx = (x0 + x1) / 2;
  const my = Math.min(y0, y1) - 36 - 16 * Math.sin(t * Math.PI);

  ctx.save();
  ctx.strokeStyle = def.glow;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.3 + 0.5 * Math.sin(t * Math.PI);
  ctx.shadowColor = def.glow;
  ctx.shadowBlur = 14;

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  const steps = Math.max(2, Math.floor(20 * e));
  for (let i = 1; i <= steps; i++) {
    const u = i / 20;
    const px = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1;
    const py = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1;
    ctx.lineTo(px, py);
  }
  ctx.stroke();

  const u = e;
  const dx = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1;
  const dy = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1;
  const gr = ctx.createRadialGradient(dx, dy, 1, dx, dy, 12);
  gr.addColorStop(0, '#fff');
  gr.addColorStop(0.35, def.color);
  gr.addColorStop(1, hexAlpha(def.glow, 0));
  ctx.fillStyle = gr;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(dx, dy, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAllBottles(ctx) {
  for (let i = 0; i < bottles.length; i++) {
    const rect = layout[i];
    if (!rect) continue;
    let lift = 0;
    if (selected === i) lift = 14;
    if (pourAnim && pourAnim.from === i) {
      lift = 18 * (1 - Math.min(1, pourAnim.t / pourAnim.duration));
    }
    // complete-pulse scales the glow
    const pulse = (typeof completePulse !== 'undefined' && completePulse[i]) || 0;
    drawBottle(ctx, bottles[i], rect, {
      selected: selected === i,
      lift,
      completeBoost: pulse,
    });
  }
  if (pourAnim) drawPourStream(ctx, pourAnim, layout);
}

function drawIdleDecor(ctx, now) {
  const demo = [
    [0, 0, 1, 2],
    [1, 2, 2, 1],
    [0, 1],
    [],
    [2, 2, 0, 0],
  ];
  const demoLayout = layoutBottles(demo.length, W, H);
  const t = now / 1000;
  for (let i = 0; i < demo.length; i++) {
    const lift = Math.sin(t * 1.3 + i) * 4;
    drawBottle(ctx, demo[i], {
      ...demoLayout[i],
      y: demoLayout[i].y + 20,
    }, { selected: false, lift });
  }
}

function drawWinOverlayFlash(ctx) {
  if (winFlash <= 0) return;
  const a = Math.min(0.35, winFlash * 0.25);
  ctx.fillStyle = `rgba(125,255,180,${a})`;
  ctx.fillRect(0, 0, W, H);
}

function drawColorFlash(ctx) {
  if (!flashColor || flashColor.life <= 0) return;
  const def = COLORS[flashColor.colorId] || COLORS[0];
  const a = Math.min(0.28, (flashColor.life / flashColor.maxLife) * 0.28);
  // parse glow to rgb-ish via canvas-friendly hex+alpha helper
  ctx.fillStyle = hexAlpha(def.glow, a);
  ctx.fillRect(0, 0, W, H);
}
