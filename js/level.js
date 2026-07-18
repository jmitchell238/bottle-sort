'use strict';

/**
 * Pure level / bottle helpers (Node-testable).
 *
 * Bottle model: array of color ids, index 0 = bottom, last = top.
 * Empty bottles are [].
 */

function cloneBottles(bottles) {
  return bottles.map(b => b.slice());
}

function bottleTop(bottle) {
  if (!bottle.length) return null;
  return bottle[bottle.length - 1];
}

function bottleSpace(bottle, capacity) {
  return capacity - bottle.length;
}

function isBottleComplete(bottle, capacity) {
  if (bottle.length === 0) return true;
  if (bottle.length !== capacity) return false;
  const c = bottle[0];
  for (let i = 1; i < bottle.length; i++) if (bottle[i] !== c) return false;
  return true;
}

function isSolved(bottles, capacity) {
  return bottles.every(b => isBottleComplete(b, capacity));
}

/**
 * Count how many consecutive units of the same color sit on top.
 */
function topRunLength(bottle) {
  if (!bottle.length) return 0;
  const c = bottle[bottle.length - 1];
  let n = 0;
  for (let i = bottle.length - 1; i >= 0; i--) {
    if (bottle[i] !== c) break;
    n++;
  }
  return n;
}

/**
 * Can we pour from `from` into `to`?
 */
function canPour(from, to, capacity) {
  if (!from || !from.length) return false;
  if (to.length >= capacity) return false;
  if (to.length === 0) return true;
  return bottleTop(from) === bottleTop(to);
}

/**
 * How many units would pour from → to?
 */
function pourAmount(from, to, capacity) {
  if (!canPour(from, to, capacity)) return 0;
  const run = topRunLength(from);
  const space = bottleSpace(to, capacity);
  return Math.min(run, space);
}

/**
 * Apply a pour in-place. Returns units moved (0 if invalid).
 */
function pour(from, to, capacity) {
  const n = pourAmount(from, to, capacity);
  if (n <= 0) return 0;
  for (let i = 0; i < n; i++) {
    to.push(from.pop());
  }
  return n;
}

/**
 * Build a solved layout: colorCount full mono bottles + emptyCount empties.
 * Color ids are 0..colorCount-1.
 */
function makeSolved(colorCount, emptyCount, capacity) {
  const bottles = [];
  for (let c = 0; c < colorCount; c++) {
    const b = [];
    for (let i = 0; i < capacity; i++) b.push(c);
    bottles.push(b);
  }
  for (let e = 0; e < emptyCount; e++) bottles.push([]);
  return bottles;
}

/**
 * Fisher–Yates shuffle (mutates).
 */
