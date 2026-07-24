const TILE = 48;
const BRANCH_COLS = 18;
const BRANCH_ROWS = 11;
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
let lastStatusRenderAt = 0;
let lastModalDrawAt = 0;
let resizeRaf = null;
let staticScene = null;
let staticSceneDirty = true;

const WESTERN_CHARACTER_ATLAS = "assets/western/characters-atlas.png";
const WESTERN_FURNITURE_ATLAS = "assets/western/furniture-atlas.png";

const CHARACTER_ASSETS = {
  player:    { src: WESTERN_CHARACTER_ATLAS, x: 150, y: 20,  w: 280, h: 450 },
  teller:    { src: WESTERN_CHARACTER_ATLAS, x: 610, y: 20,  w: 270, h: 450 },
  customer1: { src: WESTERN_CHARACTER_ATLAS, x: 1040, y: 20, w: 330, h: 450 },
  customer2: { src: WESTERN_CHARACTER_ATLAS, x: 120, y: 500, w: 330, h: 510 },
  customer3: { src: WESTERN_CHARACTER_ATLAS, x: 600, y: 500, w: 300, h: 510 },
};

const FURNITURE_ASSETS = {
  counter: { src: WESTERN_FURNITURE_ATLAS, x: 20,   y: 30,  w: 650, h: 430 },
  cage:    { src: WESTERN_FURNITURE_ATLAS, x: 680,  y: 20,  w: 340, h: 460 },
  vault:   { src: WESTERN_FURNITURE_ATLAS, x: 1060, y: 20,  w: 400, h: 470 },
  desk:    { src: WESTERN_FURNITURE_ATLAS, x: 20,   y: 520, w: 480, h: 490 },
  bench:   { src: WESTERN_FURNITURE_ATLAS, x: 500,  y: 520, w: 650, h: 440 },
  stove:   { src: WESTERN_FURNITURE_ATLAS, x: 1170, y: 500, w: 300, h: 510 },
};

const UPGRADE_SPRITES = {
  teller_window: "cage",
  risk_desk: "desk",
  vault_upgrade: "vault",
  pr_office: "desk",
  atm: "cage",
  break_room: "stove",
  safe_deposit: "vault",
  lobby: "bench",
};

function defaultBranchState() {
  return {
    cols: BRANCH_COLS,
    rows: BRANCH_ROWS,
    objects: [
      { id: "start-counter", upgradeId: "base_counter", x: 6, y: 3, w: 6, h: 2, sprite: "counter", label: "Main Teller Counter", service: true, fixed: true },
      { id: "start-vault", upgradeId: "base_vault", x: 15, y: 1, w: 2, h: 2, sprite: "vault", label: "Iron Vault", fixed: true },
      { id: "manager-desk", upgradeId: "base_desk", x: 1, y: 1, w: 3, h: 2, sprite: "desk", label: "Manager's Desk", fixed: true },
      { id: "lobby-bench-left", upgradeId: "base_bench", x: 1, y: 6, w: 3, h: 1, sprite: "bench", label: "Waiting Bench", fixed: true },
      { id: "lobby-bench-right", upgradeId: "base_bench", x: 14, y: 6, w: 3, h: 1, sprite: "bench", label: "Waiting Bench", fixed: true },
      { id: "lobby-stove", upgradeId: "base_stove", x: 16, y: 8, w: 1, h: 2, sprite: "stove", label: "Potbelly Stove", fixed: true },
    ],
    player: { x: 9 * TILE, y: 2.25 * TILE, dir: "down" },
    customers: [],
    mode: "play",
    selectedBuildItem: null,
    buildRotation: 0,
    activeDecisionCustomerId: null,
    tellerLocked: false,
    nextCustomerId: 1,
    nextSpawnAt: 0,
    nextStaffServiceAt: 0,
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
  window.addEventListener("resize", requestCanvasResize);
  renderShop();
  updateBuildPanel();
  startBranchLoop();
}

function loadBranchImages() {
  branchImages = {};
  staticSceneDirty = true;
  const paths = new Set([
    ...Object.values(CHARACTER_ASSETS).map(asset => asset.src),
    WESTERN_FURNITURE_ATLAS,
  ]);
  FLOOR_UPGRADES.forEach(upg => { if (upg.art) paths.add(upg.art); });
  branchState.objects.forEach(obj => { if (obj.art) paths.add(obj.art); });
  paths.forEach(path => {
    if (branchImages[path]) return;
    const img = new Image();
    img.addEventListener("load", () => { staticSceneDirty = true; }, { once: true });
    img.src = path;
    branchImages[path] = img;
  });
}

function resizeCanvas() {
  if (!canvas) return;
  const cssPixels = Math.max(1, window.innerWidth * window.innerHeight);
  const pixelBudgetRatio = Math.sqrt(6_000_000 / cssPixels);
  const dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 1.5, pixelBudgetRatio));
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  BankRuntimeMetrics.canvasPixels = canvas.width * canvas.height;
}

