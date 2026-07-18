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
let pourAnim = null;        // { from, to, color, units, t, duration, snapshot }
let winFlash = 0;
let selectPulse = 0;
let hintFlash = 0;

function snapshotBoard() {
  return cloneBottles(bottles);
}

function pushHistory() {
  history.push(snapshotBoard());
  // cap history
  if (history.length > 200) history.shift();
}

function startLevel(lvl) {
  level = Math.max(1, lvl | 0);
  const gen = generateLevel(level);
  bottles = gen.bottles;
  capacity = gen.capacity;
  moves = 0;
  undos = 0;
  selected = -1;
  history = [];
  pourAnim = null;
  winFlash = 0;
  layout = layoutBottles(bottles.length, W, H);
  state = 'play';
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
  if (typeof sfxUndo === 'function') sfxUndo();
  updatePlayChrome();
  return true;
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
    // Reselect if target has liquid, else invalid
    if (to.length > 0) {
      selected = idx;
      if (typeof sfxSelect === 'function') sfxSelect();
      return 'select';
    }
    if (typeof sfxInvalid === 'function') sfxInvalid();
    return 'invalid';
  }

  // Commit pour with animation
  const color = bottleTop(from);
  pushHistory();
  const fromIdx = selected;
  selected = -1;

  // Mutate board immediately (anim plays visual only)
  pour(from, to, capacity);
  moves += 1;

  pourAnim = {
    from: fromIdx,
    to: idx,
    color,
    units: amount,
    t: 0,
    duration: POUR_DUR,
  };

  if (typeof sfxPour === 'function') sfxPour(amount);
  updatePlayChrome();

  if (isSolved(bottles, capacity)) {
    // Delay win until pour finishes
    pourAnim.willWin = true;
  }
  return pourAnim.willWin ? 'win' : 'pour';
}

function finishWin() {
  state = 'win';
  winFlash = 1.2;
  if (typeof sfxWin === 'function') sfxWin();
  recordLevelWin(level, moves, undos);
  updateMenuStats();
  if (typeof showWin === 'function') showWin();
}

function updatePlay(dt) {
  selectPulse += dt * SELECT_PULSE;
  if (hintFlash > 0) hintFlash = Math.max(0, hintFlash - dt);

  if (pourAnim) {
    pourAnim.t += dt;
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
}

function updatePlayChrome() {
  if (typeof document === 'undefined' || !document.getElementById) return;
  const lv = document.getElementById('hudLevel');
  const mv = document.getElementById('hudMoves');
  if (lv) lv.textContent = String(level);
  if (mv) mv.textContent = String(moves);
  const undoBtn = document.getElementById('btnUndo');
  if (undoBtn) undoBtn.disabled = history.length === 0 || !!pourAnim;
}

function stageFromClient(clientX, clientY, cv) {
  const rect = cv.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * W;
  const y = ((clientY - rect.top) / rect.height) * H;
  return { x, y };
}

function handleStageTap(clientX, clientY, cv) {
  if (state !== 'play') return;
  const { x, y } = stageFromClient(clientX, clientY, cv);
  const idx = hitTestBottle(layout, x, y);
  if (idx >= 0) tapBottle(idx);
}
