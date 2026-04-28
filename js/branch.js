const TILE = 48;
const BRANCH_COLS = 16;
const BRANCH_ROWS = 10;
const BRANCH_W = BRANCH_COLS * TILE;
const BRANCH_H = BRANCH_ROWS * TILE;

let branchState = null;
let canvas = null;
let ctx = null;
let branchRaf = null;
let lastFrame = 0;
let branchImages = {};
let keysDown = {};
let touchDown = {};
let pointerTile = null;
let sellMode = false;
let decisionOpen = false;

const CHARACTER_ASSETS = {
  player: "assets/characters/player.png",
  customer1: "assets/characters/customer-1.png",
  customer2: "assets/characters/customer-2.png",
  customer3: "assets/characters/customer-3.png",
};

function defaultBranchState() {
  return {
    cols: BRANCH_COLS,
    rows: BRANCH_ROWS,
    objects: [
      { id: "start-counter", upgradeId: "base_counter", x: 6, y: 2, w: 3, h: 1, art: "assets/office/teller-window.png", label: "Main Teller Counter", service: true, fixed: true },
      { id: "start-vault", upgradeId: "base_vault", x: 13, y: 1, w: 2, h: 2, art: "assets/office/vault-upgrade.png", label: "Vault", fixed: true },
      { id: "start-plant", upgradeId: "base_plant", x: 2, y: 2, w: 1, h: 1, art: "assets/office/staff-quarters.png", label: "Lobby Chair", fixed: true },
    ],
    player: { x: 8 * TILE, y: 6 * TILE, dir: "down" },
    customers: [],
    mode: "play",
    selectedBuildItem: null,
    buildRotation: 0,
    activeDecisionCustomerId: null,
    tellerLocked: false,
    nextCustomerId: 1,
    nextSpawnAt: 0,
    spawnedCount: 0,
    openForCustomers: true,
  };
}

function initBranch() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  if (!branchState) branchState = defaultBranchState();
  loadBranchImages();
  bindBranchInput();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  renderShop();
  updateBuildPanel();
  startBranchLoop();
}

function loadBranchImages() {
  branchImages = {};
  const paths = new Set(Object.values(CHARACTER_ASSETS));
  FLOOR_UPGRADES.forEach(upg => { if (upg.art) paths.add(upg.art); });
  branchState.objects.forEach(obj => { if (obj.art) paths.add(obj.art); });
  paths.forEach(path => {
    if (branchImages[path]) return;
    const img = new Image();
    img.src = path;
    branchImages[path] = img;
  });
}

function resizeCanvas() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function bindBranchInput() {
  window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "e", "enter", "b", "escape", "r"].includes(key)) e.preventDefault();
    keysDown[key] = true;
    if (key === "b") toggleBuildMode();
    if (key === "escape") closeTopMode();
    if (key === "e" || key === "enter") interactWithCustomer();
    if (key === "r" && branchState.mode === "build") rotateBuildItem();
  });
  window.addEventListener("keyup", e => { keysDown[e.key.toLowerCase()] = false; });

  canvas.addEventListener("mousemove", e => { pointerTile = eventToTile(e); });
  canvas.addEventListener("mouseleave", () => { pointerTile = null; });
  canvas.addEventListener("click", e => handleCanvasClick(eventToTile(e)));

  document.getElementById("closeBuildBtn").addEventListener("click", () => setBuildMode(false));
  document.getElementById("ledgerToggleBtn").addEventListener("click", toggleLedger);
  document.getElementById("ledgerCloseBtn").addEventListener("click", () => setLedgerVisible(false));
  document.getElementById("rotateBtn").addEventListener("click", rotateBuildItem);
  document.getElementById("sellBtn").addEventListener("click", () => {
    sellMode = !sellMode;
    document.getElementById("sellBtn").classList.toggle("active", sellMode);
    updateModeBanner();
  });
  document.getElementById("touchActionBtn").addEventListener("click", interactWithCustomer);
  document.getElementById("touchBuildBtn").addEventListener("click", toggleBuildMode);
  document.querySelectorAll("[data-touch]").forEach(btn => {
    const dir = btn.dataset.touch;
    btn.addEventListener("pointerdown", e => { e.preventDefault(); touchDown[dir] = true; });
    btn.addEventListener("pointerup", e => { e.preventDefault(); touchDown[dir] = false; });
    btn.addEventListener("pointercancel", () => { touchDown[dir] = false; });
    btn.addEventListener("pointerleave", () => { touchDown[dir] = false; });
  });
}