function shuffleInPlace(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/**
 * Reverse-pour scramble: from a solved board, repeatedly pour in reverse
 * directions that are legal under water-sort rules. Guarantees solvability.
 */
function scrambleBottles(bottles, capacity, steps, rng = Math.random) {
  const n = bottles.length;
  const board = cloneBottles(bottles);
  let guard = steps * 8;
  let done = 0;
  while (done < steps && guard-- > 0) {
    // Prefer pouring FROM a complete or non-empty INTO something with space
    // that either is empty or matches — i.e. a normal legal pour (which
    // "un-sorts" a solved board when done many times).
    const fromIdx = Math.floor(rng() * n);
    const toIdx = Math.floor(rng() * n);
    if (fromIdx === toIdx) continue;
    // Avoid pouring whole mono bottles straight into empty if board is still
    // nearly solved early — still fine for solvability, just slow to mess up.
    if (pour(board[fromIdx], board[toIdx], capacity) > 0) done++;
  }
  // If still solved (unlucky), force a messier shuffle of units
  if (isSolved(board, capacity)) {
    return forceMessy(board, capacity, rng);
  }
  return board;
}

/**
 * Fallback scramble: collect all units, reshuffle into bottles randomly
 * while keeping empty bottles empty-ish. Still has exact color counts so
 * solvable with ≥1 empty (practically always with 2).
 */
function forceMessy(bottles, capacity, rng = Math.random) {
  const units = [];
  for (const b of bottles) for (const u of b) units.push(u);
  shuffleInPlace(units, rng);

  const result = bottles.map(() => []);
  // Keep at least one bottle empty if we had empties
  const emptySlots = bottles.filter(b => b.length === 0).length;
  const fillable = result.length - Math.max(1, emptySlots);

  let ui = 0;
  for (let bi = 0; bi < fillable && ui < units.length; bi++) {
    while (result[bi].length < capacity && ui < units.length) {
      result[bi].push(units[ui++]);
    }
  }
  // Dump remainder into any bottle with space (except leave one empty if possible)
  for (; ui < units.length; ui++) {
    let placed = false;
    for (let bi = 0; bi < result.length; bi++) {
      if (result[bi].length < capacity) {
        // Prefer not filling the last empty completely away if others have space
        result[bi].push(units[ui]);
        placed = true;
        break;
      }
    }
    if (!placed) break;
  }
  shuffleInPlace(result, rng);
  return result;
}

/**
 * Generate a level from a level number (or explicit spec).
 * Returns { bottles, colorCount, emptyCount, capacity, level }.
 */
function generateLevel(levelOrSpec, rng = Math.random) {
  const spec = typeof levelOrSpec === 'number'
    ? levelSpec(levelOrSpec)
    : levelOrSpec;

  const { colorCount, emptyCount, capacity, scramble, level } = {
    scramble: 40,
    level: 1,
    ...spec,
  };

  const solved = makeSolved(colorCount, emptyCount, capacity);
  // Shuffle bottle order first so colors aren't always left-to-right
  shuffleInPlace(solved, rng);
  const bottles = scrambleBottles(solved, capacity, scramble, rng);

  return {
    bottles,
    colorCount,
    emptyCount,
    capacity,
    level: level || 1,
    bottleCount: bottles.length,
  };
}

/**
 * Hit-test: which bottle index is under stage point (x,y)?
 * layout is array of { x, y, w, h } bottle rects (top-left).
 */
function hitTestBottle(layout, x, y) {
  for (let i = 0; i < layout.length; i++) {
    const r = layout[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

/**
 * Compute bottle layout for N bottles inside stage W×H.
 * Returns array of { x, y, w, h, cx, bottom }.
 */
function layoutBottles(count, stageW, stageH) {
  // Responsive grid: prefer single row until ~7, then wrap
  let cols = count;
  let rows = 1;
  if (count > 7) {
    cols = Math.ceil(count / 2);
    rows = 2;
  }
  if (count > 12) {
    cols = Math.ceil(count / 3);
    rows = 3;
  }

  const padX = 14;
  const topHud = 100;
  const botPad = 90;
  const areaW = stageW - padX * 2;
  const areaH = stageH - topHud - botPad;

  const gapX = 8;
  const gapY = 18;
  const cellW = (areaW - gapX * (cols - 1)) / cols;
  const cellH = (areaH - gapY * (rows - 1)) / rows;

  // Bottle aspect: tall glass
  const maxBottleW = Math.min(64, cellW * 0.92);
  const maxBottleH = Math.min(220, cellH * 0.95);
  // Prefer taller: height ~ 2.8 * width for classic look
  let bw = maxBottleW;
  let bh = bw * 2.85;
  if (bh > maxBottleH) {
    bh = maxBottleH;
    bw = bh / 2.85;
  }
  bw = Math.max(28, bw);
  bh = Math.max(80, bh);

  const totalGridW = cols * cellW + (cols - 1) * gapX;
  const totalGridH = rows * cellH + (rows - 1) * gapY;
  const originX = (stageW - totalGridW) / 2;
  const originY = topHud + (areaH - totalGridH) / 2;

  const out = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const cellX = originX + col * (cellW + gapX);
    const cellY = originY + row * (cellH + gapY);
    const x = cellX + (cellW - bw) / 2;
    const y = cellY + (cellH - bh) / 2;
    out.push({
      x, y, w: bw, h: bh,
      cx: x + bw / 2,
      bottom: y + bh,
    });
  }
  return out;
}
