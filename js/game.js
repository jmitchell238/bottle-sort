'use strict';

// Game state machine: 'menu' | 'play' | 'win'
let state = 'menu';
let bottles = [];           // array of color-id stacks (0 = bottom)
let capacity = CAPACITY;
let level = 1;
let moves = 0;
let undos = 0;
let selected = -1;          // selected bottle index, or -1
let history = [];           // undo stack of cloned boards
let layout = [];            // bottle rects
let pourAnim = null;        // { from, to, color, units, t, duration, willWin, completedIdx }
let winFlash = 0;
let selectPulse = 0;
let hintFlash = 0;
let screenShake = 0;        // seconds remaining
let flashColor = null;      // { r,g,b,a life }
let completePulse = {};     // bottleIndex → pulse time remaining

// Visual mode for the active level
let activePalette = PALETTE_BOLD;
let showShapes = false;
let visualModeId = 'classic';
let visualTitle = null;
let visualTagline = null;

/** Resolve a color definition for the active palette. */
function colorOf(id) {
  const pal = activePalette || PALETTE_BOLD || COLORS;
  const i = id | 0;
  return pal[i] || pal[0] || PALETTE_BOLD[0];
}

function snapshotBoard() {
  return cloneBottles(bottles);
}

function pushHistory() {
  history.push(snapshotBoard());
  if (history.length > 200) history.shift();
}

function isFullMono(bottle, cap) {
  return bottle.length === cap && isBottleComplete(bottle, cap);
}

function applyVisualMode(lvl) {
  const pref = (save && save.visualPref) || 'auto';
  const mode = resolveVisualMode(lvl, pref);
  activePalette = mode.palette || PALETTE_BOLD;
  showShapes = !!mode.shapes;
  visualModeId = mode.id || 'classic';
  visualTitle = mode.title || null;
  visualTagline = mode.tagline || null;
  return mode;
}

function startLevel(lvl) {
  level = Math.max(1, lvl | 0);
  applyVisualMode(level);
  const gen = generateLevel(level);
  bottles = gen.bottles;
  capacity = gen.capacity;
  moves = 0;
  undos = 0;
  selected = -1;
  history = [];
  pourAnim = null;
  winFlash = 0;
  screenShake = 0;
  flashColor = null;
  completePulse = {};
  layout = layoutBottles(bottles.length, W, H);
  state = 'play';
  if (typeof clearParticles === 'function') clearParticles();
  if (typeof ensureAmbientMotes === 'function') ensureAmbientMotes(12 + Math.min(8, bottles.length));
  if (typeof sfxClick === 'function') sfxClick();
  if (typeof ensureAudio === 'function') ensureAudio();
  updatePlayChrome();
}

function restartLevel() {
  startLevel(level);
}

function tryUndo() {
  if (state !== 'play') return false;
  if (pourAnim) return false;
  if (!history.length) {
    if (typeof sfxInvalid === 'function') sfxInvalid();
    return false;
  }
  bottles = history.pop();
  selected = -1;
  undos += 1;
  completePulse = {};
  if (typeof sfxUndo === 'function') sfxUndo();
  updatePlayChrome();
  return true;
}

function bottleCenter(idx) {
  const r = layout[idx];
  if (!r) return { x: W / 2, y: H / 2 };
  return { x: r.cx, y: r.y + r.h * 0.55 };
}

function fxSelect(idx) {
  const c = bottleCenter(idx);
  const top = bottleTop(bottles[idx]);
  if (top == null) return;
  if (typeof spawnSparks === 'function') spawnSparks(c.x, c.y - 20, top, 6);
}

function fxPourStart(fromIdx, toIdx, colorId, units) {
  const a = bottleCenter(fromIdx);
  if (typeof spawnSparks === 'function') spawnSparks(a.x, a.y - 30, colorId, 4 + units);
}