function startBranchLoop() {
  if (branchRaf) cancelAnimationFrame(branchRaf);
  lastFrame = performance.now();
  branchRaf = requestAnimationFrame(branchLoop);
}

function branchLoop(ts) {
  const dt = Math.min(0.05, (ts - lastFrame) / 1000 || 0);
  lastFrame = ts;
  updateBranch(dt);
  drawBranch();
  branchRaf = requestAnimationFrame(branchLoop);
}

function updateBranch(dt) {
  if (!branchState) return;
  if (branchState.mode !== "build") {
    if (branchState.tellerLocked) keepPlayerAtTeller();
    else updatePlayer(dt);
    updateCustomers(dt);
    maybeSpawnCustomer();
  }
  updateInteractionPrompt();
}

function updatePlayer(dt) {
  let dx = 0, dy = 0;
  if (keysDown.w || keysDown.arrowup || touchDown.up) dy -= 1;
  if (keysDown.s || keysDown.arrowdown || touchDown.down) dy += 1;
  if (keysDown.a || keysDown.arrowleft || touchDown.left) dx -= 1;
  if (keysDown.d || keysDown.arrowright || touchDown.right) dx += 1;
  if (!dx && !dy) return;
  const len = Math.hypot(dx, dy);
  dx /= len; dy /= len;
  if (Math.abs(dx) > Math.abs(dy)) branchState.player.dir = dx > 0 ? "right" : "left";
  else branchState.player.dir = dy > 0 ? "down" : "up";
  const speed = 185;
  moveActor(branchState.player, dx * speed * dt, dy * speed * dt);
}

function moveActor(actor, dx, dy) {
  const nx = actor.x + dx;
  const ny = actor.y + dy;
  if (!collidesAt(nx, actor.y)) actor.x = nx;
  if (!collidesAt(actor.x, ny)) actor.y = ny;
}

function collidesAt(x, y) {
  const radius = 14;
  const points = [
    [x - radius, y - radius], [x + radius, y - radius],
    [x - radius, y + radius], [x + radius, y + radius],
  ];
  return points.some(([px, py]) => isBlockedTile(Math.floor(px / TILE), Math.floor(py / TILE)));
}

function isBlockedTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= BRANCH_COLS || ty >= BRANCH_ROWS) return true;
  if (ty === 0 || tx === 0 || tx === BRANCH_COLS - 1) return true;
  if (ty === BRANCH_ROWS - 1 && tx !== 7 && tx !== 8) return true;
  return branchState.objects.some(obj => objectBlocks(obj, tx, ty));
}

function objectBlocks(obj, tx, ty) {
  return tx >= obj.x && tx < obj.x + obj.w && ty >= obj.y && ty < obj.y + obj.h;
}

function maybeSpawnCustomer() {
  if (!branchState.openForCustomers) return;
  const activeCustomers = branchState.customers.filter(c => c.state !== "leaving").length;
  if (activeCustomers >= 5) return;
  if (branchState.spawnedCount < qIdx) branchState.spawnedCount = qIdx;
  if (performance.now() < branchState.nextSpawnAt) return;
  if (branchState.spawnedCount >= queue.length) queue.push(makeCustomerEvent());
  const idx = branchState.spawnedCount;
  branchState.spawnedCount++;
  branchState.nextSpawnAt = performance.now() + randInt(1800, 3400);
  branchState.customers.push({
    id: branchState.nextCustomerId++,
    queueIndex: idx,
    event: queue[idx],
    x: 7.5 * TILE,
    y: 9.6 * TILE,
    state: "walking",
    sprite: `customer${(idx % 3) + 1}`,
  });
}

