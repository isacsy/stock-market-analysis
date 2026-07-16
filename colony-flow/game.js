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
  }
};

const RING_SCALES = [1.0, 0.85, 0.7, 0.55, 0.4, 0.25, 0.12];

const COLORS = [
  { name: "red", hex: "#ef4444" },
  { name: "orange", hex: "#fb923c" },
  { name: "yellow", hex: "#fbbf24" },
  { name: "green", hex: "#5fd15f" },
  { name: "cyan", hex: "#38c6e0" },
  { name: "blue", hex: "#7c6bf0" },
  { name: "pink", hex: "#ee6fd0" }
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

const LEVEL_SHAPES = ["heart", "star", "diamond", "flower"];
const LEVEL_NAMES = { heart: "Heart", star: "Star", diamond: "Diamond", flower: "Flower" };

function levelDef(levelIndex) {
  const shape = LEVEL_SHAPES[levelIndex % LEVEL_SHAPES.length];
  const tier = Math.floor(levelIndex / LEVEL_SHAPES.length);
  const cols = Math.min(24 + tier * 3, 40);
  const rows = Math.round(cols * 0.78);
  return { shape, cols, rows, name: LEVEL_NAMES[shape] };
}

/* ---------- Game state ---------- */

const state = {
  levelIndex: 0,
  cols: 0, rows: 0,
  cells: [],
  colorCells: [],       // colorCells[i] = array of not-yet-cleared cell refs for color i
  colorTilesLeft: [],   // how many tiles of color i still exist (active + reserve)
  totalCells: 0,
  clearedCells: 0,
  activeSlots: [],      // array of tile objects (max 5)
  reserveQueue: [],      // array of tile objects waiting
  speed: 1,
  nextTileId: 1
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

  state.colorCells = COLORS.map(() => []);
  for (const cell of state.cells) state.colorCells[cell.colorIdx].push(cell);

  const perColorTiles = COLORS.map(() => []);
  state.colorTilesLeft = COLORS.map(() => 0);
  COLORS.forEach((_, i) => {
    const count = state.colorCells[i].length;
    if (count === 0) return;
    // one hit == one pixel carried away, so tile values must sum to the pixel count exactly
    const chunks = splitIntoChunks(count, 6, 20);
    for (const value of chunks) {
      perColorTiles[i].push({ id: state.nextTileId++, colorIdx: i, value, maxValue: value });
    }
    state.colorTilesLeft[i] = perColorTiles[i].length;
  });

  // interleave colors round-robin so the front of the queue has variety
  const queue = [];
  let remaining = perColorTiles.reduce((a, arr) => a + arr.length, 0);
  const cursors = perColorTiles.map(() => 0);
  while (remaining > 0) {
    for (let i = 0; i < COLORS.length; i++) {
      if (cursors[i] < perColorTiles[i].length) {
        queue.push(perColorTiles[i][cursors[i]]);
        cursors[i]++;
        remaining--;
      }
    }
  }

  state.reserveQueue = queue;
  state.activeSlots = [];
  for (let i = 0; i < 5; i++) {
    const t = state.reserveQueue.shift();
    if (t) state.activeSlots.push(t);
  }

  document.getElementById("levelNum").textContent = String(index + 1);
  setupCanvas();
  renderTiles();
  updateProgress();
  hideOverlay();
  startSpawnLoop();
}

/* ---------- Tiles rendering ---------- */

const activeRowEl = document.getElementById("activeRow");
const reserveGridEl = document.getElementById("reserveGrid");

function renderTiles() {
  activeRowEl.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const tile = state.activeSlots[i];
    const div = document.createElement("div");
    if (tile) {
      div.className = "tile active";
      div.style.background = COLORS[tile.colorIdx].hex;
      div.textContent = tile.value;
      div.dataset.tileId = String(tile.id);
      div.addEventListener("click", () => placeBlock(tile));
    } else {
      div.className = "tile empty";
    }
    activeRowEl.appendChild(div);
  }

  reserveGridEl.innerHTML = "";
  for (const tile of state.reserveQueue) {
    const div = document.createElement("div");
    div.className = "tile";
    div.style.background = COLORS[tile.colorIdx].hex;
    div.style.opacity = "0.75";
    div.textContent = tile.value;
    reserveGridEl.appendChild(div);
  }
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

function antSvg(hex) {
  return `<svg viewBox="0 0 24 24" width="100%" height="100%">
    <ellipse cx="12" cy="15" rx="5.2" ry="4.2" fill="${hex}"/>
    <ellipse cx="12" cy="8.5" rx="3" ry="3" fill="${hex}"/>
    <circle cx="12" cy="4" r="2.1" fill="${hex}"/>
    <line x1="7" y1="12" x2="3" y2="9" stroke="${hex}" stroke-width="1.4"/>
    <line x1="7" y1="15" x2="2.5" y2="15" stroke="${hex}" stroke-width="1.4"/>
    <line x1="7" y1="18" x2="3" y2="21" stroke="${hex}" stroke-width="1.4"/>
    <line x1="17" y1="12" x2="21" y2="9" stroke="${hex}" stroke-width="1.4"/>
    <line x1="17" y1="15" x2="21.5" y2="15" stroke="${hex}" stroke-width="1.4"/>
    <line x1="17" y1="18" x2="21" y2="21" stroke="${hex}" stroke-width="1.4"/>
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

function sendAnt(colorIdx, onArrive) {
  const cell = pickCellToClear(colorIdx);
  if (!cell) { if (onArrive) onArrive(false); return; }

  const hex = COLORS[colorIdx].hex;
  const nest = nestPagePos();
  const dest = cellPagePos(cell);
  const travel = 420 / state.speed;

  const ant = document.createElement("div");
  ant.className = "ant";
  ant.innerHTML = antSvg(hex);
  ant.style.transform = `translate(${nest.x - 11}px, ${nest.y - 11}px)`;
  ant.style.transitionDuration = travel + "ms";
  antLayer.appendChild(ant);
  activeAnts.add(ant);

  requestAnimationFrame(() => {
    ant.style.transform = `translate(${dest.x - 11}px, ${dest.y - 11}px)`;
  });

  setTimeout(() => {
    if (!cell.cleared) {
      cell.cleared = true;
      state.clearedCells++;
      queueRedraw();
      updateProgress();
      checkWin();
    }
    // carry it back to the hole
    ant.style.transitionDuration = travel + "ms";
    ant.style.transform = `translate(${nest.x - 11}px, ${nest.y - 11}px)`;
    setTimeout(() => {
      ant.remove();
      activeAnts.delete(ant);
      if (onArrive) onArrive(true);
    }, travel);
  }, travel);
}

function tileHit(tile) {
  if (!tile || tile.value <= 0) return;
  // tile may already be gone from activeSlots if this fires after it cleared
  if (state.activeSlots.indexOf(tile) === -1) return;

  sendAnt(tile.colorIdx);

  tile.value -= 1;
  const el = activeRowEl.querySelector('[data-tile-id="' + tile.id + '"]');
  if (el) {
    el.textContent = Math.max(tile.value, 0);
    el.classList.remove("hit");
    void el.offsetWidth;
    el.classList.add("hit");
  }

  if (tile.value <= 0) {
    state.colorTilesLeft[tile.colorIdx]--;
    if (state.colorTilesLeft[tile.colorIdx] <= 0) {
      // no tiles of this color left anywhere: sweep any leftover cells
      const arr = state.colorCells[tile.colorIdx];
      let changed = false;
      for (const cell of arr) {
        if (!cell.cleared) { cell.cleared = true; state.clearedCells++; changed = true; }
      }
      arr.length = 0;
      if (changed) { queueRedraw(); updateProgress(); checkWin(); }
    }
    if (el) { el.classList.add("clearing"); }
    setTimeout(() => {
      const idx = state.activeSlots.indexOf(tile);
      if (idx === -1) return; // already removed
      state.activeSlots.splice(idx, 1);
      const next = state.reserveQueue.shift();
      if (next) state.activeSlots.push(next);
      renderTiles();
    }, 220);
  }
}

function placeBlock(tile) {
  tileHit(tile);
}

/* ---------- Auto spawn loop (idle ants) ---------- */

let spawnTimer = null;
const nextSpawnAt = {};

function startSpawnLoop() {
  Object.keys(nextSpawnAt).forEach(k => delete nextSpawnAt[k]);
  spawnTimer = setInterval(() => {
    const now = performance.now();
    state.activeSlots.forEach((tile, i) => {
      if (!tile || tile.value <= 0) return;
      const key = "s" + i;
      if (nextSpawnAt[key] === undefined) nextSpawnAt[key] = now + 200 + Math.random() * 300;
      if (now >= nextSpawnAt[key]) {
        const baseInterval = 700 / state.speed;
        nextSpawnAt[key] = now + baseInterval * (0.7 + Math.random() * 0.6);
        autoAntHit(i);
      }
    });
  }, 120);
}

function stopSpawnLoop() {
  if (spawnTimer) clearInterval(spawnTimer);
  spawnTimer = null;
}

function autoAntHit(slotIndex) {
  const tile = state.activeSlots[slotIndex];
  if (!tile || tile.value <= 0) return;
  tileHit(tile);
}

/* ---------- Win / overlay ---------- */

function checkWin() {
  if (state.clearedCells >= state.totalCells) {
    stopSpawnLoop();
    showOverlay();
  }
}

const overlay = document.getElementById("overlay");
function showOverlay() {
  document.getElementById("overlayTitle").textContent = "Level Complete!";
  document.getElementById("overlaySub").textContent = "The colony carried every pixel home.";
  overlay.classList.remove("hidden");
}
function hideOverlay() {
  overlay.classList.add("hidden");
}

document.getElementById("nextBtn").addEventListener("click", () => {
  startLevel(state.levelIndex + 1);
});
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
