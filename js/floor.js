// 2D overhead bank branch view — grid state, upgrade catalog, placement UI.

const FLOOR_COLS = 10;
const FLOOR_ROWS = 6;

const FLOOR_UPGRADES = [
  {
    id:    "teller_window",
    label: "Teller Window",
    icon:  "🪟",
    cost:  15_000,
    size:  [1, 1],
    desc:  "An extra teller serves more customers. +1 event per day.",
  },
  {
    id:    "risk_desk",
    label: "Risk Analyst",
    icon:  "🖥️",
    cost:  25_000,
    size:  [2, 1],
    desc:  "In-house analyst: high-risk loans gain a small rep bonus.",
  },
  {
    id:    "vault_upgrade",
    label: "Vault Upgrade",
    icon:  "🔒",
    cost:  40_000,
    size:  [2, 2],
    desc:  "Robbery losses capped at $2,000 instead of $8,000.",
  },
  {
    id:    "pr_office",
    label: "PR Office",
    icon:  "📣",
    cost:  20_000,
    size:  [2, 1],
    desc:  "Reputation gains from positive events increased by +2.",
  },
  {
    id:    "atm",
    label: "ATM",
    icon:  "🏧",
    cost:  10_000,
    size:  [1, 1],
    desc:  "Self-service ATM halves reputation loss from refused withdrawals.",
  },
  {
    id:    "break_room",
    label: "Break Room",
    icon:  "☕",
    cost:  8_000,
    size:  [2, 1],
    desc:  "Staff morale boost. Reduces daily overhead by $200.",
  },
  {
    id:    "safe_deposit",
    label: "Safe Deposit",
    icon:  "🗄️",
    cost:  18_000,
    size:  [1, 2],
    desc:  "Attracts larger deposit offers (+$20k average).",
  },
  {
    id:    "lobby",
    label: "Grand Lobby",
    icon:  "🏛️",
    cost:  50_000,
    size:  [3, 2],
    desc:  "Impresses VIPs. Reputation floor raised to 25 (from 15).",
  },
];

// ── State ──────────────────────────────────────────────────────
let floorGrid        = [];
let selectedUpgradeId = null;   // id of upgrade chosen in shop, or null

function initFloor() {
  floorGrid = Array(FLOOR_COLS * FLOOR_ROWS).fill(null);
  if (bank.upgrades) bank.upgrades = {};
}

function cellIndex(col, row) { return row * FLOOR_COLS + col; }

function canPlace(upgradeId, col, row) {
  const upg = FLOOR_UPGRADES.find(u => u.id === upgradeId);
  if (!upg) return false;
  const [w, h] = upg.size;
  if (col + w > FLOOR_COLS || row + h > FLOOR_ROWS) return false;
  for (let r = row; r < row + h; r++)
    for (let c = col; c < col + w; c++)
      if (floorGrid[cellIndex(c, r)] !== null) return false;
  return true;
}

function placeUpgrade(upgradeId, col, row) {
  if (!canPlace(upgradeId, col, row)) return false;
  const upg = FLOOR_UPGRADES.find(u => u.id === upgradeId);
  const [w, h] = upg.size;
  const originKey = `${col},${row}`;
  for (let r = row; r < row + h; r++)
    for (let c = col; c < col + w; c++)
      floorGrid[cellIndex(c, r)] =
        (c === col && r === row)
          ? { upgradeId, originCol: col, originRow: row }
          : { ref: originKey };
  if (!bank.upgrades) bank.upgrades = {};
  bank.upgrades[upgradeId] = (bank.upgrades[upgradeId] || 0) + 1;
  return true;
}

// Returns the refund amount (50%), or 0 if nothing at that cell.
function removeUpgrade(col, row) {
  const idx  = cellIndex(col, row);
  const cell = floorGrid[idx];
  if (!cell) return 0;

  // Navigate to origin cell if this is a ref cell
  const oc = cell.ref ? parseInt(cell.ref.split(",")[0]) : col;
  const or = cell.ref ? parseInt(cell.ref.split(",")[1]) : row;
  const origin = floorGrid[cellIndex(oc, or)];
  if (!origin || origin.ref) return 0;

  const upg = FLOOR_UPGRADES.find(u => u.id === origin.upgradeId);
  if (!upg) return 0;
  const [w, h] = upg.size;
  for (let r = or; r < or + h; r++)
    for (let c = oc; c < oc + w; c++)
      floorGrid[cellIndex(c, r)] = null;

  const count = bank.upgrades?.[origin.upgradeId] || 1;
  if (count <= 1) delete bank.upgrades[origin.upgradeId];
  else            bank.upgrades[origin.upgradeId] = count - 1;

  return Math.floor(upg.cost * 0.5);
}

