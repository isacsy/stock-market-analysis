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
        cells.push({ r, c, colorIdx: layer - 1, cleared: false });
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

const SLOT_COUNT = 5;

const state = {
  levelIndex: 0,
  cols: 0, rows: 0,
  cells: [],
  colorCells: [],       // colorCells[i] = array of not-yet-claimed cell refs for color i
  totalCells: 0,
  clearedCells: 0,
  activeSlots: [],      // fixed-length array of SLOT_COUNT; each entry is a tile object or null
  reservePool: [],      // tiles CURRENTLY placeable - only the unlocked layer (+ its straggler, if any)
  perLayerTiles: [],    // perLayerTiles[colorIdx] = that layer's full tile set, revealed once unlocked
  currentLayer: 0,      // outermost color layer not yet fully cleared - the only one placeable right now
  layerAdvanced: [],    // per color, whether we've already advanced past this layer
  stragglerSpawned: [], // per color, whether its post-exhaustion straggler tile already appeared
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

  state.colorCells = COLORS.map(() => []);
  for (const cell of state.cells) state.colorCells[cell.colorIdx].push(cell);

  // The picture is painted in concentric layers (outermost color first, like
  // an onion), and ants can only reach a layer once every layer covering it
  // from outside has been fully carried away. So only ONE layer's blocks are
  // ever placeable at a time - deeper colors simply aren't in the reserve pool
  // yet. Each layer's tiles exactly partition its own pixel count, so placing
  // any combination of that layer's tiles (even all at once, across several
  // slots) always fully resolves it. (An occasional post-exhaustion
  // "straggler" tile is the only real risk - see maybeSpawnStraggler below.)
  state.perLayerTiles = COLORS.map(() => []);
  COLORS.forEach((_, i) => {
    const count = state.colorCells[i].length;
    if (count === 0) return;
    for (const value of splitIntoChunks(count, 6, 20)) {
      state.perLayerTiles[i].push({ id: state.nextTileId++, colorIdx: i, value, maxValue: value });
    }
  });

  state.reservePool = [];
  state.activeSlots = new Array(SLOT_COUNT).fill(null);
  state.stragglerSpawned = COLORS.map(() => false);
  state.layerAdvanced = COLORS.map(() => false);

  state.currentLayer = 0;
  while (state.currentLayer < COLORS.length && state.perLayerTiles[state.currentLayer].length === 0) {
    state.currentLayer++;
  }

  document.getElementById("levelNum").textContent = String(index + 1);
  setupCanvas();
  initActiveSlotEls();
  if (state.currentLayer < COLORS.length) revealLayer(state.currentLayer);
  renderTiles();
  updateProgress();
  hideOverlay();
  startSpawnLoop();
}

// Adds a newly-unlocked layer's tiles into the reserve pool.
function revealLayer(colorIdx) {
  for (const tile of state.perLayerTiles[colorIdx]) {
    state.reservePool.push(tile);
    addReserveTileEl(tile);
  }
}

// Once the current layer's pixels are all claimed, unlock the next layer that
// actually has pixels (skipping any color a shape happens not to use).
function checkLayerAdvance(colorIdx) {
  if (colorIdx !== state.currentLayer) return;
  if (state.colorCells[colorIdx].length > 0) return;
  if (state.layerAdvanced[colorIdx]) return;
  state.layerAdvanced[colorIdx] = true;

  let next = state.currentLayer + 1;
  while (next < COLORS.length && state.perLayerTiles[next].length === 0) next++;
  if (next < COLORS.length) {
    state.currentLayer = next;
    revealLayer(next);
  }
}

/* ---------- Tiles rendering ---------- */

const activeRowEl = document.getElementById("activeRow");
const reserveGridEl = document.getElementById("reserveGrid");