function requestCanvasResize() {
  if (resizeRaf !== null) return;
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = null;
    resizeCanvas();
  });
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
  window.addEventListener("blur", () => {
    keysDown = {};
    touchDown = {};
  });

  canvas.addEventListener("mousemove", e => { pointerTile = eventToTile(e); });
  canvas.addEventListener("mouseleave", () => { pointerTile = null; });
  canvas.addEventListener("click", e => handleCanvasClick(eventToTile(e)));

  document.getElementById("closeBuildBtn").addEventListener("click", () => setBuildMode(false));
  document.getElementById("buildModeBtn").addEventListener("click", toggleBuildMode);
  document.getElementById("ledgerToggleBtn").addEventListener("click", toggleLedger);
  document.getElementById("ledgerCloseBtn").addEventListener("click", () => setLedgerVisible(false));
  document.getElementById("rotateBtn").addEventListener("click", rotateBuildItem);
  document.getElementById("sellBtn").addEventListener("click", toggleSellMode);
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
  BankRuntimeMetrics.branchFrames++;
  const dt = Math.min(0.05, (ts - lastFrame) / 1000 || 0);
  lastFrame = ts;
  if (typeof BankControls !== "undefined") BankControls.update(ts);
  if (document.hidden) {
    branchRaf = requestAnimationFrame(branchLoop);
    return;
  }
  if (decisionOpen) {
    if (ts - lastModalDrawAt >= 250) {
      lastModalDrawAt = ts;
      updateInteractionPrompt();
      renderBranchStatus();
      drawBranch();
    }
    branchRaf = requestAnimationFrame(branchLoop);
    return;
  }
  updateBranch(dt);
  drawBranch();
  branchRaf = requestAnimationFrame(branchLoop);
}

function updateBranch(dt) {
  if (!branchState) return;
  if (decisionOpen) {
    updateInteractionPrompt();
    renderBranchStatus();
    return;
  }
  if (branchState.mode !== "build") {
    if (branchState.tellerLocked) keepPlayerAtTeller();
    else updatePlayer(dt);
    updateCustomers(dt);
    maybeStaffServe();
    maybeSpawnCustomer();
  }
  updateInteractionPrompt();
  renderBranchStatus();
}

function maybeStaffServe() {
  if (!bank.staff?.length || decisionOpen || branchState.tellerLocked) return;
  const customer = frontReadyCustomer();
  if (!customer || performance.now() < branchState.nextStaffServiceAt) return;
  const member = BankOperations.selectStaffForEvent(bank, customer.event.eventType);
  if (!member) return;
  const choice = staffDecisionFor(customer.event, member);
  autoResolveCustomer(customer, false, member, choice);
  branchState.nextStaffServiceAt = performance.now()
    + BankOperations.serviceIntervalMs(bank, customer.event.eventType) * BankWorld.modifiers(bank).serviceInterval;
}