function updateCustomers(dt) {
  const active = branchState.customers
    .filter(c => c.state !== "leaving")
    .sort((a, b) => a.queueIndex - b.queueIndex);

  active.forEach((customer, rank) => {
    const target = customerTargetForRank(rank);
    if (rank !== 0 && customer.state === "ready") customer.state = "walking";
    if (customer.state !== "ready" || rank !== 0) {
      if (walkToward(customer, target, dt, 96)) {
        if (rank === 0) {
          customer.state = "ready";
          customer.waitStarted = performance.now();
        } else {
          customer.state = "queued";
        }
      } else {
        customer.state = "walking";
      }
    }
  });

  branchState.customers.forEach(customer => {
    if (customer.state === "leaving") {
      walkToward(customer, { x: 7.5 * TILE, y: 10.5 * TILE }, dt, 105);
      if (customer.y > BRANCH_H + 20) customer.remove = true;
    }
  });
  branchState.customers = branchState.customers.filter(c => !c.remove);
  if (branchState.tellerLocked && !decisionOpen && !branchState.activeDecisionCustomerId) {
    const customer = frontReadyCustomer();
    if (customer) openDecisionOverlay(customer.event, customer.id);
  }
}

function tellerStation() {
  const obj = branchState.objects.find(o => o.service) || branchState.objects.find(o => o.upgradeId === "base_counter");
  const centerX = (obj.x + obj.w / 2) * TILE;
  return {
    counter: obj,
    customer: { x: centerX, y: (obj.y + obj.h + 0.55) * TILE },
    player: { x: centerX, y: Math.max(1.35 * TILE, (obj.y - 0.4) * TILE) },
  };
}

function customerTargetForRank(rank) {
  const station = tellerStation();
  return {
    x: station.customer.x,
    y: station.customer.y + Math.min(rank, 4) * TILE * 0.78,
  };
}

function keepPlayerAtTeller() {
  const station = tellerStation();
  branchState.player.x = station.player.x;
  branchState.player.y = station.player.y;
  branchState.player.dir = "down";
}

function walkToward(actor, target, dt, speed) {
  const dx = target.x - actor.x;
  const dy = target.y - actor.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  actor.x += (dx / dist) * Math.min(dist, speed * dt);
  actor.y += (dy / dist) * Math.min(dist, speed * dt);
  return false;
}

function drawBranch() {
  if (!ctx) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const camera = getCamera();
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);
  drawRoom();
  drawTellerMarkers();
  drawObjects();
  drawCustomers();
  drawPlayer();
  if (branchState.mode === "build") drawBuildOverlay();
  ctx.restore();
}

