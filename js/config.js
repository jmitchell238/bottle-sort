'use strict';
// Bottle Sort — tuning knobs

// ---- Version (MAJOR.MINOR.PATCH) --------------------------------------------
// Shown in the UI as "Bottle Sort vMAJOR.MINOR.PPP" (patch zero-padded to 3 digits).
// Keep CACHE in sw.js in sync: 'bottle-sort-' + GAME_VERSION
const GAME_VERSION = '1.1.001';
const GAME_VERSION_LABEL = 'v' + GAME_VERSION;
const GAME_NAME = 'Bottle Sort';

// Logical stage size (letterboxed to fit screen)
const W = 390;
const H = 700;

// Bottle capacity (units of liquid per bottle)
const CAPACITY = 4;

// Color palette — maximally distinct hues (spaced around the wheel).
// Avoid near-neighbors (cyan/mint, yellow/amber, pink/magenta) that used to blend.
// `mark` = pattern style drawn on liquid so colors stay readable even if hues clash for some eyes.
// mark: 0 solid · 1 dots · 2 stripes · 3 cross · 4 waves · 5 diamonds
const COLORS = [
  { id: 0,  color: '#FF3B30', glow: '#FF6259', label: 'Red',     mark: 0 },
  { id: 1,  color: '#0A84FF', glow: '#409CFF', label: 'Blue',    mark: 1 },
  { id: 2,  color: '#30D158', glow: '#4AE06C', label: 'Green',   mark: 2 },
  { id: 3,  color: '#FFD60A', glow: '#FFE04A', label: 'Yellow',  mark: 0 },
  { id: 4,  color: '#FF9F0A', glow: '#FFB340', label: 'Orange',  mark: 3 },
  { id: 5,  color: '#BF5AF2', glow: '#D48FFF', label: 'Purple',  mark: 1 },
  { id: 6,  color: '#FF2D95', glow: '#FF5AAD', label: 'Pink',    mark: 2 },
  { id: 7,  color: '#64D2FF', glow: '#8ADEFF', label: 'Sky',     mark: 4 },
  { id: 8,  color: '#A2845E', glow: '#C4A882', label: 'Brown',   mark: 3 },
  { id: 9,  color: '#B0FF2D', glow: '#C6FF5C', label: 'Lime',    mark: 5 },
  { id: 10, color: '#F5F5F7', glow: '#FFFFFF', label: 'White',   mark: 1 },
  { id: 11, color: '#5E5CE6', glow: '#7D7AFF', label: 'Indigo',  mark: 5 },
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