function fxPourLand(toIdx, colorId, units, completed) {
  const c = bottleCenter(toIdx);
  const r = layout[toIdx];
  const splashY = r ? r.y + r.h * 0.35 : c.y;
  if (typeof spawnSplash === 'function') spawnSplash(c.x, splashY, colorId, 6 + units * 2);
  if (typeof spawnSparks === 'function') spawnSparks(c.x, splashY, colorId, 8 + units);
  if (typeof sfxSplash === 'function') sfxSplash();

  if (completed) {
    completePulse[toIdx] = 0.7;
    screenShake = Math.max(screenShake, 0.18);
    if (typeof spawnRing === 'function') spawnRing(c.x, c.y, colorId);
    if (typeof spawnSparks === 'function') spawnSparks(c.x, c.y, colorId, 16);
    if (typeof sfxComplete === 'function') sfxComplete();
    flashColor = { life: 0.22, maxLife: 0.22, colorId };
  } else {
    screenShake = Math.max(screenShake, 0.06);
  }
}

function fxWin() {
  winFlash = 1.6;
  screenShake = 0.35;
  if (typeof spawnConfetti === 'function') spawnConfetti(70);
  // ring each completed bottle
  for (let i = 0; i < bottles.length; i++) {
    if (isFullMono(bottles[i], capacity)) {
      const c = bottleCenter(i);
      const col = bottles[i][0];
      if (typeof spawnRing === 'function') spawnRing(c.x, c.y, col);
    }
  }
}

/**
 * Handle a tap on bottle index `idx`.
 * Returns a status string: 'select' | 'deselect' | 'pour' | 'invalid' | 'busy' | 'win'
 */
function tapBottle(idx) {
  if (state !== 'play') return 'busy';
  if (pourAnim) return 'busy';
  if (idx < 0 || idx >= bottles.length) return 'invalid';

  // First selection
  if (selected < 0) {
    if (!bottles[idx].length) {
      if (typeof sfxInvalid === 'function') sfxInvalid();
      return 'invalid';
    }
    selected = idx;
    if (typeof sfxSelect === 'function') sfxSelect();
    fxSelect(idx);
    return 'select';
  }

  // Tap same → deselect
  if (selected === idx) {
    selected = -1;
    if (typeof sfxClick === 'function') sfxClick();
    return 'deselect';
  }

  // Try pour selected → idx
  const from = bottles[selected];
  const to = bottles[idx];
  const amount = pourAmount(from, to, capacity);
  if (amount <= 0) {
    if (to.length > 0) {
      selected = idx;
      if (typeof sfxSelect === 'function') sfxSelect();
      fxSelect(idx);
      return 'select';
    }
    if (typeof sfxInvalid === 'function') sfxInvalid();
    // tiny red shake on invalid
    screenShake = Math.max(screenShake, 0.08);
    return 'invalid';
  }

  const color = bottleTop(from);
  const wasComplete = isFullMono(to, capacity);
  pushHistory();
  const fromIdx = selected;
  selected = -1;

  pour(from, to, capacity);
  moves += 1;

  const nowComplete = !wasComplete && isFullMono(to, capacity);
  const won = isSolved(bottles, capacity);

  pourAnim = {
    from: fromIdx,
    to: idx,
    color,
    units: amount,
    t: 0,
    duration: POUR_DUR,
    willWin: won,
    completedIdx: nowComplete ? idx : -1,
    landed: false,
  };

  fxPourStart(fromIdx, idx, color, amount);
  if (typeof sfxPour === 'function') sfxPour(amount);
  updatePlayChrome();

  return won ? 'win' : 'pour';
}

function finishWin() {
  state = 'win';
  fxWin();
  if (typeof sfxWin === 'function') sfxWin();
  recordLevelWin(level, moves, undos);
  updateMenuStats();
  if (typeof showWin === 'function') showWin();
}