// The 5 slot elements are created once and reused for the whole session -
// only their content/classes change - so renderActiveSlots() never has to
// tear down and recreate them.
function initActiveSlotEls() {
  if (activeRowEl.children.length === SLOT_COUNT) return;
  activeRowEl.innerHTML = "";
  for (let i = 0; i < SLOT_COUNT; i++) {
    const div = document.createElement("div");
    div.className = "tile empty";
    activeRowEl.appendChild(div);
  }
}

// Active slots and the reserve pool are rendered independently. Slots clear
// constantly on their own (idle ants), and rebuilding the reserve grid's DOM
// every time that happens - even though the reserve pool itself didn't change -
// would occasionally rip out the exact tile a player is mid-tap on, on a real
// phone where a touch gesture takes noticeably longer than a synthetic click.
// So renderReservePool() only ever runs when the reserve pool itself changes.
function renderActiveSlots() {
  for (let i = 0; i < SLOT_COUNT; i++) {
    const tile = state.activeSlots[i];
    const div = activeRowEl.children[i];
    if (tile) {
      div.className = "tile slot";
      div.style.background = COLORS[tile.colorIdx].hex;
      div.textContent = tile.value;
      div.dataset.tileId = String(tile.id);
      div.classList.toggle("starved", state.colorCells[tile.colorIdx].length === 0 && tile.value > 0);
    } else {
      div.className = "tile empty";
      div.textContent = "";
      delete div.dataset.tileId;
    }
  }
}

// Reserve tiles get individual add/remove calls instead of a full rebuild, so
// placing or straggler-spawning one tile never disturbs the DOM node of any
// other tile a player might be mid-tap on at that exact moment.
const reserveTileEls = new Map();

function initReservePool() {
  reserveGridEl.innerHTML = "";
  reserveTileEls.clear();
  for (const tile of state.reservePool) addReserveTileEl(tile);
}

function addReserveTileEl(tile) {
  const div = document.createElement("div");
  div.className = "tile reserve";
  div.style.background = COLORS[tile.colorIdx].hex;
  div.textContent = tile.value;
  div.dataset.tileId = String(tile.id);
  reserveGridEl.appendChild(div);
  reserveTileEls.set(tile.id, div);
}

function removeReserveTileEl(tile) {
  const div = reserveTileEls.get(tile.id);
  if (div) div.remove();
  reserveTileEls.delete(tile.id);
}

// A single delegated listener on the grid itself (never destroyed or
// recreated) handles every tap, present or future - individual tile divs
// come and go, but this listener never goes stale no matter how the DOM
// underneath it churns.
reserveGridEl.addEventListener("click", (e) => {
  const tileEl = e.target.closest(".tile.reserve");
  if (!tileEl) return;
  const id = Number(tileEl.dataset.tileId);
  const tile = state.reservePool.find((t) => t.id === id);
  if (tile) attemptPlace(tile);
});

function renderTiles() {
  renderActiveSlots();
  initReservePool();
}

function updateProgress() {
  const pct = state.totalCells ? Math.round((state.clearedCells / state.totalCells) * 100) : 0;
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressPct").textContent = pct + "%";
}

/* ---------- Gameplay: placing blocks / ants clearing pixels ---------- */

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

