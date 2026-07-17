"use strict";

/* ---------- Shapes (implicit "inside" tests in normalized coords) ---------- */

const SHAPES = {
  heart: {
    xRange: [-1.3, 1.3], yTop: 1.3, yBottom: -1.1,
    test(nx, ny) {
      const f = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * ny * ny * ny;
      return f <= 0;
    }
  },
  star: {
    xRange: [-1.05, 1.05], yTop: 1.05, yBottom: -1.05,
    test(nx, ny) {
      const r = Math.sqrt(nx * nx + ny * ny);
      const theta = Math.atan2(ny, nx) + Math.PI / 2;
      const wave = 0.55 + 0.45 * Math.cos(5 * theta);
      return r <= wave;
    }
  },
  diamond: {
    xRange: [-1.1, 1.1], yTop: 1.1, yBottom: -1.1,
    test(nx, ny) {
      return Math.abs(nx) + Math.abs(ny) <= 1.05;
    }
  },
  flower: {
    xRange: [-1.1, 1.1], yTop: 1.1, yBottom: -1.1,
    test(nx, ny) {
      const r = Math.sqrt(nx * nx + ny * ny);
      const theta = Math.atan2(ny, nx);
      const wave = 0.72 + 0.28 * Math.cos(6 * theta);
      return r <= wave;
    }
  },
  clover: {
    xRange: [-1.05, 1.05], yTop: 1.05, yBottom: -1.05,
    test(nx, ny) {
      const r = Math.sqrt(nx * nx + ny * ny);
      const theta = Math.atan2(ny, nx);
      const wave = 0.62 + 0.38 * Math.cos(4 * theta);
      return r <= wave;
    }
  },
  sun: {
    xRange: [-1.05, 1.05], yTop: 1.05, yBottom: -1.05,
    test(nx, ny) {
      const r = Math.sqrt(nx * nx + ny * ny);
      const theta = Math.atan2(ny, nx) + Math.PI / 2;
      const wave = 0.55 + 0.45 * Math.cos(8 * theta);
      return r <= wave;
    }
  }
};

// Equal-area concentric rings (r_k = sqrt(k/N)) so each color band gets a
// comparable pixel count instead of the outer rings dwarfing the inner ones.
const RING_SCALES = [1.0, 0.949, 0.894, 0.837, 0.775, 0.707, 0.632, 0.548, 0.447, 0.316];

const COLORS = [
  { name: "red", hex: "#ef4444" },
  { name: "orange", hex: "#f97316" },
  { name: "amber", hex: "#f59e0b" },
  { name: "yellow", hex: "#eab308" },
  { name: "lime", hex: "#84cc16" },
  { name: "green", hex: "#22c55e" },
  { name: "teal", hex: "#14b8a6" },
  { name: "blue", hex: "#3b82f6" },
  { name: "purple", hex: "#a855f7" },
  { name: "pink", hex: "#ec4899" }
];

function cellLayer(shapeFn, nx, ny) {
  let layer = 0;
  for (const s of RING_SCALES) {
    if (shapeFn(nx / s, ny / s)) layer++;
    else break;
  }
  return layer;
}

function buildGrid(cols, rows, shapeName) {
  const shape = SHAPES[shapeName];
  const cells = [];
  for (let r = 0; r < rows; r++) {
    const ny = shape.yTop - (r / (rows - 1)) * (shape.yTop - shape.yBottom);
    for (let c = 0; c < cols; c++) {
      const nx = shape.xRange[0] + (c / (cols - 1)) * (shape.xRange[1] - shape.xRange[0]);
      const layer = cellLayer(shape.test, nx, ny);
      if (layer > 0) {
        cells.push({ r, c, colorIdx: layer - 1, cleared: false, exposed: false });
      }
    }
  }
  return cells;
}

/* ---------- Level list ---------- */

const LEVEL_SHAPES = ["heart", "star", "diamond", "flower", "clover", "sun"];
const LEVEL_NAMES = { heart: "Heart", star: "Star", diamond: "Diamond", flower: "Flower", clover: "Clover", sun: "Sun" };

function levelDef(levelIndex) {
  const shape = LEVEL_SHAPES[levelIndex % LEVEL_SHAPES.length];
  const tier = Math.floor(levelIndex / LEVEL_SHAPES.length);
  const cols = Math.min(34 + tier * 5, 56);
  const rows = Math.round(cols * 0.78);
  return { shape, cols, rows, name: LEVEL_NAMES[shape] };
}