function updatePlayer(dt) {
  let dx = 0, dy = 0;
  if (keysDown.w || keysDown.arrowup || touchDown.up) dy -= 1;
  if (keysDown.s || keysDown.arrowdown || touchDown.down) dy += 1;
  if (keysDown.a || keysDown.arrowleft || touchDown.left) dx -= 1;
  if (keysDown.d || keysDown.arrowright || touchDown.right) dx += 1;
  if (typeof BankControls !== "undefined") {
    const controller = BankControls.getMovement();
    dx += controller.x;
    dy += controller.y;
  }
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
  if (ty === BRANCH_ROWS - 1 && tx !== 8 && tx !== 9) return true;
  return branchState.objects.some(obj => objectBlocks(obj, tx, ty));
}

function objectBlocks(obj, tx, ty) {
  return tx >= obj.x && tx < obj.x + obj.w && ty >= obj.y && ty < obj.y + obj.h;
}

function maybeSpawnCustomer() {
  if (!branchState.openForCustomers) return;
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("debugNoCustomers") === "1") return;
  const activeCustomers = branchState.customers.filter(c => c.state !== "leaving").length;
  if (activeCustomers >= 5) return;
  if (branchState.spawnedCount < qIdx) branchState.spawnedCount = qIdx;
  if (performance.now() < branchState.nextSpawnAt) return;
  if (branchState.spawnedCount >= queue.length) queue.push(makeCustomerEvent());
  const idx = branchState.spawnedCount;
  branchState.spawnedCount++;
  branchState.nextSpawnAt = performance.now()
    + randInt(1800, 3400)
      * BankWorld.modifiers(bank).spawnInterval
      / BankCampaign.activePricingEffects(bank).customerDemand
      / BankMarket.locationProfile(bank).growth;
  branchState.customers.push({
    id: branchState.nextCustomerId++,
    queueIndex: idx,
    event: queue[idx],
    x: 8.5 * TILE,
    y: 10.6 * TILE,
    state: "walking",
    sprite: `customer${(idx % 3) + 1}`,
    arrivedAt: performance.now(),
  });
}

function updateCustomers(dt) {
  const now = performance.now();
  branchState.customers.forEach(customer => {
    if (
      customer.state !== "leaving" &&
      !customer.event?.isNarrative &&
      customer.id !== branchState.activeDecisionCustomerId &&
      BankOperations.patienceRatio(customer, now, bank) <= 0
    ) {
      abandonCustomer(customer);
    }
  });

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
          customer.waitStarted = now;
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
      walkToward(customer, { x: 8.5 * TILE, y: 11.5 * TILE }, dt, 105);
      if (customer.y > BRANCH_H + 20) customer.remove = true;
    }
  });
  branchState.customers = branchState.customers.filter(c => !c.remove);
  if (branchState.tellerLocked && !decisionOpen && !branchState.activeDecisionCustomerId) {
    const customer = frontReadyCustomer();
    if (customer) openDecisionOverlay(customer.event, customer.id);
  }
  const health = BankOperations.queueHealth(branchState.customers, now, bank);
  bank.dayMetrics.maxQueue = Math.max(bank.dayMetrics.maxQueue || 0, health.count);
}

function abandonCustomer(customer) {
  customer.event.resolved = true;
  customer.state = "leaving";
  bank.rep = Math.max(0, bank.rep - 2);
  bank.stats.customersLost++;
  bank.dayMetrics.customersLost++;
  if (customer.event.segmentId) {
    BankMarket.recordSegmentOutcome(bank, customer.event.segmentId, "lost", 0);
  }
  addLog(`${customer.event.title} left after waiting too long. Standing -2.`, "bad");
  advanceResolvedQueue();
  renderStats();
  saveGame();
  checkLose();
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
  BankRuntimeMetrics.branchDraws++;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const camera = getCamera();
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);
  drawStaticScene();
  drawTellerMarkers();
  drawStaff();
  drawCustomers();
  drawPlayer();
  if (branchState.mode === "build") drawBuildOverlay();
  ctx.restore();
}