// ── Selection ──────────────────────────────────────────────────
function selectUpgrade(id) {
  selectedUpgradeId = selectedUpgradeId === id ? null : id;
  renderFloor();
  renderShop();
  updateFloorHint();
}

function updateFloorHint() {
  const el = document.getElementById("floorHint");
  if (!el) return;
  if (selectedUpgradeId) {
    const upg = FLOOR_UPGRADES.find(u => u.id === selectedUpgradeId);
    el.textContent = `Tap a blue cell to place ${upg.label}`;
    el.className   = "floor-hint active";
  } else {
    el.textContent = "Select an upgrade below to place it";
    el.className   = "floor-hint";
  }
}

// ── Render: grid ───────────────────────────────────────────────
function renderFloor() {
  const container = document.getElementById("floorGrid");
  if (!container) return;

  container.style.gridTemplateColumns = `repeat(${FLOOR_COLS}, 36px)`;
  container.innerHTML = "";

  for (let r = 0; r < FLOOR_ROWS; r++) {
    for (let c = 0; c < FLOOR_COLS; c++) {
      const cell = floorGrid[cellIndex(c, r)];
      const el   = document.createElement("div");
      el.className   = "floor-cell";
      el.dataset.col = c;
      el.dataset.row = r;

      if (cell && !cell.ref) {
        // Origin cell of a placed upgrade
        const upg = FLOOR_UPGRADES.find(u => u.id === cell.upgradeId);
        el.classList.add("floor-cell--placed");
        el.textContent = upg ? upg.icon : "?";
        el.title = upg ? `${upg.label} — click to remove (50% refund)` : "";
      } else if (cell && cell.ref) {
        // Non-origin cell occupied by a multi-cell upgrade
        el.classList.add("floor-cell--occupied");
      } else if (selectedUpgradeId) {
        // Empty cell — highlight valid/invalid for current selection
        if (canPlace(selectedUpgradeId, c, r)) {
          el.classList.add("floor-cell--valid");
        } else {
          el.classList.add("floor-cell--invalid");
        }
      }

      el.addEventListener("click", () => onFloorCellClick(c, r));
      container.appendChild(el);
    }
  }
}

// ── Render: shop ───────────────────────────────────────────────
function renderShop() {
  const container = document.getElementById("shopGrid");
  if (!container) return;

  container.innerHTML = FLOOR_UPGRADES.map(upg => {
    const affordable = bank.cash >= upg.cost;
    const owned      = bank.upgrades?.[upg.id] > 0;
    const selected   = selectedUpgradeId === upg.id;
    const [w, h]     = upg.size;

    let cls = "shop-item";
    if (selected)        cls += " selected";
    if (!affordable && !owned) cls += " unaffordable";
    if (owned)           cls += " owned";

    const bottomLine = owned
      ? `<div class="shop-item-owned">✓ Placed</div>`
      : `<div class="shop-item-cost">${fmt(upg.cost)}</div>`;

    return `
      <div class="${cls}" onclick="selectUpgrade('${upg.id}')" title="${upg.desc}">
        <div class="shop-item-icon">${upg.icon}</div>
        <div class="shop-item-name">${upg.label}</div>
        ${bottomLine}
        <div class="shop-item-size">${w}×${h}</div>
      </div>`;
  }).join("");
}

// ── Click handler ──────────────────────────────────────────────
function onFloorCellClick(col, row) {
  const cell = floorGrid[cellIndex(col, row)];

  if (cell) {
    // Tapped an existing upgrade — remove it for 50% refund
    const refund = removeUpgrade(col, row);
    if (refund > 0) {
      bank.cash   += refund;
      bank.profit += refund;
      addLog(`Upgrade sold for ${fmt(refund)} refund.`, "neutral");
      renderStats();
      renderFloor();
      renderShop();
    }
    return;
  }

  if (!selectedUpgradeId) return;

  const upg = FLOOR_UPGRADES.find(u => u.id === selectedUpgradeId);
  if (!upg) return;

  if (bank.cash < upg.cost) {
    addLog(`Not enough cash to buy ${upg.label} (${fmt(upg.cost)}).`, "warn");
    return;
  }

  if (!canPlace(selectedUpgradeId, col, row)) return;

  bank.cash   -= upg.cost;
  bank.profit -= upg.cost;
  placeUpgrade(selectedUpgradeId, col, row);
  addLog(`${upg.icon} ${upg.label} placed. −${fmt(upg.cost)}`, "good");

  selectedUpgradeId = null;
  renderStats();
  renderFloor();
  renderShop();
  updateFloorHint();
  saveGame();
}

// ── Serialize (called by save.js) ──────────────────────────────
function serializeFloor()        { return [...floorGrid]; }
function deserializeFloor(data)  { floorGrid = data || Array(FLOOR_COLS * FLOOR_ROWS).fill(null); }
