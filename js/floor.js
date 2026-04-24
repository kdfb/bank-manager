// 2D overhead bank branch view.
// The floor is a FLOOR_COLS × FLOOR_ROWS grid of cells.
// Each cell can hold one placed upgrade object.
// Upgrades affect game mechanics (see FLOOR_UPGRADES).

const FLOOR_COLS = 12;
const FLOOR_ROWS = 8;

// Upgrade catalog. Each entry defines:
//   id, label, icon, cost, size ([cols, rows]),
//   description, and effect() called on bank at day-start.
const FLOOR_UPGRADES = [
  {
    id:    "teller_window",
    label: "Teller Window",
    icon:  "🪟",
    cost:  15_000,
    size:  [1, 1],
    desc:  "An extra teller services more customers. +1 event per day.",
    effect: () => { /* game.js buildDay() checks bank.upgrades for this */ },
  },
  {
    id:    "risk_desk",
    label: "Risk Analyst Desk",
    icon:  "🖥️",
    cost:  25_000,
    size:  [2, 1],
    desc:  "In-house analyst reduces high-risk loan default chance.",
    effect: () => {},
  },
  {
    id:    "vault_upgrade",
    label: "Reinforced Vault",
    icon:  "🔒",
    cost:  40_000,
    size:  [2, 2],
    desc:  "Robbery losses capped at $2,000 instead of $8,000.",
    effect: () => {},
  },
  {
    id:    "pr_office",
    label: "PR Office",
    icon:  "📣",
    cost:  20_000,
    size:  [2, 1],
    desc:  "Boosts reputation gain from positive events by +2.",
    effect: () => {},
  },
  {
    id:    "atm",
    label: "ATM",
    icon:  "🏧",
    cost:  10_000,
    size:  [1, 1],
    desc:  "Self-service ATM reduces withdrawal refusal damage by half.",
    effect: () => {},
  },
  {
    id:    "break_room",
    label: "Break Room",
    icon:  "☕",
    cost:  8_000,
    size:  [2, 1],
    desc:  "Staff morale boost. Reduces daily overhead by $200.",
    effect: b => { /* dailyOverhead reduction applied in advanceDay */ },
  },
];

// Floor state — a flat array of FLOOR_COLS × FLOOR_ROWS cells.
// null = empty. Otherwise { upgradeId, originCol, originRow } on the origin
// cell; other cells occupied by a multi-cell upgrade hold { ref: originKey }.
let floorGrid = [];

function initFloor() {
  floorGrid = Array(FLOOR_COLS * FLOOR_ROWS).fill(null);
}

function cellIndex(col, row) { return row * FLOOR_COLS + col; }

// Returns true if all cells needed for upgrade fit and are empty.
function canPlace(upgradeId, col, row) {
  const upg = FLOOR_UPGRADES.find(u => u.id === upgradeId);
  if (!upg) return false;
  const [w, h] = upg.size;
  if (col + w > FLOOR_COLS || row + h > FLOOR_ROWS) return false;
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      if (floorGrid[cellIndex(c, r)] !== null) return false;
    }
  }
  return true;
}

// Place an upgrade. Returns false if placement is invalid.
function placeUpgrade(upgradeId, col, row) {
  if (!canPlace(upgradeId, col, row)) return false;
  const upg = FLOOR_UPGRADES.find(u => u.id === upgradeId);
  const [w, h] = upg.size;
  const originKey = `${col},${row}`;
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      floorGrid[cellIndex(c, r)] =
        (c === col && r === row)
          ? { upgradeId, originCol: col, originRow: row }
          : { ref: originKey };
    }
  }
  if (!bank.upgrades) bank.upgrades = {};
  bank.upgrades[upgradeId] = true;
  return true;
}

// Remove an upgrade by its origin cell.
function removeUpgrade(col, row) {
  const cell = floorGrid[cellIndex(col, row)];
  if (!cell || cell.ref) return;
  const upg = FLOOR_UPGRADES.find(u => u.id === cell.upgradeId);
  if (!upg) return;
  const [w, h] = upg.size;
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      floorGrid[cellIndex(c, r)] = null;
    }
  }
  if (bank.upgrades) delete bank.upgrades[cell.upgradeId];
}

// ── Render ─────────────────────────────────────────────────────
// Called whenever the floor view tab is active.
function renderFloor() {
  const container = document.getElementById("floorGrid");
  if (!container) return;

  container.style.gridTemplateColumns = `repeat(${FLOOR_COLS}, 1fr)`;
  container.innerHTML = "";

  for (let r = 0; r < FLOOR_ROWS; r++) {
    for (let c = 0; c < FLOOR_COLS; c++) {
      const cell = floorGrid[cellIndex(c, r)];
      const el   = document.createElement("div");
      el.className = "floor-cell";
      el.dataset.col = c;
      el.dataset.row = r;

      if (cell && !cell.ref) {
        const upg = FLOOR_UPGRADES.find(u => u.id === cell.upgradeId);
        el.classList.add("floor-cell--placed");
        el.textContent = upg ? upg.icon : "?";
        el.title = upg ? upg.label : "";
      } else if (cell && cell.ref) {
        el.classList.add("floor-cell--occupied");
      }

      el.addEventListener("click", () => onFloorCellClick(c, r));
      container.appendChild(el);
    }
  }
}

// Placeholder click handler — will be wired to a placement UI in Phase 2.
function onFloorCellClick(col, row) {
  const cell = floorGrid[cellIndex(col, row)];
  if (cell && !cell.ref) {
    removeUpgrade(col, row);
    renderFloor();
  }
}

// Serialize/deserialize floor state with the save system (called from save.js).
function serializeFloor()   { return [...floorGrid]; }
function deserializeFloor(data) { floorGrid = data || Array(FLOOR_COLS * FLOOR_ROWS).fill(null); }