function drawStaticScene() {
  if (!staticScene || staticSceneDirty) {
    staticScene = document.createElement("canvas");
    staticScene.width = BRANCH_W;
    staticScene.height = BRANCH_H;
    const liveContext = ctx;
    ctx = staticScene.getContext("2d");
    drawRoom();
    drawObjects();
    ctx = liveContext;
    staticSceneDirty = false;
    BankRuntimeMetrics.staticSceneRenders++;
  }
  ctx.drawImage(staticScene, 0, 0);
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
  const mobile = window.innerWidth <= 760;
  const compact = window.innerWidth <= 900;
  const margin = mobile ? 10 : 24;
  const reservedTop = mobile ? 326 : compact ? 225 : 112;
  const reservedBottom = mobile ? 168 : 18;
  const availableHeight = Math.max(300, window.innerHeight - reservedTop - reservedBottom);
  const scale = Math.min((window.innerWidth - margin * 2) / BRANCH_W, availableHeight / BRANCH_H, 1.28);
  return {
    scale,
    x: Math.floor((window.innerWidth - BRANCH_W * scale) / 2),
    y: Math.floor(reservedTop + (availableHeight - BRANCH_H * scale) / 2),
  };
}

function drawRoom() {
  ctx.fillStyle = "#1c1009";
  ctx.fillRect(0, 0, BRANCH_W, BRANCH_H);
  for (let y = 0; y < BRANCH_ROWS; y++) {
    for (let x = 0; x < BRANCH_COLS; x++) {
      const wall = y === 0 || x === 0 || x === BRANCH_COLS - 1 || (y === BRANCH_ROWS - 1 && x !== 8 && x !== 9);
      if (wall) {
        ctx.fillStyle = (x + y) % 2 ? "#3b2214" : "#45291a";
      } else {
        const backOffice = y <= 3;
        ctx.fillStyle = backOffice
          ? ((x + y) % 2 ? "#795333" : "#835b38")
          : (y % 2 ? "#a97847" : "#9d6c40");
      }
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      if (!wall) {
        ctx.strokeStyle = "rgba(55, 26, 10, 0.28)";
        ctx.beginPath();
        ctx.moveTo(x * TILE, y * TILE + TILE - 1);
        ctx.lineTo((x + 1) * TILE, y * TILE + TILE - 1);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 225, 165, 0.08)";
        ctx.fillRect(x * TILE + 3, y * TILE + 4, TILE - 6, 2);
      }
    }
  }

  // Public lobby runner leading from the street to the teller line.
  ctx.fillStyle = "#704335";
  ctx.fillRect(7.35 * TILE, 4.15 * TILE, 3.3 * TILE, 6.15 * TILE);
  ctx.strokeStyle = "#c59a52";
  ctx.lineWidth = 3;
  ctx.strokeRect(7.45 * TILE, 4.25 * TILE, 3.1 * TILE, 5.95 * TILE);
  for (let y = 5; y < 10; y++) {
    ctx.fillStyle = y % 2 ? "rgba(224,180,102,0.08)" : "rgba(39,18,9,0.08)";
    ctx.fillRect(7.55 * TILE, y * TILE, 2.9 * TILE, TILE);
  }

  // Brass queue posts make the service path immediately legible.
  ctx.strokeStyle = "#b78936";
  ctx.lineWidth = 3;
  [6, 7.5].forEach(row => {
    ctx.beginPath();
    ctx.moveTo(6.4 * TILE, row * TILE);
    ctx.lineTo(7.25 * TILE, row * TILE);
    ctx.moveTo(10.75 * TILE, row * TILE);
    ctx.lineTo(11.6 * TILE, row * TILE);
    ctx.stroke();
  });
  ctx.fillStyle = "#d0a24e";
  [[6.25,6],[7.25,6],[10.75,6],[11.75,6],[6.25,7.5],[7.25,7.5],[10.75,7.5],[11.75,7.5]]
    .forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x * TILE, y * TILE, 6, 0, Math.PI * 2);
      ctx.fill();
    });

  // Double street doors and warm window light.
  ctx.fillStyle = "#6a3d22";
  ctx.fillRect(8 * TILE, (BRANCH_ROWS - 1) * TILE, TILE * 2, TILE);
  ctx.strokeStyle = "#d2a55b";
  ctx.lineWidth = 2;
  ctx.strokeRect(8 * TILE + 3, (BRANCH_ROWS - 1) * TILE + 3, TILE * 2 - 6, TILE - 6);
  ctx.fillStyle = "rgba(246, 200, 112, 0.42)";
  ctx.fillRect(5 * TILE, 2, TILE * 3, 10);
  ctx.fillRect(10 * TILE, 2, TILE * 3, 10);

  ctx.fillStyle = "#efd39a";
  ctx.font = "700 14px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("FRONTIER TRUST & LOAN", BRANCH_W / 2, 23);
}

