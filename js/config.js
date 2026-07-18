'use strict';
// Bottle Sort — tuning knobs

// ---- Version (MAJOR.MINOR.PATCH) --------------------------------------------
// Shown in the UI as "Bottle Sort vMAJOR.MINOR.PPP" (patch zero-padded to 3 digits).
// Keep CACHE in sw.js in sync: 'bottle-sort-' + GAME_VERSION
const GAME_VERSION = '1.1.002';
const GAME_VERSION_LABEL = 'v' + GAME_VERSION;
const GAME_NAME = 'Bottle Sort';

// Logical stage size (letterboxed to fit screen)
const W = 390;
const H = 700;

// Bottle capacity (units of liquid per bottle)
const CAPACITY = 4;

// Kid-first palette: crayons, not pastels.
// Ordered so early levels only unlock the most obvious primaries first.
// Each color has a BIG simple shape kids already know (not subtle texture).
// shape: circle | square | triangle | star | heart | diamond | plus | ring | bar | moon | x | hex
const COLORS = [
  { id: 0,  color: '#E53935', glow: '#FF5252', label: 'Red',     shape: 'circle',   outline: '#7F0000' },
  { id: 1,  color: '#1E88E5', glow: '#42A5F5', label: 'Blue',    shape: 'square',   outline: '#0D47A1' },
  { id: 2,  color: '#43A047', glow: '#66BB6A', label: 'Green',   shape: 'triangle', outline: '#1B5E20' },
  { id: 3,  color: '#FDD835', glow: '#FFEE58', label: 'Yellow',  shape: 'star',     outline: '#F57F17' },
  // Deeper pumpkin orange — clearly darker / redder than yellow
  { id: 4,  color: '#EF6C00', glow: '#FF9800', label: 'Orange',  shape: 'heart',    outline: '#E65100' },
  // Vivid violet — not blue-ish
  { id: 5,  color: '#8E24AA', glow: '#AB47BC', label: 'Purple',  shape: 'diamond',  outline: '#4A148C' },
  // Soft light pink — much lighter than red (not hot magenta)
  { id: 6,  color: '#F48FB1', glow: '#F8BBD0', label: 'Pink',    shape: 'moon',     outline: '#AD1457' },
  // Deep teal — green-blue, not light sky near blue
  { id: 7,  color: '#00897B', glow: '#26A69A', label: 'Teal',    shape: 'plus',     outline: '#004D40' },
  // Chocolate brown
  { id: 8,  color: '#6D4C41', glow: '#8D6E63', label: 'Brown',   shape: 'bar',      outline: '#3E2723' },
  // Near-white
  { id: 9,  color: '#FAFAFA', glow: '#FFFFFF', label: 'White',   shape: 'ring',     outline: '#616161' },
  // Near-black charcoal (reads as “black liquid,” not empty glass)
  { id: 10, color: '#263238', glow: '#455A64', label: 'Black',   shape: 'x',        outline: '#000000' },
  // Medium gray — between white and black, no hue to confuse
  { id: 11, color: '#90A4AE', glow: '#B0BEC5', label: 'Gray',    shape: 'hex',      outline: '#37474F' },
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