function pickCellToClear(colorIdx) {
  // pop (claim) immediately so two concurrent ants never target the same pixel
  const arr = state.colorCells[colorIdx];
  return arr.length ? arr.pop() : null;
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

// Occasionally, right as a color's very last pixel gets claimed, one more
// "straggler" tile for that color shows up in reserve - a colony member
// arriving after the job is already done. The board has already visibly
// lost that color by the time it appears, so the safe, always-sufficient
// rule for a player is simply: only place a block if its color is still
// visible in the picture. Placing a straggler anyway is a real, avoidable
// mistake - its slot can never clear, and enough of those ends the game.
function maybeSpawnStraggler(colorIdx) {
  if (state.colorCells[colorIdx].length > 0) return;
  if (state.stragglerSpawned[colorIdx]) return;
  state.stragglerSpawned[colorIdx] = true;
  if (Math.random() < 0.45) {
    const value = 3 + Math.floor(Math.random() * 5);
    const straggler = { id: state.nextTileId++, colorIdx, value, maxValue: value };
    state.reservePool.push(straggler);
    addReserveTileEl(straggler);
  }
}

// Attempts one ant trip for the tile in this slot. Only decrements the tile's
// counter if a matching pixel was actually available to claim - a tile whose
// color has already run dry (only possible via a straggler tile placed after
// the board already shows that color as gone) simply stalls at its current
// value instead of ticking down for free.
function trySpawnAntForSlot(slotIndex) {
  const tile = state.activeSlots[slotIndex];
  if (!tile || tile.value <= 0) return;
  const cell = pickCellToClear(tile.colorIdx);
  if (!cell) return; // no supply left for this color right now

  tile.value -= 1;
  const el = activeRowEl.querySelector('[data-tile-id="' + tile.id + '"]');
  if (el) {
    el.textContent = Math.max(tile.value, 0);
    el.classList.remove("hit");
    void el.offsetWidth;
    el.classList.add("hit");
  }

  animateAntTrip(cell, tile.colorIdx);
  maybeSpawnStraggler(tile.colorIdx);
  checkLayerAdvance(tile.colorIdx);

  if (tile.value <= 0) {
    if (el) el.classList.add("clearing");
    setTimeout(() => {
      const idx = state.activeSlots.indexOf(tile);
      if (idx === -1) return; // already cleared out
      state.activeSlots[idx] = null;
      renderActiveSlots();
    }, 220);
  }
}

function attemptPlace(tile) {
  if (state.gameEnded) return;
  const idx = state.activeSlots.indexOf(null);
  if (idx === -1) {
    activeRowEl.classList.remove("shake");
    void activeRowEl.offsetWidth;
    activeRowEl.classList.add("shake");
    return;
  }
  const poolIdx = state.reservePool.indexOf(tile);
  if (poolIdx === -1) return;
  state.reservePool.splice(poolIdx, 1);
  removeReserveTileEl(tile);
  state.activeSlots[idx] = tile;
  renderActiveSlots();
  checkDeadlock();
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
    state.activeSlots.forEach((tile, i) => {
      if (!tile || tile.value <= 0) return;
      const key = "s" + i;
      if (nextSpawnAt[key] === undefined) nextSpawnAt[key] = now + 200 + Math.random() * 300;
      if (now >= nextSpawnAt[key]) {
        const baseInterval = 1050 / state.speed;
        nextSpawnAt[key] = now + baseInterval * (0.7 + Math.random() * 0.6);
        const before = tile.value;
        trySpawnAntForSlot(i);
        if (tile.value === before && state.colorCells[tile.colorIdx].length === 0) anyStalled = true;
      }
    });
    if (anyStalled) { updateStarvedClasses(); checkDeadlock(); }
  }, 120);
}

function updateStarvedClasses() {
  for (let i = 0; i < SLOT_COUNT; i++) {
    const tile = state.activeSlots[i];
    const el = activeRowEl.children[i];
    if (!el) continue;
    const starved = !!tile && tile.value > 0 && state.colorCells[tile.colorIdx].length === 0;
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

// A slot is permanently stuck once its color has zero pixels left to claim.
// If every slot is full and every one of them is stuck, no move can ever
// progress the game again - that's the loss condition.
function checkDeadlock() {
  if (state.gameEnded) return;
  const allFull = state.activeSlots.every(s => s !== null);
  if (!allFull) return;
  const allStuck = state.activeSlots.every(
    s => s.value > 0 && state.colorCells[s.colorIdx].length === 0
  );
  if (allStuck) {
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
    overlaySubEl.textContent = "All 5 slots are jammed with stragglers from colors that are already gone. Watch the picture - once a layer disappears, stop placing that color.";
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