function drawTellerMarkers() {
  const station = tellerStation();
  ctx.fillStyle = branchState.tellerLocked ? "rgba(46,204,113,0.32)" : "rgba(74,163,223,0.24)";
  ctx.beginPath();
  ctx.arc(station.player.x, station.player.y + 8, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = branchState.tellerLocked ? "#2ecc71" : "#4aa3df";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(241,196,15,0.18)";
  ctx.beginPath();
  ctx.arc(station.customer.x, station.customer.y + 10, 18, 0, Math.PI * 2);
  ctx.fill();
}

function getCamera() {
  const margin = 28;
  const reservedBottom = window.innerWidth <= 760 ? 388 : 286;
  const availableHeight = Math.max(360, window.innerHeight - reservedBottom);
  const scale = Math.min((window.innerWidth - margin * 2) / BRANCH_W, (availableHeight - margin * 2) / BRANCH_H, 1.35);
  return {
    scale,
    x: Math.floor((window.innerWidth - BRANCH_W * scale) / 2),
    y: Math.floor((availableHeight - BRANCH_H * scale) / 2),
  };
}

function drawRoom() {
  ctx.fillStyle = "#101820";
  ctx.fillRect(0, 0, BRANCH_W, BRANCH_H);
  for (let y = 0; y < BRANCH_ROWS; y++) {
    for (let x = 0; x < BRANCH_COLS; x++) {
      const wall = y === 0 || x === 0 || x === BRANCH_COLS - 1 || (y === BRANCH_ROWS - 1 && x !== 7 && x !== 8);
      ctx.fillStyle = wall ? "#273544" : ((x + y) % 2 ? "#b99d72" : "#c7ad83");
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      if (!wall) {
        ctx.strokeStyle = "rgba(73, 49, 33, 0.12)";
        ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
      }
    }
  }
  ctx.fillStyle = "#6f5137";
  ctx.fillRect(7 * TILE, (BRANCH_ROWS - 1) * TILE, TILE * 2, TILE);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(2 * TILE, 0, TILE * 3, 8);
  ctx.fillRect(10 * TILE, 0, TILE * 3, 8);
}

function drawObjects() {
  const objects = [...branchState.objects].sort((a, b) => (a.y + a.h) - (b.y + b.h));
  objects.forEach(obj => {
    const img = branchImages[obj.art];
    const px = obj.x * TILE;
    const py = obj.y * TILE;
    ctx.fillStyle = "rgba(38, 25, 15, 0.16)";
    ctx.fillRect(px + 3, py + 3, obj.w * TILE - 6, obj.h * TILE - 6);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(px + 4, py + obj.h * TILE - 8, obj.w * TILE - 8, 7);
    if (obj.service) drawServiceCounter(obj, px, py);
    else if (img && img.complete) drawContainedImage(img, px + 4, py + 4, obj.w * TILE - 8, obj.h * TILE - 8);
    else {
      ctx.fillStyle = "#516579";
      ctx.fillRect(px + 5, py + 5, obj.w * TILE - 10, obj.h * TILE - 10);
    }
  });
}

function drawServiceCounter(obj, px, py) {
  const w = obj.w * TILE - 8;
  const h = obj.h * TILE - 8;
  ctx.fillStyle = "#5f3920";
  ctx.fillRect(px + 4, py + 10, w, h - 12);
  ctx.fillStyle = "#a16b3b";
  ctx.fillRect(px + 8, py + 8, w - 8, 10);
  ctx.fillStyle = "#2d4056";
  ctx.fillRect(px + 14, py + 19, w - 28, 5);
  const img = branchImages[obj.art];
  if (img && img.complete) drawContainedImage(img, px + w / 2 - 18, py + 4, 36, 36);
}

function drawContainedImage(img, x, y, w, h) {
  const iw = img.naturalWidth || img.width || 48;
  const ih = img.naturalHeight || img.height || 48;
  const scale = Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawCustomers() {
  branchState.customers.forEach(customer => {
    const img = branchImages[CHARACTER_ASSETS[customer.sprite]];
    drawActorSprite(img, customer.x, customer.y, customer.state === "ready" ? "#f1c40f" : "#4aa3df");
    if (customer.state === "ready") {
      ctx.fillStyle = "#f1c40f";
      ctx.beginPath();
      ctx.arc(customer.x, customer.y - 42, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawPlayer() {
  if (branchState.tellerLocked) {
    ctx.fillStyle = "rgba(46,204,113,0.22)";
    ctx.beginPath();
    ctx.arc(branchState.player.x, branchState.player.y + 8, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  drawActorSprite(branchImages[CHARACTER_ASSETS.player], branchState.player.x, branchState.player.y, "#2ecc71");
}

function drawActorSprite(img, x, y, ring) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 17, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (img && img.complete) ctx.drawImage(img, 0, 0, 48, 48, x - 24, y - 38, 48, 48);
  else {
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(x, y - 12, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBuildOverlay() {
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= BRANCH_COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x * TILE + 0.5, 0); ctx.lineTo(x * TILE + 0.5, BRANCH_H); ctx.stroke();
  }
  for (let y = 0; y <= BRANCH_ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * TILE + 0.5); ctx.lineTo(BRANCH_W, y * TILE + 0.5); ctx.stroke();
  }
  if (!pointerTile) return;
  const selected = FLOOR_UPGRADES.find(u => u.id === selectedUpgradeId);
  const existing = objectAt(pointerTile.x, pointerTile.y);
  if (sellMode && existing && !existing.fixed) {
    fillPlacement(pointerTile.x, pointerTile.y, existing.w, existing.h, "rgba(231,76,60,0.42)");
  } else if (selected) {
    const size = buildSize(selected);
    fillPlacement(pointerTile.x, pointerTile.y, size.w, size.h, canPlaceBranch(selected.id, pointerTile.x, pointerTile.y) ? "rgba(46,204,113,0.36)" : "rgba(231,76,60,0.36)");
  }
}

function fillPlacement(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * TILE, y * TILE, w * TILE, h * TILE);
}

function eventToTile(e) {
  const rect = canvas.getBoundingClientRect();
  const camera = getCamera();
  return {
    x: Math.floor((e.clientX - rect.left - camera.x) / camera.scale / TILE),
    y: Math.floor((e.clientY - rect.top - camera.y) / camera.scale / TILE),
  };
}

function handleCanvasClick(tile) {
  if (branchState.mode !== "build" || !tile) return;
  if (sellMode) {
    const obj = objectAt(tile.x, tile.y);
    if (!obj || obj.fixed) return;
    removeBranchObject(obj);
    return;
  }
  if (!selectedUpgradeId) return;
  placeBranchUpgrade(selectedUpgradeId, tile.x, tile.y);
}

function buildSize(upg) {
  const [a, b] = upg.size;
  const rotated = branchState.buildRotation % 180 !== 0;
  return { w: rotated ? b : a, h: rotated ? a : b };
}

function canPlaceBranch(upgradeId, x, y) {
  const upg = FLOOR_UPGRADES.find(u => u.id === upgradeId);
  if (!upg) return false;
  const size = buildSize(upg);
  if (x < 1 || y < 1 || x + size.w > BRANCH_COLS - 1 || y + size.h > BRANCH_ROWS - 1) return false;
  for (let yy = y; yy < y + size.h; yy++)
    for (let xx = x; xx < x + size.w; xx++)
      if (objectAt(xx, yy)) return false;
  return true;
}

function placeBranchUpgrade(upgradeId, x, y) {
  const upg = FLOOR_UPGRADES.find(u => u.id === upgradeId);
  if (!upg || !canPlaceBranch(upgradeId, x, y)) return false;
  if (bank.cash < upg.cost) {
    addLog(`Not enough cash to buy ${upg.label} (${fmt(upg.cost)}).`, "warn");
    return false;
  }
  const size = buildSize(upg);
  bank.cash -= upg.cost;
  bank.profit -= upg.cost;
  bank.upgrades = bank.upgrades || {};
  bank.upgrades[upgradeId] = (bank.upgrades[upgradeId] || 0) + 1;
  branchState.objects.push({
    id: `obj-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    upgradeId,
    x, y,
    w: size.w,
    h: size.h,
    rotation: branchState.buildRotation,
    art: upg.art,
    label: upg.label,
    service: upgradeId === "teller_window",
  });
  addLog(`${upg.label} placed. -${fmt(upg.cost)}`, "good");
  renderStats();
  renderShop();
  saveGame();
  return true;
}

function removeBranchObject(obj) {
  branchState.objects = branchState.objects.filter(o => o.id !== obj.id);
  const upg = FLOOR_UPGRADES.find(u => u.id === obj.upgradeId);
  if (upg) {
    const refund = Math.floor(upg.cost * 0.5);
    bank.cash += refund;
    bank.profit += refund;
    const count = bank.upgrades?.[obj.upgradeId] || 1;
    if (count <= 1) delete bank.upgrades[obj.upgradeId];
    else bank.upgrades[obj.upgradeId] = count - 1;
    addLog(`${upg.label} sold for ${fmt(refund)}.`, "neutral");
  }
  renderStats();
  renderShop();
  saveGame();
}

function objectAt(x, y) {
  return branchState.objects.find(obj => x >= obj.x && x < obj.x + obj.w && y >= obj.y && y < obj.y + obj.h);
}

function toggleBuildMode() { setBuildMode(branchState.mode !== "build"); }

function setBuildMode(on) {
  branchState.mode = on ? "build" : "play";
  if (on) {
    setLedgerVisible(false);
    branchState.tellerLocked = false;
  }
  if (!on) {
    sellMode = false;
    document.getElementById("sellBtn").classList.remove("active");
  }
  updateBuildPanel();
  updateModeBanner();
}

function toggleLedger() {
  const panel = document.getElementById("ledgerPanel");
  setLedgerVisible(!panel.classList.contains("show"));
}

function setLedgerVisible(show) {
  const panel = document.getElementById("ledgerPanel");
  const button = document.getElementById("ledgerToggleBtn");
  if (!panel || !button) return;
  panel.classList.toggle("show", show);
  button.classList.toggle("active", show);
  button.textContent = show ? "Hide Ledger" : "Ledger";
}

function updateBuildPanel() {
  const panel = document.getElementById("buildPanel");
  if (!panel) return;
  panel.classList.toggle("show", branchState?.mode === "build");
}

function rotateBuildItem() {
  branchState.buildRotation = (branchState.buildRotation + 90) % 360;
  document.getElementById("rotateBtn").classList.add("active");
  setTimeout(() => document.getElementById("rotateBtn")?.classList.remove("active"), 140);
}

function closeTopMode() {
  if (decisionOpen) return;
  if (branchState.tellerLocked) {
    toggleTellerLock(false);
    return;
  }
  if (branchState.mode === "build") setBuildMode(false);
}

function updateModeBanner() {
  const el = document.getElementById("modeBanner");
  if (!el) return;
  if (branchState.mode === "build") {
    el.textContent = sellMode ? "Sell mode: click a furnishing to remove it" : "Build mode: choose a furnishing, then click the floor";
  } else if (branchState.tellerLocked) {
    el.textContent = "Serving at the teller wicket. Press E to serve or Esc to step away";
  } else {
    el.textContent = "Walk to the teller wicket and press E to serve customers";
  }
}

function updateInteractionPrompt() {
  const el = document.getElementById("interactionPrompt");
  if (!el) return;
  const ready = frontReadyCustomer();
  const nearWicket = isNearTellerWicket();
  el.classList.toggle("show", branchState.tellerLocked || (!branchState.tellerLocked && nearWicket));
  if (branchState.tellerLocked && ready) el.textContent = "Serving next customer";
  else if (branchState.tellerLocked) el.textContent = "Waiting for the next customer";
  else if (nearWicket) el.textContent = "Press E to lock in at the teller wicket";
}

function frontReadyCustomer() {
  return branchState.customers
    .filter(c => c.state === "ready")
    .sort((a, b) => a.queueIndex - b.queueIndex)[0] || null;
}

function isNearTellerWicket() {
  const station = tellerStation();
  return Math.hypot(station.player.x - branchState.player.x, station.player.y - branchState.player.y) < 72;
}

function toggleTellerLock(force) {
  const next = typeof force === "boolean" ? force : !branchState.tellerLocked;
  if (next && !isNearTellerWicket()) return false;
  branchState.tellerLocked = next;
  if (next) keepPlayerAtTeller();
  updateModeBanner();
  return true;
}

function interactWithCustomer() {
  if (branchState.mode === "build" || decisionOpen) return;
  if (!branchState.tellerLocked) {
    toggleTellerLock(true);
    return;
  }
  const customer = frontReadyCustomer();
  if (!customer) {
    toggleTellerLock(false);
    return;
  }
  openDecisionOverlay(customer.event, customer.id);
}

function openDecisionOverlay(event, customerId) {
  branchState.activeDecisionCustomerId = customerId;
  decisionOpen = true;
  renderEvent();
  document.getElementById("decisionLayer").classList.add("show");
}

function closeDecisionOverlay() {
  decisionOpen = false;
  branchState.activeDecisionCustomerId = null;
  document.getElementById("decisionLayer").classList.remove("show");
}

function resolveCustomer(customerId, choice) {
  const customer = branchState.customers.find(c => c.id === customerId);
  if (!customer) return;
  const ev = customer.event;
  const res = choice === "approve" ? ev.onApprove() : ev.onDeny();
  ev.resolved = true;
  addLog(res.msg, res.kind);
  customer.state = "leaving";
  closeDecisionOverlay();
  advanceResolvedQueue();
  renderStats();
  saveGame();
  if (checkLose()) { stopTimers(); return; }
}

function autoResolveCustomer(customer, silent = false) {
  if (!customer || customer.state === "leaving") return true;
  const ev = customer.event;
  const approve = ev.single || ev.eventType !== "Credit Application";
  const res = approve ? ev.onApprove() : ev.onDeny();
  ev.resolved = true;
  if (!silent) addLog(`Auto: ${res.msg}`, res.kind);
  customer.state = "leaving";
  advanceResolvedQueue();
  renderStats();
  if (checkLose()) { stopTimers(); return false; }
  return true;
}

function branchAutoResolve(silent = false) {
  const customer = branchState.customers.find(c => c.queueIndex === qIdx && c.state !== "leaving");
  if (customer) return autoResolveCustomer(customer, silent);
  const ev = queue[qIdx];
  if (!ev) return true;
  const approve = ev.single || ev.eventType !== "Credit Application";
  const res = approve ? ev.onApprove() : ev.onDeny();
  ev.resolved = true;
  if (!silent) addLog(`Auto: ${res.msg}`, res.kind);
  advanceResolvedQueue();
  renderStats();
  if (checkLose()) { stopTimers(); return false; }
  return true;
}

function startBranchDay() {
  branchState.customers = [];
  branchState.spawnedCount = 0;
  branchState.nextSpawnAt = performance.now() + 800;
  branchState.activeDecisionCustomerId = null;
  branchState.openForCustomers = true;
  decisionOpen = false;
  document.getElementById("decisionLayer")?.classList.remove("show");
  updateModeBanner();
}

function advanceResolvedQueue() {
  while (queue[qIdx]?.resolved) qIdx++;
}

function serializeBranch() {
  return {
    cols: BRANCH_COLS,
    rows: BRANCH_ROWS,
    objects: branchState.objects.filter(o => !o.fixed),
    player: branchState.player,
  };
}

function deserializeBranch(data) {
  branchState = defaultBranchState();
  if (Array.isArray(data)) {
    migrateLegacyFloor(data);
    return;
  }
  if (!data || !Array.isArray(data.objects)) return;
  branchState.objects = [
    ...branchState.objects.filter(o => o.fixed),
    ...data.objects.map(obj => ({ ...obj, service: obj.service || obj.upgradeId === "teller_window" })),
  ];
  if (data.player) branchState.player = data.player;
  loadBranchImages();
}

function migrateLegacyFloor(floor) {
  const seen = new Set();
  floor.forEach((cell, index) => {
    if (!cell || cell.ref || !cell.upgradeId || seen.has(`${cell.originCol},${cell.originRow}`)) return;
    seen.add(`${cell.originCol},${cell.originRow}`);
    const upg = FLOOR_UPGRADES.find(u => u.id === cell.upgradeId);
    if (!upg) return;
    const [w, h] = upg.size;
    branchState.objects.push({
      id: `legacy-${index}`,
      upgradeId: upg.id,
      x: Math.min(1 + (cell.originCol || 0), BRANCH_COLS - w - 1),
      y: Math.min(1 + (cell.originRow || 0), BRANCH_ROWS - h - 1),
      w, h,
      art: upg.art,
      label: upg.label,
      service: upg.id === "teller_window",
    });
  });
}