/* ---------- Game state ---------- */

const COLUMN_COUNT = 5;

const state = {
  levelIndex: 0,
  cols: 0, rows: 0,
  cells: [],
  grid2D: [],        // grid2D[r][c] = cell object or null
  exposedQueue: [],  // exposedQueue[colorIdx] = currently-reachable, not-yet-cleared cells of that color
  totalCells: 0,
  clearedCells: 0,
  columns: [],       // COLUMN_COUNT queues; columns[i][0] is that column's front (only tappable) tile
  speed: 1,
  nextTileId: 1,
  gameEnded: false
};

let redrawQueued = false;

/* ---------- Canvas ---------- */

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const CELL_PX = 16;

function setupCanvas() {
  canvas.width = state.cols * CELL_PX;
  canvas.height = state.rows * CELL_PX;
  drawBoard();
}

function drawBoard() {
  redrawQueued = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cell of state.cells) {
    const x = cell.c * CELL_PX;
    const y = cell.r * CELL_PX;
    ctx.fillStyle = cell.cleared ? "#efe4cf" : COLORS[cell.colorIdx].hex;
    roundRect(ctx, x + 1, y + 1, CELL_PX - 2, CELL_PX - 2, 3);
    ctx.fill();
  }
}

function queueRedraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(drawBoard);
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/* ---------- Spatial exposure (the "growing hole" mechanic) ---------- */
//
// Ants can only reach a cell that's currently exposed - touching the outside
// of the picture, or touching a cell that's already been cleared. Clearing a
// red cell opens a specific gap; only the orange (or whatever) cell directly
// behind THAT gap becomes reachable, not all of orange everywhere. This is
// tracked with a plain 4-neighbor flood fill seeded from the picture's outer
// boundary, growing inward one cleared cell at a time.

function neighborsOf(r, c) {
  return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
}

function isBoundaryCell(cell) {
  for (const [nr, nc] of neighborsOf(cell.r, cell.c)) {
    if (nr < 0 || nr >= state.rows || nc < 0 || nc >= state.cols || !state.grid2D[nr][nc]) {
      return true;
    }
  }
  return false;
}

function computeInitialExposure() {
  state.exposedQueue = COLORS.map(() => []);
  for (const cell of state.cells) {
    cell.exposed = isBoundaryCell(cell);
    if (cell.exposed) state.exposedQueue[cell.colorIdx].push(cell);
  }
}

function exposeNeighbors(cell) {
  for (const [nr, nc] of neighborsOf(cell.r, cell.c)) {
    if (nr < 0 || nr >= state.rows || nc < 0 || nc >= state.cols) continue;
    const n = state.grid2D[nr][nc];
    if (!n || n.cleared || n.exposed) continue;
    n.exposed = true;
    state.exposedQueue[n.colorIdx].push(n);
  }
}

function pickCellToClear(colorIdx) {
  const arr = state.exposedQueue[colorIdx];
  return arr.length ? arr.pop() : null;
}

/* ---------- Level setup ---------- */

