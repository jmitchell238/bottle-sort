'use strict';

const cv = document.getElementById('cv');
const stage = document.getElementById('stage');
let ctx = null;
let last = performance.now();
// Suppress duplicate touch after pointer (iOS/Android fire both)
let lastPointerHandledAt = 0;

function setScreen(name) {
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.toggle('hidden', el.dataset.screen !== name);
  });
  document.querySelectorAll('.play-chrome').forEach(el => {
    el.classList.toggle('hidden', name !== 'play');
  });
}

function showMenu() {
  state = 'menu';
  selected = -1;
  pourAnim = null;
  updateMenuStats();
  setScreen('menu');
  if (window.__pendingReload) {
    window.__pendingReload = false;
    window.__reloaded = true;
    location.reload();
  }
}

function showPlay(lvl) {
  const start = lvl != null ? lvl : Math.max(1, save.bestLevel || 1);
  startLevel(start);
  setScreen('play');
}

function showWin() {
  setScreen('win');
  document.getElementById('winLevel').textContent = String(level);
  document.getElementById('winMoves').textContent = String(moves);
  document.getElementById('winUndos').textContent = String(undos);
  document.getElementById('winBest').textContent = String(save.bestLevel);
  if (window.__pendingReload) {
    window.__pendingReload = false;
    window.__reloaded = true;
    location.reload();
  }
}

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if (!ctx) {
    ({ ctx } = resizeCanvas(cv));
  }

  if (state === 'play') {
    updatePlay(dt);
  } else if (state === 'win') {
    if (winFlash > 0) winFlash = Math.max(0, winFlash - dt);
    if (screenShake > 0) screenShake = Math.max(0, screenShake - dt);
    if (typeof updateParticles === 'function') updateParticles(dt);
  }

  // screen shake for pour / complete / win
  const shake = (typeof getShakeOffset === 'function') ? getShakeOffset() : { x: 0, y: 0 };

  ctx.save();
  if (shake.x || shake.y) ctx.translate(shake.x, shake.y);

  drawBackground(ctx);

  if (state === 'play' || state === 'win') {
    drawAllBottles(ctx);
    if (typeof drawParticles === 'function') drawParticles(ctx);
    drawHud(ctx, level, moves);
    if (typeof drawColorFlash === 'function') drawColorFlash(ctx);
    if (state === 'win') drawWinOverlayFlash(ctx);
  } else {
    drawIdleDecor(ctx, now);
    // subtle ambient on menu too
    if (typeof ensureAmbientMotes === 'function') ensureAmbientMotes(8);
    if (typeof updateParticles === 'function') updateParticles(dt);
    if (typeof drawParticles === 'function') drawParticles(ctx);
  }

  ctx.restore();

  requestAnimationFrame(frame);
}

// ---------- input ----------
function isUiChrome(target) {
  if (!target || !target.closest) return false;
  // Only real interactive chrome — NOT full .screen overlays (they are
  // display:none during play, but never block via this check on canvas).
  return !!(
    target.closest('button') ||
    target.closest('a') ||
    target.closest('.menu-card')
  );
}

function onPlayTap(clientX, clientY, e) {
  if (state !== 'play') return false;
  if (e && isUiChrome(e.target)) return false;
  if (e) e.preventDefault();
  ensureAudio();
  handleStageTap(clientX, clientY, cv);
  return true;
}

function onPointerDown(e) {
  // Only primary button / touch / pen
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (onPlayTap(e.clientX, e.clientY, e)) {
    lastPointerHandledAt = performance.now();
    try { stage.setPointerCapture(e.pointerId); } catch (_) { /* ok */ }
  }
}

function onTouchStart(e) {
  // If Pointer Events already handled this gesture, ignore (prevents select→deselect)
  if (performance.now() - lastPointerHandledAt < 600) {
    e.preventDefault();
    return;
  }
  const t = e.changedTouches && e.changedTouches[0];
  if (!t) return;
  onPlayTap(t.clientX, t.clientY, e);
}

function onMouseDown(e) {
  // Legacy mouse only when PointerEvent is missing
  if (window.PointerEvent) return;
  if (e.button !== 0) return;
  onPlayTap(e.clientX, e.clientY, e);
}

const ptrOpts = { passive: false };
// Listen on STAGE only (not canvas too) — canvas is inside stage, so dual
// listeners would bubble and fire select → deselect on the same tap.
// Pointer Events cover mouse + touch + pen; touch/mouse are fallbacks.
stage.addEventListener('pointerdown', onPointerDown, ptrOpts);
stage.addEventListener('touchstart', onTouchStart, ptrOpts);
stage.addEventListener('mousedown', onMouseDown, ptrOpts);