function drawObjects() {
  const objects = [...branchState.objects].sort((a, b) => (a.y + a.h) - (b.y + b.h));
  objects.forEach(obj => {
    const spriteKey = obj.sprite || UPGRADE_SPRITES[obj.upgradeId];
    const sprite = FURNITURE_ASSETS[spriteKey];
    const img = branchImages[sprite?.src || obj.art];
    const px = obj.x * TILE;
    const py = obj.y * TILE;
    ctx.fillStyle = "rgba(29, 13, 5, 0.22)";
    ctx.beginPath();
    ctx.ellipse(px + obj.w * TILE / 2, py + obj.h * TILE - 3, Math.max(12, obj.w * TILE * 0.38), 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (sprite && img?.complete) {
      drawContainedSprite(img, sprite, px - 4, py - 14, obj.w * TILE + 8, obj.h * TILE + 22);
    } else if (img && img.complete) {
      drawContainedImage(img, px + 4, py + 4, obj.w * TILE - 8, obj.h * TILE - 8);
    }
    else {
      ctx.fillStyle = "#516579";
      ctx.fillRect(px + 5, py + 5, obj.w * TILE - 10, obj.h * TILE - 10);
    }
  });
}

function drawStaff() {
  if (!bank.staff?.length) return;
  const station = tellerStation();
  const counterStaff = BankOperations.activeStaff(bank, "counter");
  const loanStaff = BankOperations.activeStaff(bank, "loans");
  const counterStations = [
    { x: station.player.x - 34, y: station.player.y },
    ...branchState.objects
      .filter(object => object.upgradeId === "teller_window")
      .map(object => ({ x: object.x * TILE + object.w * TILE / 2, y: object.y * TILE + object.h * TILE / 2 })),
  ];
  const loanStations = branchState.objects
    .filter(object => object.upgradeId === "risk_desk")
    .map(object => ({ x: object.x * TILE + object.w * TILE / 2, y: object.y * TILE + object.h * TILE / 2 }));

  counterStaff.forEach((member, index) => {
    const point = counterStations[index];
    if (point) drawNamedStaff(member, point.x, point.y);
  });
  loanStaff.forEach((member, index) => {
    const point = loanStations[index];
    if (point) drawNamedStaff(member, point.x, point.y);
  });
}

function drawNamedStaff(member, x, y) {
  drawActorSprite(CHARACTER_ASSETS.teller, x, y, "#b46b52");
  ctx.fillStyle = "rgba(35, 18, 8, 0.84)";
  ctx.fillRect(x - 29, y + 23, 58, 13);
  ctx.fillStyle = "#f3d59a";
  ctx.font = "700 8px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(member.name.split(" ")[0].toUpperCase(), x, y + 32);
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

function drawContainedSprite(img, sprite, x, y, w, h) {
  const scale = Math.min(w / sprite.w, h / sprite.h);
  const dw = sprite.w * scale;
  const dh = sprite.h * scale;
  ctx.drawImage(
    img,
    sprite.x, sprite.y, sprite.w, sprite.h,
    x + (w - dw) / 2, y + (h - dh) / 2, dw, dh
  );
}

function drawCustomers() {
  const now = performance.now();
  branchState.customers.forEach(customer => {
    const sprite = CHARACTER_ASSETS[customer.sprite];
    drawActorSprite(sprite, customer.x, customer.y, customer.state === "ready" ? "#f1c40f" : "#4aa3df");
    if (customer.state !== "leaving" && !customer.event?.isNarrative) drawPatienceBar(customer, now);
    if (customer.state !== "leaving" && customer.event?.isNarrative) {
      ctx.fillStyle = "#e0b75f";
      ctx.beginPath();
      ctx.arc(customer.x, customer.y - 42, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b1b12";
      ctx.font = "900 10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("!", customer.x, customer.y - 38.5);
    }
    if (customer.state === "ready") {
      ctx.fillStyle = "#f1c40f";
      ctx.beginPath();
      ctx.arc(customer.x, customer.y - 42, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawPatienceBar(customer, now) {
  const ratio = BankOperations.patienceRatio(customer, now, bank);
  const width = 34;
  const x = customer.x - width / 2;
  const y = customer.y - 65;
  ctx.fillStyle = "rgba(28, 14, 8, 0.72)";
  ctx.fillRect(x - 1, y - 1, width + 2, 6);
  ctx.fillStyle = ratio > 0.55 ? "#78bb70" : ratio > 0.25 ? "#e0b75f" : "#d6654e";
  ctx.fillRect(x, y, width * ratio, 4);
}

function drawPlayer() {
  if (branchState.tellerLocked) {
    ctx.fillStyle = "rgba(46,204,113,0.22)";
    ctx.beginPath();
    ctx.arc(branchState.player.x, branchState.player.y + 8, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  drawActorSprite(CHARACTER_ASSETS.player, branchState.player.x, branchState.player.y, "#2ecc71");
}

function drawActorSprite(sprite, x, y, ring) {
  const img = branchImages[sprite?.src];
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (img && img.complete && sprite) {
    ctx.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, x - 29, y - 56, 58, 76);
  }
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
    sprite: UPGRADE_SPRITES[upgradeId],
    label: upg.label,
    service: upgradeId === "teller_window",
  });
  staticSceneDirty = true;
  addLog(`${upg.label} placed. -${fmt(upg.cost)}`, "good");
  renderStats();
  renderShop();
  saveGame();
  return true;
}

function removeBranchObject(obj) {
  branchState.objects = branchState.objects.filter(o => o.id !== obj.id);
  staticSceneDirty = true;
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
  if (on && !BankOperations.featureAvailability(bank).building) {
    addLog("Build mode unlocks after you serve three customers.", "neutral");
    BankAudio.play("warning");
    return false;
  }
  branchState.mode = on ? "build" : "play";
  document.getElementById("buildModeBtn")?.classList.toggle("active", on);
  if (on) {
    setLedgerVisible(false);
    branchState.tellerLocked = false;
    ensureControllerBuildCursor();
  }
  if (!on) {
    sellMode = false;
    document.getElementById("sellBtn").classList.remove("active");
  }
  updateBuildPanel();
  updateModeBanner();
  BankAudio.play(on ? "uiOpen" : "uiClose");
  return true;
}

function toggleLedger() {
  const panel = document.getElementById("ledgerPanel");
  setLedgerVisible(!panel.classList.contains("show"));
}

function setLedgerVisible(show) {
  const panel = document.getElementById("ledgerPanel");
  const button = document.getElementById("ledgerToggleBtn");
  if (!panel || !button) return;
  if (show && branchState?.mode === "build") setBuildMode(false);
  panel.classList.toggle("show", show);
  button.classList.toggle("active", show);
  button.textContent = show ? "Hide Ledger" : "Ledger";
  if (typeof renderGuidance === "function") renderGuidance();
}

function updateBuildPanel() {
  const panel = document.getElementById("buildPanel");
  if (!panel) return;
  panel.classList.toggle("show", branchState?.mode === "build");
  if (typeof renderGuidance === "function") renderGuidance();
}

function rotateBuildItem() {
  branchState.buildRotation = (branchState.buildRotation + 90) % 360;
  document.getElementById("rotateBtn").classList.add("active");
  setTimeout(() => document.getElementById("rotateBtn")?.classList.remove("active"), 140);
}

function toggleSellMode() {
  sellMode = !sellMode;
  document.getElementById("sellBtn")?.classList.toggle("active", sellMode);
  updateModeBanner();
}

function ensureControllerBuildCursor() {
  if (pointerTile) return pointerTile;
  pointerTile = {
    x: Math.max(1, Math.min(BRANCH_COLS - 2, Math.floor(branchState.player.x / TILE))),
    y: Math.max(1, Math.min(BRANCH_ROWS - 2, Math.floor(branchState.player.y / TILE) + 1)),
  };
  return pointerTile;
}

function moveControllerBuildCursor(direction) {
  const tile = ensureControllerBuildCursor();
  if (direction === "up") tile.y--;
  if (direction === "down") tile.y++;
  if (direction === "left") tile.x--;
  if (direction === "right") tile.x++;
  tile.x = Math.max(0, Math.min(BRANCH_COLS - 1, tile.x));
  tile.y = Math.max(0, Math.min(BRANCH_ROWS - 1, tile.y));
}

function activateControllerBuildCursor() {
  handleCanvasClick(ensureControllerBuildCursor());
}

function closeTopMode() {
  if (document.getElementById("legacyOverlay")?.classList.contains("show")) { closeLegacyConclusion(); return; }
  if (document.getElementById("guideOverlay")?.classList.contains("show")) { closeGuide(); return; }
  if (document.getElementById("strategyOverlay")?.classList.contains("show")) { closeStrategy(); return; }
  if (document.getElementById("operationsOverlay")?.classList.contains("show")) { closeOperations(); return; }
  if (document.getElementById("menuOverlay")?.classList.contains("show")) { closeMenu(); return; }
  if (document.getElementById("eventInfoOverlay")?.classList.contains("show")) { closeEventInfo(); return; }
  if (decisionOpen) return;
  if (document.getElementById("ledgerPanel")?.classList.contains("show")) { setLedgerVisible(false); return; }
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
    el.textContent = sellMode ? "Sell mode · choose a furnishing to remove" : "Build mode · choose an item, then place it on an open floor tile";
  } else {
    const objective = BankOperations.currentObjective(bank, netWorth());
    if (objective.complete && typeof BankCampaign !== "undefined") {
      const campaign = BankCampaign.campaignStatus(bank, netWorth());
      el.textContent = campaign.complete
        ? "Campaign complete - Frontier banking legacy secured"
        : `Campaign ${campaign.step} of ${campaign.total} - ${campaign.current.title}`;
      return;
    }
    el.textContent = objective.complete
      ? `Branch milestone complete · ${objective.title}`
      : `Goal ${objective.step} of ${objective.total} · ${objective.title} · ${objective.progress}`;
  }
}

function updateInteractionPrompt() {
  const el = document.getElementById("interactionPrompt");
  if (!el) return;
  const ready = frontReadyCustomer();
  const nearWicket = isNearTellerWicket();
  el.classList.toggle("show", branchState.tellerLocked || (!branchState.tellerLocked && nearWicket));
  const action = typeof BankControls !== "undefined" && BankControls.usesGamepad() ? "Press A" : "Press E";
  if (branchState.tellerLocked && ready) el.textContent = `${action} · Review customer`;
  else if (branchState.tellerLocked) el.textContent = "Wicket open · waiting for a customer";
  else if (nearWicket) el.textContent = `${action} · Open teller wicket`;
}

function renderBranchStatus(force = false) {
  const now = performance.now();
  if (!force && now - lastStatusRenderAt < 250) return;
  lastStatusRenderAt = now;
  const health = BankOperations.queueHealth(branchState?.customers || [], now, bank);
  const count = document.getElementById("queueCount");
  const wait = document.getElementById("queueWait");
  const capacity = document.getElementById("serviceCapacity");
  const fill = document.getElementById("queueFill");
  if (!count || !wait || !capacity || !fill) return;

  const customerLabel = health.count === 1 ? "1 customer" : `${health.count} customers`;
  const decisionLabel = health.narratives === 1 ? "1 decision" : `${health.narratives} decisions`;
  count.textContent = health.narratives
    ? `${customerLabel} · ${decisionLabel}`
    : health.count === 1 ? "1 waiting" : `${health.count} waiting`;
  wait.textContent = health.count ? `Longest ${Math.ceil(health.longestWait)}s` : "No wait";
  const staffing = BankOperations.staffingSummary(bank);
  const serviceModifier = BankWorld.modifiers(bank).serviceInterval;
  const serviceParts = [];
  if (staffing.counter) serviceParts.push(`Counter ${(staffing.counterIntervalMs * serviceModifier / 1000).toFixed(1)}s`);
  if (staffing.loans) serviceParts.push(`Loans ${(staffing.loanIntervalMs * serviceModifier / 1000).toFixed(1)}s`);
  capacity.textContent = serviceParts.length
    ? serviceParts.join(" · ")
    : bank.staff?.length ? "Staff need a matching workstation"
      : branchState?.tellerLocked ? "Your wicket is open" : "Wicket closed";
  fill.style.width = `${Math.max(0, Math.min(100, health.lowestPatience * 100))}%`;
  fill.style.background = health.lowestPatience > 0.55
    ? "var(--green)"
    : health.lowestPatience > 0.25 ? "var(--yellow)" : "var(--red)";
  updateModeBanner();
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
  setDecisionLayerVisible(true);
  BankAudio.play("customerReady");
}

function closeDecisionOverlay() {
  decisionOpen = false;
  branchState.activeDecisionCustomerId = null;
  setDecisionLayerVisible(false);
}

function resolveCustomer(customerId, choice) {
  const customer = branchState.customers.find(c => c.id === customerId);
  if (!customer) return;
  const ev = customer.event;
  const res = choice === "approve" ? ev.onApprove() : ev.onDeny();
  BankAudio.playOutcome(res.kind);
  recordCustomerService(customer, false);
  ev.resolved = true;
  addLog(res.msg, res.kind);
  customer.state = "leaving";
  closeDecisionOverlay();
  advanceResolvedQueue();
  renderStats();
  saveGame();
  if (checkLose()) { stopTimers(); return; }
}

function autoResolveCustomer(customer, silent = false, staffMember = null, forcedChoice = null) {
  if (!customer || customer.state === "leaving") return true;
  const ev = customer.event;
  const approve = forcedChoice ? forcedChoice === "approve" : (ev.single || ev.eventType !== "Credit Application");
  const res = approve ? ev.onApprove() : ev.onDeny();
  recordCustomerService(customer, staffMember);
  ev.resolved = true;
  if (!silent) addLog(`${staffMember ? staffMember.name : "Auto"}: ${res.msg}`, res.kind);
  customer.state = "leaving";
  advanceResolvedQueue();
  renderStats();
  if (checkLose()) { stopTimers(); return false; }
  return true;
}

function recordCustomerService(customer, staffMember) {
  if (customer.event?.isNarrative) {
    bank.stats.worldEventsResolved++;
    bank.dayMetrics.worldEventsResolved++;
    return;
  }
  bank.stats.customersServed++;
  bank.dayMetrics.customersServed++;
  if (customer.event?.segmentId) {
    BankMarket.recordSegmentOutcome(
      bank,
      customer.event.segmentId,
      "served",
      customer.event.customerValue || customer.event.amount || 0
    );
  }
  bank.dayMetrics.totalWaitSeconds += BankOperations.waitSeconds(customer, performance.now());
  if (staffMember) {
    bank.stats.staffServed++;
    bank.dayMetrics.staffServed++;
    staffMember.served = (staffMember.served || 0) + 1;
  }
  const promotions = BankMarket.updatePrestige(bank, netWorth());
  promotions.forEach(tier => addLog(`Prestige advanced to ${tier.title}. Unlocked: ${tier.unlock}.`, "good"));
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
  branchState.nextStaffServiceAt = performance.now() + 3200;
  branchState.activeDecisionCustomerId = null;
  branchState.openForCustomers = true;
  decisionOpen = false;
  setDecisionLayerVisible(false);
  updateModeBanner();
  renderBranchStatus(true);
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
    ...data.objects.map(obj => ({
      ...obj,
      sprite: obj.sprite || UPGRADE_SPRITES[obj.upgradeId],
      service: obj.service || obj.upgradeId === "teller_window",
    })),
  ];
  if (data.player && data.cols === BRANCH_COLS && data.rows === BRANCH_ROWS) {
    branchState.player = data.player;
  }
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
      sprite: UPGRADE_SPRITES[upg.id],
      label: upg.label,
      service: upg.id === "teller_window",
    });
  });
}