function splitIntoChunks(total, min, max) {
  const chunks = [];
  let remaining = total;
  while (remaining > 0) {
    let c = Math.min(remaining, min + Math.floor(Math.random() * (max - min + 1)));
    if (remaining - c > 0 && remaining - c < min) c = remaining;
    chunks.push(c);
    remaining -= c;
  }
  return chunks;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startLevel(index) {
  stopSpawnLoop();
  clearAnts();
  const def = levelDef(index);
  state.levelIndex = index;
  state.cols = def.cols;
  state.rows = def.rows;
  state.cells = buildGrid(def.cols, def.rows, def.shape);
  state.totalCells = state.cells.length;
  state.clearedCells = 0;
  state.gameEnded = false;

  state.grid2D = Array.from({ length: def.rows }, () => new Array(def.cols).fill(null));
  for (const cell of state.cells) state.grid2D[cell.r][cell.c] = cell;
  computeInitialExposure();

  // Each color's blocks exactly partition its own pixel count. Blocks are
  // generated in layer order (outer color first, inner color last, only
  // shuffled within each color) and dealt round-robin into the 5 columns -
  // so every column starts with an outer, already-reachable block, and stays
  // roughly paced with how the exposed hole grows inward as play continues.
  const perColorCounts = COLORS.map(() => 0);
  for (const cell of state.cells) perColorCounts[cell.colorIdx]++;

  const orderedTiles = [];
  COLORS.forEach((_, i) => {
    const count = perColorCounts[i];
    if (count === 0) return;
    const tiles = splitIntoChunks(count, 6, 20).map((value) => ({
      id: state.nextTileId++, colorIdx: i, value, maxValue: value, activated: false
    }));
    shuffle(tiles);
    orderedTiles.push(...tiles);
  });

  state.columns = Array.from({ length: COLUMN_COUNT }, () => []);
  orderedTiles.forEach((tile, i) => state.columns[i % COLUMN_COUNT].push(tile));

  document.getElementById("levelNum").textContent = String(index + 1);
  setupCanvas();
  initColumnEls();
  renderAllColumns();
  updateProgress();
  hideOverlay();
  startSpawnLoop();
}

/* ---------- Column queue rendering ---------- */

const reserveGridEl = document.getElementById("reserveGrid");
const columnEls = [];

function initColumnEls() {
  reserveGridEl.innerHTML = "";
  columnEls.length = 0;
  for (let i = 0; i < COLUMN_COUNT; i++) {
    const col = document.createElement("div");
    col.className = "column";
    reserveGridEl.appendChild(col);
    columnEls.push(col);
  }
}

// Only the front (first) tile of a column is rendered as tappable; the rest
// of that column is shown locked underneath, in order, like a queue. Only
// this one column's DOM gets rebuilt when it changes - the other 4 columns
// are never touched, so a tap in progress on one column can never be
// disturbed by something happening in another.
function renderColumn(i) {
  const col = columnEls[i];
  col.innerHTML = "";
  state.columns[i].forEach((tile, rowIdx) => {
    const div = document.createElement("div");
    div.style.background = COLORS[tile.colorIdx].hex;
    div.textContent = tile.value;
    if (rowIdx === 0) {
      div.className = "tile front" + (tile.activated ? " activated" : "");
      div.dataset.colIndex = String(i);
      if (tile.activated && tile.value > 0 && state.exposedQueue[tile.colorIdx].length === 0) {
        div.classList.add("starved");
      }
    } else {
      div.className = "tile locked";
    }
    col.appendChild(div);
  });
}

function renderAllColumns() {
  for (let i = 0; i < COLUMN_COUNT; i++) renderColumn(i);
}

// One delegated listener on the whole grid - never destroyed, so it can
// never go stale no matter how many times individual columns re-render.
reserveGridEl.addEventListener("click", (e) => {
  const tileEl = e.target.closest(".tile.front");
  if (!tileEl) return;
  activateFront(Number(tileEl.dataset.colIndex));
});

function activateFront(colIndex) {
  if (state.gameEnded) return;
  const tile = state.columns[colIndex][0];
  if (!tile || tile.activated) return;
  tile.activated = true;
  renderColumn(colIndex);
  checkDeadlock();
}

function updateProgress() {
  const pct = state.totalCells ? Math.round((state.clearedCells / state.totalCells) * 100) : 0;
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressPct").textContent = pct + "%";
}

/* ---------- Gameplay: ants clearing pixels ---------- */

const nestHole = document.getElementById("nestHole");
const antLayer = document.createElement("div");
antLayer.id = "antLayer";
Object.assign(antLayer.style, {
  position: "fixed", inset: "0", pointerEvents: "none", zIndex: "40", overflow: "hidden"
});
document.body.appendChild(antLayer);

const ANT_OUTLINE = "#3a2415";
const ANT_W = 30;
const ANT_H = 32;

function antSvg(hex) {
  return `<svg viewBox="0 0 32 34" width="100%" height="100%">
    <g stroke="${ANT_OUTLINE}" stroke-width="1.6" stroke-linecap="round" fill="none">
      <path d="M11 19 Q5 18 3 15"/>
      <path d="M11 22 Q4 22 2 23"/>
      <path d="M11 25 Q5 27 3 30"/>
      <path d="M21 19 Q27 18 29 15"/>
      <path d="M21 22 Q28 22 30 23"/>
      <path d="M21 25 Q27 27 29 30"/>
    </g>
    <ellipse cx="16" cy="25.5" rx="8" ry="7" fill="${hex}" stroke="rgba(0,0,0,.18)" stroke-width="0.6"/>
    <ellipse cx="16" cy="17" rx="5.3" ry="4.8" fill="${hex}" stroke="rgba(0,0,0,.18)" stroke-width="0.6"/>
    <circle cx="16" cy="8.5" r="6.2" fill="${hex}" stroke="rgba(0,0,0,.18)" stroke-width="0.6"/>
    <path d="M13 4 Q10.5 0.5 8 0" stroke="${ANT_OUTLINE}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M19 4 Q21.5 0.5 24 0" stroke="${ANT_OUTLINE}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <circle cx="8" cy="0.3" r="1.3" fill="${ANT_OUTLINE}"/>
    <circle cx="24" cy="0.3" r="1.3" fill="${ANT_OUTLINE}"/>
    <circle cx="12.8" cy="8.2" r="2.3" fill="#fff"/>
    <circle cx="19.2" cy="8.2" r="2.3" fill="#fff"/>
    <circle cx="13.2" cy="8.7" r="1.15" fill="#26150a"/>
    <circle cx="19.6" cy="8.7" r="1.15" fill="#26150a"/>
    <circle cx="13.6" cy="8.1" r="0.45" fill="#fff"/>
    <circle cx="20" cy="8.1" r="0.45" fill="#fff"/>
    <ellipse cx="10.6" cy="10.8" rx="1.3" ry="0.9" fill="#ff9d9d" opacity="0.55"/>
    <ellipse cx="21.4" cy="10.8" rx="1.3" ry="0.9" fill="#ff9d9d" opacity="0.55"/>
  </svg>`;
}

function cellPagePos(cell) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;
  return {
    x: rect.left + (cell.c * CELL_PX + CELL_PX / 2) * scaleX,
    y: rect.top + (cell.r * CELL_PX + CELL_PX / 2) * scaleY
  };
}