function updatePlay(dt) {
  selectPulse += dt * SELECT_PULSE;
  if (hintFlash > 0) hintFlash = Math.max(0, hintFlash - dt);
  if (screenShake > 0) screenShake = Math.max(0, screenShake - dt);
  if (flashColor) {
    flashColor.life -= dt;
    if (flashColor.life <= 0) flashColor = null;
  }
  for (const k of Object.keys(completePulse)) {
    completePulse[k] -= dt;
    if (completePulse[k] <= 0) delete completePulse[k];
  }

  if (typeof ensureAmbientMotes === 'function') ensureAmbientMotes(10 + Math.min(10, bottles.length));
  if (typeof updateParticles === 'function') updateParticles(dt);

  if (pourAnim) {
    pourAnim.t += dt;
    const t = Math.min(1, pourAnim.t / pourAnim.duration);

    // stream sparks mid-pour
    if (typeof spawnStreamSpark === 'function' && layout[pourAnim.from] && layout[pourAnim.to]) {
      const fromR = layout[pourAnim.from];
      const toR = layout[pourAnim.to];
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x0 = fromR.cx;
      const y0 = fromR.y - 20;
      const x1 = toR.cx;
      const y1 = toR.y + toR.h * 0.1;
      const mx = (x0 + x1) / 2;
      const my = Math.min(y0, y1) - 36;
      const u = e;
      const px = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1;
      const py = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1;
      if (Math.random() < 0.65) spawnStreamSpark(px, py, pourAnim.color);
    }

    // land FX once near end of pour
    if (!pourAnim.landed && t >= 0.72) {
      pourAnim.landed = true;
      fxPourLand(
        pourAnim.to,
        pourAnim.color,
        pourAnim.units,
        pourAnim.completedIdx >= 0
      );
    }

    if (pourAnim.t >= pourAnim.duration) {
      const won = pourAnim.willWin;
      pourAnim = null;
      if (won) finishWin();
    }
  }
}

function updateMenuStats() {
  if (typeof document === 'undefined' || !document.getElementById) return;
  const bestEl = document.getElementById('statBest');
  const gamesEl = document.getElementById('statGames');
  const movesEl = document.getElementById('statMoves');
  if (bestEl) bestEl.textContent = String(save.bestLevel);
  if (gamesEl) gamesEl.textContent = String(save.games);
  if (movesEl) movesEl.textContent = String(save.totalMoves);
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) muteBtn.textContent = save.muted ? '🔇 Sound off' : '🔊 Sound on';
  if (typeof syncModeChips === 'function') syncModeChips();
}

function updatePlayChrome() {
  if (typeof document === 'undefined' || !document.getElementById) return;
  const lv = document.getElementById('hudLevel');
  const mv = document.getElementById('hudMoves');
  if (lv) lv.textContent = String(level);
  if (mv) mv.textContent = String(moves);
  const undoBtn = document.getElementById('btnUndo');
  if (undoBtn) undoBtn.disabled = history.length === 0 || !!pourAnim;
  const hint = document.getElementById('playHint');
  if (hint) {
    if (showShapes) {
      hint.textContent = 'Shape Help · match colors (icons help too)';
    } else if (visualModeId === 'neon') {
      hint.textContent = 'Neon Mix · tap a bottle · pour';
    } else {
      hint.textContent = 'Tap a bottle · tap another to pour';
    }
  }
}

function stageFromClient(clientX, clientY, cvEl) {
  const el = cvEl || (typeof cv !== 'undefined' ? cv : null);
  if (!el) return { x: 0, y: 0 };
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: -1, y: -1 };
  const x = ((clientX - rect.left) / rect.width) * W;
  const y = ((clientY - rect.top) / rect.height) * H;
  return { x, y };
}

function bottleAtClient(clientX, clientY, cvEl) {
  const { x, y } = stageFromClient(clientX, clientY, cvEl);
  if (x < 0 || y < 0) return -1;
  return hitTestBottle(layout, x, y, {
    selected,
    lift: 14,
    padX: 16,
    padY: 22,
  });
}

function handleStageTap(clientX, clientY, cvEl) {
  if (state !== 'play') return null;
  if (pourAnim) return 'busy';
  const idx = bottleAtClient(clientX, clientY, cvEl);
  if (idx < 0) {
    if (selected >= 0) {
      selected = -1;
      if (typeof sfxClick === 'function') sfxClick();
      return 'deselect';
    }
    return null;
  }
  return tapBottle(idx);
}

/** Screen shake offset for render. */
function getShakeOffset() {
  if (screenShake <= 0) return { x: 0, y: 0 };
  const mag = 5 * (screenShake / 0.35);
  return {
    x: (Math.random() * 2 - 1) * mag,
    y: (Math.random() * 2 - 1) * mag,
  };
}
