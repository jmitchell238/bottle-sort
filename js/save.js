'use strict';

const SAVE_KEY = 'bottle-sort-v1';

function defaultSave() {
  return {
    bestLevel: 1,   // highest level reached (1-based, unlocked)
    games: 0,       // levels completed
    totalMoves: 0,
    totalUndos: 0,
    muted: false,
    // Visual mode preference: auto | classic | shapes | neon
    visualPref: 'auto',
  };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...JSON.parse(raw) };
  } catch {
    return defaultSave();
  }
}

function writeSave(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }
  catch { /* ignore */ }
}

let save = loadSave();

function persist() { writeSave(save); }

/** Call when a level is completed. */
function recordLevelWin(level, moves, undos) {
  save.games += 1;
  save.totalMoves += moves | 0;
  save.totalUndos += undos | 0;
  // Unlock next level
  const next = (level | 0) + 1;
  if (next > save.bestLevel) save.bestLevel = next;
  persist();
}