function nestPagePos() {
  const rect = nestHole.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

const activeAnts = new Set();

function clearAnts() {
  activeAnts.forEach(a => a.remove());
  activeAnts.clear();
}

function animateAntTrip(cell, colorIdx) {
  const hex = COLORS[colorIdx].hex;
  const nest = nestPagePos();
  const dest = cellPagePos(cell);
  const travel = 900 / state.speed;

  const ant = document.createElement("div");
  ant.className = "ant";
  ant.innerHTML = antSvg(hex);
  ant.style.transform = `translate(${nest.x - ANT_W / 2}px, ${nest.y - ANT_H / 2}px)`;
  ant.style.transitionDuration = travel + "ms";
  antLayer.appendChild(ant);
  activeAnts.add(ant);

  requestAnimationFrame(() => {
    ant.style.transform = `translate(${dest.x - ANT_W / 2}px, ${dest.y - ANT_H / 2}px)`;
  });

  setTimeout(() => {
    cell.cleared = true;
    state.clearedCells++;
    exposeNeighbors(cell);
    queueRedraw();
    updateProgress();
    checkWin();
    // carry it back to the hole
    ant.style.transitionDuration = travel + "ms";
    ant.style.transform = `translate(${nest.x - ANT_W / 2}px, ${nest.y - ANT_H / 2}px)`;
    setTimeout(() => {
      ant.remove();
      activeAnts.delete(ant);
    }, travel);
  }, travel);
}

// Attempts one ant trip for this column's front tile. Only decrements the
// tile's counter if a matching pixel was actually reachable right now - a
// tile whose color isn't currently exposed anywhere simply sits at its
// current value, doing nothing, until a gap opens into it.
function trySpawnAntForColumn(colIndex) {
  const tile = state.columns[colIndex][0];
  if (!tile || !tile.activated || tile.value <= 0) return;
  const cell = pickCellToClear(tile.colorIdx);
  if (!cell) return; // not exposed yet

  tile.value -= 1;
  const el = columnEls[colIndex].firstElementChild;
  if (el) {
    el.textContent = Math.max(tile.value, 0);
    el.classList.remove("hit");
    void el.offsetWidth;
    el.classList.add("hit");
  }

  animateAntTrip(cell, tile.colorIdx);

  if (tile.value <= 0) {
    if (el) el.classList.add("clearing");
    setTimeout(() => {
      if (state.columns[colIndex][0] === tile) state.columns[colIndex].shift();
      renderColumn(colIndex);
      checkDeadlock();
    }, 220);
  }
}

/* ---------- Auto spawn loop (idle ants) ---------- */

let spawnTimer = null;
const nextSpawnAt = {};

function startSpawnLoop() {
  Object.keys(nextSpawnAt).forEach(k => delete nextSpawnAt[k]);
  spawnTimer = setInterval(() => {
    if (state.gameEnded) return;
    const now = performance.now();
    let anyStalled = false;
    for (let i = 0; i < COLUMN_COUNT; i++) {
      const tile = state.columns[i][0];
      if (!tile || !tile.activated || tile.value <= 0) continue;
      const key = "c" + i;
      if (nextSpawnAt[key] === undefined) nextSpawnAt[key] = now + 200 + Math.random() * 300;
      if (now >= nextSpawnAt[key]) {
        const baseInterval = 1050 / state.speed;
        nextSpawnAt[key] = now + baseInterval * (0.7 + Math.random() * 0.6);
        const before = tile.value;
        trySpawnAntForColumn(i);
        if (tile.value === before && state.exposedQueue[tile.colorIdx].length === 0) anyStalled = true;
      }
    }
    if (anyStalled) { updateStarvedIndicators(); checkDeadlock(); }
  }, 120);
}

function updateStarvedIndicators() {
  for (let i = 0; i < COLUMN_COUNT; i++) {
    const tile = state.columns[i][0];
    const el = columnEls[i].firstElementChild;
    if (!el || !tile) continue;
    const starved = tile.activated && tile.value > 0 && state.exposedQueue[tile.colorIdx].length === 0;
    el.classList.toggle("starved", starved);
  }
}

function stopSpawnLoop() {
  if (spawnTimer) clearInterval(spawnTimer);
  spawnTimer = null;
}

/* ---------- Win / lose / overlay ---------- */

function checkWin() {
  if (state.gameEnded) return;
  if (state.clearedCells >= state.totalCells) {
    state.gameEnded = true;
    stopSpawnLoop();
    showResult(true);
  }
}

// Every column's front tile is "dead weight" while its color isn't currently
// exposed anywhere on the board. If none of the columns still holding tiles
// have a reachable front color, nothing can ever clear another pixel again -
// no gap can grow, so nothing new can ever become exposed either. That's a
// permanent deadlock, not just a delay.
function checkDeadlock() {
  if (state.gameEnded) return;
  const nonEmpty = state.columns.filter(col => col.length > 0);
  if (nonEmpty.length === 0) return; // nothing left - win already handles this
  const anyReachable = nonEmpty.some(col => state.exposedQueue[col[0].colorIdx].length > 0);
  if (!anyReachable) {
    state.gameEnded = true;
    stopSpawnLoop();
    showResult(false);
  }
}

const overlay = document.getElementById("overlay");
const overlayCardEl = document.getElementById("overlayCard");
const overlayTitleEl = document.getElementById("overlayTitle");
const overlaySubEl = document.getElementById("overlaySub");
const nextBtn = document.getElementById("nextBtn");

function showResult(won) {
  overlayCardEl.classList.toggle("lose", !won);
  if (won) {
    overlayTitleEl.textContent = "Level Complete!";
    overlaySubEl.textContent = "The colony carried every pixel home.";
    nextBtn.textContent = "Next Level ▶";
    nextBtn.onclick = () => startLevel(state.levelIndex + 1);
  } else {
    overlayTitleEl.textContent = "Colony Stuck!";
    overlaySubEl.textContent = "None of the columns' front blocks match a color that's currently exposed, so no gap can ever grow further. Watch for which color has an opening before it's the only one left.";
    nextBtn.textContent = "Retry Level ↻";
    nextBtn.onclick = () => startLevel(state.levelIndex);
  }
  overlay.classList.remove("hidden");
}
function hideOverlay() {
  overlay.classList.add("hidden");
}

document.getElementById("restartBtn").addEventListener("click", () => {
  startLevel(state.levelIndex);
});

/* ---------- Speed toggle ---------- */

const speedBtn = document.getElementById("speedBtn");
speedBtn.addEventListener("click", () => {
  state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1;
  speedBtn.textContent = "▶▶ x" + state.speed;
});

/* ---------- Boot ---------- */

startLevel(0);

window.addEventListener("resize", () => queueRedraw());
