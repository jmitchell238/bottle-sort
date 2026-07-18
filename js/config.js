'use strict';
// Bottle Sort — tuning knobs

// ---- Version (MAJOR.MINOR.PATCH) --------------------------------------------
// Shown in the UI as "Bottle Sort vMAJOR.MINOR.PPP" (patch zero-padded to 3 digits).
// Keep CACHE in sw.js in sync: 'bottle-sort-' + GAME_VERSION
const GAME_VERSION = '1.1.000';
const GAME_VERSION_LABEL = 'v' + GAME_VERSION;
const GAME_NAME = 'Bottle Sort';

// Logical stage size (letterboxed to fit screen)
const W = 390;
const H = 700;

// Bottle capacity (units of liquid per bottle)
const CAPACITY = 4;

// Color palette — neon orbs aesthetic matching Drop & Fuse
const COLORS = [
  { id: 0,  color: '#7af0ff', glow: '#3de7ff', label: 'Cyan' },
  { id: 1,  color: '#8bffb0', glow: '#58d68d', label: 'Mint' },
  { id: 2,  color: '#ffe66d', glow: '#ffd23e', label: 'Solar' },
  { id: 3,  color: '#ffb347', glow: '#ff9f1c', label: 'Amber' },
  { id: 4,  color: '#ff7a9a', glow: '#ff4f7a', label: 'Blush' },
  { id: 5,  color: '#ff6ad5', glow: '#ff4fd8', label: 'Nova' },
  { id: 6,  color: '#c77dff', glow: '#a855f7', label: 'Pulse' },
  { id: 7,  color: '#7c9bff', glow: '#5b7cfa', label: 'Tide' },
  { id: 8,  color: '#5eead4', glow: '#2dd4bf', label: 'Aura' },
  { id: 9,  color: '#f0abfc', glow: '#e879f9', label: 'Prism' },
  { id: 10, color: '#fde68a', glow: '#fbbf24', label: 'Core' },
  { id: 11, color: '#94a3b8', glow: '#64748b', label: 'Steel' },
];

const MAX_COLORS = COLORS.length;

// Level scaling — denser boards, 2 rows early, more colors fast
// L1: 4 colors + 2 empty = 6 bottles (2×3)
// L2: 5+2=7, L3: 6+2=8 … up to 12 colors + empties
function levelSpec(level) {
  const L = Math.max(1, level | 0);
  // colors climb every level (4 → 12)
  const colorCount = Math.min(MAX_COLORS, 4 + (L - 1));
  // two empties by default; big boards get a third buffer
  let emptyCount = 2;
  if (colorCount >= 8) emptyCount = 3;
  // rare hard mode: only 2 empties on huge boards every 4th level past 8
  if (L >= 9 && colorCount >= 9 && L % 4 === 0) emptyCount = 2;
  const bottleCount = colorCount + emptyCount;
  // scramble depth grows with level (more reverse-pours → messier)
  const scramble = 28 + L * 10 + colorCount * 8;
  return { level: L, colorCount, emptyCount, bottleCount, capacity: CAPACITY, scramble };
}

// Animation timings (seconds)
const POUR_DUR = 0.42;
const SELECT_PULSE = 2.4;