addEventListener('keydown', e => {
  if (state === 'menu' && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    showPlay(save.bestLevel || 1);
    return;
  }
  if (state === 'win' && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    showPlay(level + 1);
    return;
  }
  if (state !== 'play') return;

  if (e.key === 'Escape') {
    showMenu();
  } else if (e.key === 'z' || e.key === 'Z' || e.key === 'u' || e.key === 'U') {
    tryUndo();
  } else if (e.key === 'r' || e.key === 'R') {
    sfxClick();
    restartLevel();
  } else if (e.key >= '1' && e.key <= '9') {
    const idx = parseInt(e.key, 10) - 1;
    if (idx < bottles.length) tapBottle(idx);
  }
});

addEventListener('resize', () => {
  ({ ctx } = resizeCanvas(cv));
  if (bottles && bottles.length) {
    layout = layoutBottles(bottles.length, W, H);
  }
});

// ---------- UI buttons ----------
document.getElementById('btnPlay').addEventListener('click', () => {
  showPlay(save.bestLevel || 1);
});
document.getElementById('btnPlayFromStart').addEventListener('click', () => {
  sfxClick();
  showPlay(1);
});
document.getElementById('btnHow').addEventListener('click', () => {
  sfxClick();
  document.getElementById('howPanel').classList.toggle('hidden');
});
document.getElementById('btnNext').addEventListener('click', () => {
  showPlay(level + 1);
});
document.getElementById('btnRetryWin').addEventListener('click', () => {
  showPlay(level);
});
document.getElementById('btnMenuWin').addEventListener('click', () => {
  sfxClick();
  showMenu();
});
document.getElementById('btnPauseMenu').addEventListener('click', e => {
  e.stopPropagation();
  sfxClick();
  showMenu();
});
document.getElementById('btnUndo').addEventListener('click', e => {
  e.stopPropagation();
  tryUndo();
});
document.getElementById('btnRestart').addEventListener('click', e => {
  e.stopPropagation();
  sfxClick();
  restartLevel();
});
document.getElementById('muteBtn').addEventListener('click', () => {
  save.muted = !save.muted;
  persist();
  updateMenuStats();
  sfxClick();
});

// ---------- version UI ----------
function applyVersionLabels() {
  const label = GAME_NAME + ' ' + GAME_VERSION_LABEL;
  const tag = document.getElementById('versionTag');
  const menu = document.getElementById('versionMenu');
  const win = document.getElementById('versionWin');
  if (tag) tag.textContent = label;
  if (menu) menu.textContent = label + ' · PWA ready';
  if (win) win.textContent = label;
}

// ---------- PWA + auto-update ----------
function safeReloadForUpdate() {
  if (window.__reloaded) return;
  if (state === 'play') {
    window.__pendingReload = true;
    return;
  }
  window.__reloaded = true;
  location.reload();
}

function activateWaitingWorker(reg) {
  if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
}

function watchInstallingWorker(reg) {
  const worker = reg.installing;
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      worker.postMessage({ type: 'SKIP_WAITING' });
    }
  });
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (!(location.protocol === 'https:' || location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1')) return;

  navigator.serviceWorker.register('./sw.js').then(reg => {
    activateWaitingWorker(reg);
    if (reg.installing) watchInstallingWorker(reg);
    reg.addEventListener('updatefound', () => watchInstallingWorker(reg));

    const checkForUpdate = () => { reg.update().catch(() => {}); };
    checkForUpdate();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkForUpdate();
    });
    window.addEventListener('focus', checkForUpdate);
    setInterval(checkForUpdate, 60 * 1000);

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      safeReloadForUpdate();
    });
  }).catch(err => console.warn('[sw] register failed', err));

  function checkRemoteVersion() {
    if (state === 'play') return;
    fetch('js/config.js', { cache: 'no-store' })
      .then(r => r.ok ? r.text() : '')
      .then(text => {
        const m = text.match(/GAME_VERSION\s*=\s*['"]([^'"]+)['"]/);
        if (m && m[1] && m[1] !== GAME_VERSION) safeReloadForUpdate();
      })
      .catch(() => {});
  }
  checkRemoteVersion();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkRemoteVersion();
  });
  setInterval(checkRemoteVersion, 2 * 60 * 1000);
}

// boot
applyVersionLabels();
updateMenuStats();
setScreen('menu');
registerSW();
({ ctx } = resizeCanvas(cv));
requestAnimationFrame(t => { last = t; frame(t); });
