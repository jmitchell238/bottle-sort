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

  // faint shelf line
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, H - 78);
  ctx.lineTo(W - 24, H - 78);
  ctx.stroke();
}

function drawHud(ctx, levelNum, moveCount) {
  // level pill
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

  // moves pill
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

  // title chip center
  ctx.fillStyle = 'rgba(8,12,24,0.45)';
  roundRect(ctx, W / 2 - 52, 20, 104, 42, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,210,240,0.75)';
  ctx.font = '700 11px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BOTTLE SORT', W / 2, 45);
}

/**
 * Draw a single glass bottle with stacked neon liquid.
 * bottle: array of color ids bottom→top
 * rect: layout entry
 * opts: { selected, lift, dimTopUnits }
 */
function drawBottle(ctx, bottle, rect, opts = {}) {
  const { selected = false, lift = 0, hideTop = 0 } = opts;
  const cap = capacity || CAPACITY;
  const x = rect.x;
  const y = rect.y - lift;
  const w = rect.w;
  const h = rect.h;

  const neckH = h * 0.12;
  const bodyTop = y + neckH;
  const bodyH = h - neckH;
  const bodyW = w * 0.92;
  const bodyX = x + (w - bodyW) / 2;
  const corner = Math.min(14, bodyW * 0.28);

  // selection glow
  if (selected) {
    const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(selectPulse));
    ctx.save();
    ctx.shadowColor = `rgba(61,231,255,${0.35 + pulse * 0.45})`;
    ctx.shadowBlur = 18 + pulse * 10;
    ctx.strokeStyle = `rgba(61,231,255,${0.5 + pulse * 0.4})`;
    ctx.lineWidth = 3;
    roundRect(ctx, bodyX - 4, y - 4, bodyW + 8, h + 8, corner + 4);
    ctx.stroke();
    ctx.restore();
  }

  // liquid region (inside body, leave glass rim)
  const pad = Math.max(3, bodyW * 0.08);
  const innerX = bodyX + pad;
  const innerW = bodyW - pad * 2;
  const innerBottom = y + h - pad;
  const innerTop = bodyTop + pad * 0.6;
  const innerH = innerBottom - innerTop;
  const unitH = innerH / cap;

  // draw liquid units bottom-up
  const visible = bottle.slice(0, Math.max(0, bottle.length - hideTop));
  for (let i = 0; i < visible.length; i++) {
    const colorId = visible[i];
    const def = COLORS[colorId] || COLORS[0];
    const uy = innerBottom - (i + 1) * unitH;
    const isBottom = i === 0;
    const isTopVis = i === visible.length - 1;

    ctx.save();
    // clip to bottle body rounded shape
    roundRect(ctx, bodyX, bodyTop, bodyW, bodyH, corner);
    ctx.clip();

    // unit fill
    const g = ctx.createLinearGradient(innerX, uy, innerX + innerW, uy + unitH);
    g.addColorStop(0, shade(def.color, 30));
    g.addColorStop(0.45, def.color);
    g.addColorStop(1, shade(def.glow, -20));
    ctx.fillStyle = g;

    if (isBottom) {
      // rounded bottom of liquid
      const r = Math.min(corner * 0.7, unitH * 0.5, innerW * 0.35);
      roundRect(ctx, innerX, uy, innerW, unitH + 1, r);
      ctx.fill();
    } else {
      ctx.fillRect(innerX, uy, innerW, unitH + 0.5);
    }

    // top surface highlight for top unit
    if (isTopVis) {
      ctx.fillStyle = def.glow + '55';
      ctx.fillRect(innerX + 1, uy, innerW - 2, Math.max(2, unitH * 0.12));
      // soft glow above surface
      const glow = ctx.createRadialGradient(
        innerX + innerW / 2, uy, 2,
        innerX + innerW / 2, uy, innerW * 0.7
      );
      glow.addColorStop(0, def.glow + '40');
      glow.addColorStop(1, def.glow + '00');
      ctx.fillStyle = glow;
      ctx.fillRect(innerX - 4, uy - 8, innerW + 8, 16);
    }

    // segment separator
    if (i > 0) {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(innerX + 2, uy + unitH);
      ctx.lineTo(innerX + innerW - 2, uy + unitH);
      ctx.stroke();
    }
    ctx.restore();
  }

  // glass body stroke
  ctx.save();
  // glass fill (subtle)
  const glass = ctx.createLinearGradient(bodyX, bodyTop, bodyX + bodyW, bodyTop);
  glass.addColorStop(0, 'rgba(180,210,255,0.08)');
  glass.addColorStop(0.35, 'rgba(255,255,255,0.03)');
  glass.addColorStop(0.7, 'rgba(180,210,255,0.06)');
  glass.addColorStop(1, 'rgba(100,140,200,0.1)');
  ctx.fillStyle = glass;
  roundRect(ctx, bodyX, bodyTop, bodyW, bodyH, corner);
  ctx.fill();

  // outline
  ctx.strokeStyle = selected
    ? 'rgba(61,231,255,0.75)'
    : 'rgba(200,220,255,0.35)';
  ctx.lineWidth = selected ? 2.2 : 1.8;
  roundRect(ctx, bodyX, bodyTop, bodyW, bodyH, corner);
  ctx.stroke();

  // neck
  const neckW = bodyW * 0.42;
  const neckX = x + (w - neckW) / 2;
  ctx.fillStyle = 'rgba(180,210,255,0.07)';
  roundRect(ctx, neckX, y, neckW, neckH + 2, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,220,255,0.32)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, neckX, y, neckW, neckH + 2, 4);
  ctx.stroke();

  // lip
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(neckX - 1, y + 2);
  ctx.lineTo(neckX + neckW + 1, y + 2);
  ctx.stroke();

  // glass shine
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, bodyX + bodyW * 0.12, bodyTop + bodyH * 0.1, bodyW * 0.14, bodyH * 0.55, 6);
  ctx.fill();

  // complete bottle checkmark glow
  if (isBottleComplete(bottle, cap) && bottle.length === cap) {
    const def = COLORS[bottle[0]] || COLORS[0];
    ctx.strokeStyle = def.glow + 'aa';
    ctx.lineWidth = 2;
    ctx.shadowColor = def.glow;
    ctx.shadowBlur = 10;
    roundRect(ctx, bodyX - 2, bodyTop - 2, bodyW + 4, bodyH + 4, corner + 2);
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

  // lift source
  // stream path
  const x0 = fromR.cx;
  const y0 = fromR.y - 18;
  const x1 = toR.cx;
  const y1 = toR.y + toR.h * 0.12;

  // ease
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  ctx.save();
  ctx.strokeStyle = def.glow;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.35 + 0.45 * Math.sin(t * Math.PI);
  ctx.shadowColor = def.glow;
  ctx.shadowBlur = 12;

  const mx = (x0 + x1) / 2;
  const my = Math.min(y0, y1) - 30 - 20 * Math.sin(t * Math.PI);

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  // partial curve based on progress
  const steps = Math.max(2, Math.floor(18 * e));
  for (let i = 1; i <= steps; i++) {
    const u = i / 18;
    // quadratic bezier
    const px = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1;
    const py = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1;
    ctx.lineTo(px, py);
  }
  ctx.stroke();

  // droplet
  const u = e;
  const dx = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1;
  const dy = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1;
  const gr = ctx.createRadialGradient(dx, dy, 1, dx, dy, 10);
  gr.addColorStop(0, '#fff');
  gr.addColorStop(0.3, def.color);
  gr.addColorStop(1, def.glow + '00');
  ctx.fillStyle = gr;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(dx, dy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAllBottles(ctx) {
  for (let i = 0; i < bottles.length; i++) {
    const rect = layout[i];
    if (!rect) continue;
    let lift = 0;
    let hideTop = 0;
    if (selected === i) lift = 12;
    if (pourAnim && pourAnim.from === i) {
      lift = 16 * (1 - Math.min(1, pourAnim.t / pourAnim.duration));
      // liquid already moved; no hide needed
    }
    drawBottle(ctx, bottles[i], rect, {
      selected: selected === i,
      lift,
      hideTop,
    });
  }
  if (pourAnim) drawPourStream(ctx, pourAnim, layout);
}

function drawIdleDecor(ctx, now) {
  // menu idle: a few demo bottles
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
    // temporarily use capacity 4
    const prev = bottles;
    // draw without mutating game state — pass bottle directly
    drawBottle(ctx, demo[i], {
      ...demoLayout[i],
      y: demoLayout[i].y + 20,
    }, { selected: false, lift });
    void prev;
  }
}

function drawWinOverlayFlash(ctx) {
  if (winFlash <= 0) return;
  const a = Math.min(0.35, winFlash * 0.25);
  ctx.fillStyle = `rgba(125,255,180,${a})`;
  ctx.fillRect(0, 0, W, H);
}
