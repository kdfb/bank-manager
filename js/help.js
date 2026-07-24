// Contextual guidance, guide overlay, and accessibility settings UI.

let dialogReturnFocus = null;

function visibleModal() {
  return [...document.querySelectorAll('.overlay[role="dialog"].show')].pop() || null;
}

function showAppDialog(id, focusSelector) {
  const dialog = document.getElementById(id);
  if (!dialog) return false;
  const active = document.activeElement;
  if (active && active !== document.body) dialogReturnFocus = active;
  document.querySelectorAll('.overlay[role="dialog"].show').forEach(open => {
    if (open !== dialog) {
      open.classList.remove("show");
      if (open.id === "menuOverlay" && typeof resetRestartConfirmation === "function") resetRestartConfirmation();
    }
  });
  dialog.classList.add("show");
  document.body.classList.add("modal-open");
  const shell = document.querySelector(".game-shell");
  if (shell) shell.inert = true;
  decisionOpen = true;
  const focusTarget = focusSelector ? dialog.querySelector(focusSelector) : null;
  (focusTarget || dialog.querySelector('button:not(:disabled), input:not(:disabled), select:not(:disabled)'))?.focus();
  return true;
}

function hideAppDialog(id, fallbackSelector) {
  document.getElementById(id)?.classList.remove("show");
  const modal = visibleModal();
  document.body.classList.toggle("modal-open", Boolean(modal));
  const shell = document.querySelector(".game-shell");
  if (shell) shell.inert = Boolean(modal);
  const reportOpen = document.getElementById("decisionLayer")?.classList.contains("show");
  decisionOpen = Boolean(reportOpen || modal);
  if (!decisionOpen) resumeTimers();
  const fallback = fallbackSelector ? document.querySelector(fallbackSelector) : null;
  const returnTarget = dialogReturnFocus?.isConnected && dialogReturnFocus.getClientRects().length
    ? dialogReturnFocus
    : fallback;
  returnTarget?.focus();
  if (!modal) dialogReturnFocus = null;
}

function renderGuidance() {
  const card = document.getElementById("guidanceCard");
  if (!card || !bank?.stats) return;
  const interfaceBusy = decisionOpen
    || branchState?.mode === "build"
    || document.getElementById("ledgerPanel")?.classList.contains("show")
    || Boolean(visibleModal());
  if (interfaceBusy) {
    card.classList.remove("show");
    return;
  }
  if (!settings.tutorialsEnabled) {
    card.classList.remove("show");
    return;
  }
  const tip = BankGuidance.next(bank);
  if (!tip) {
    card.classList.remove("show");
    return;
  }
  if (card.dataset.tipId === tip.id && card.classList.contains("show")) return;
  card.dataset.tipId = tip.id;
  card.innerHTML = `
    <div class="guidance-head"><span>${tip.stage}</span><button onclick="dismissGuidance('${tip.id}')" aria-label="Dismiss guidance">&times;</button></div>
    <strong>${tip.title}</strong>
    <p>${tip.body}</p>
    <div class="guidance-actions">
      <button class="btn btn-blue btn-small" onclick="useGuidanceAction('${tip.id}', '${tip.action}')">${tip.actionLabel}</button>
      <button class="guidance-skip" onclick="dismissGuidance('${tip.id}')">Got it</button>
    </div>`;
  card.classList.add("show");
}

function dismissGuidance(id) {
  BankGuidance.markSeen(bank, id);
  const card = document.getElementById("guidanceCard");
  card?.classList.remove("show");
  saveGame();
}

function useGuidanceAction(id, action) {
  dismissGuidance(id);
  if (action === "manage") openOperations();
  else if (action === "regions") openStrategy();
  else if (action === "build") setBuildMode(true);
  else if (action === "ledger") setLedgerVisible(true);
  else if (action === "teller") openGuide();
}

function openGuide() {
  pauseTimers();
  renderGuide();
  showAppDialog("guideOverlay", "#guideCloseBtn");
  BankAudio.play("uiOpen");
}

function closeGuide() {
  hideAppDialog("guideOverlay", "#helpBtn");
  BankAudio.play("uiClose");
}

document.addEventListener("keydown", event => {
  if (event.key !== "Tab") return;
  const modal = visibleModal();
  if (!modal) return;
  const focusable = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')]
    .filter(element => element.getClientRects().length > 0);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

function renderGuide() {
  const body = document.getElementById("guideBody");
  if (!body) return;
  const seen = new Set(BankGuidance.migrate(bank).seen);
  const available = new Set(BankGuidance.available(bank).map(tip => tip.id));
  const progress = BankGuidance.progress(bank);
  body.innerHTML = `
    <div class="guide-progress"><div><span>Guidance reviewed</span><strong>${progress.seen} / ${progress.total}</strong></div><div class="guide-progress-track"><i style="width:${progress.seen / progress.total * 100}%"></i></div></div>
    <section class="guide-section">
      <div class="guide-section-head"><span>Campaign handbook</span><h2>From teller to executive</h2></div>
      <div class="guide-topic-grid">${BankGuidance.TIPS.map(tip => `
        <article class="guide-topic ${seen.has(tip.id) ? "complete" : available.has(tip.id) ? "available" : "locked"}">
          <span>${tip.stage}</span><h3>${tip.title}</h3><p>${tip.body}</p>
          <strong>${seen.has(tip.id) ? "Reviewed" : available.has(tip.id) ? "Relevant now" : "Unlocks later"}</strong>
        </article>`).join("")}</div>
    </section>
    <section class="guide-section guide-reference">
      <div><span>Cash</span><p>Money immediately available in the currently visited branch.</p></div>
      <div><span>Deposits</span><p>Customer funding held as cash but owed back as a liability.</p></div>
      <div><span>Deposit pricing</span><p>Protect margin to pay less for funding, or offer attractive terms to win more deposits at a higher daily interest cost.</p></div>
      <div><span>Fee strategy</span><p>Accessible fees support demand and market share; premium fees earn more per transaction but discourage customers.</p></div>
      <div><span>Loans</span><p>Outstanding principal that produces scheduled repayment and default risk.</p></div>
      <div><span>Net capital</span><p>Consolidated cash and loan assets minus deposits and external debt.</p></div>
      <div><span>Network cash</span><p>Liquid cash across every owned branch, available for institution-wide obligations.</p></div>
      <div><span>Standing</span><p>Public trust; low standing increases run risk while prestige requires strong standing.</p></div>
    </section>
    <section class="guide-section">
      <div class="guide-section-head"><span>Controller reference</span><h2>Run the bank from a gamepad</h2></div>
      <div class="guide-reference controller-reference">
        <div><span>Left stick / D-pad</span><p>Move in the branch, navigate menus, or position the build cursor.</p></div>
        <div><span>A</span><p>Interact, select, confirm, or place the selected furnishing.</p></div>
        <div><span>B</span><p>Close the top menu, ledger, teller wicket, or build mode.</p></div>
        <div><span>X / Y</span><p>Toggle build mode or the transaction ledger.</p></div>
        <div><span>LB / RB</span><p>Open Operations or the regional strategy desk.</p></div>
        <div><span>View / Menu</span><p>Open the handbook or save and settings menu.</p></div>
        <div><span>LT / RT</span><p>Toggle sell mode or rotate a furnishing while building.</p></div>
      </div>
    </section>`;
}

function renderSettingsPanel() {
  const panel = document.getElementById("settingsPanel");
  if (!panel) return;
  panel.innerHTML = `
    <label class="setting-row"><span><strong>Sound effects</strong><small>Play concise feedback for decisions, days, and menus.</small></span><input type="checkbox" ${settings.soundEnabled ? "checked" : ""} onchange="updateSetting('soundEnabled', this.checked)"></label>
    <label class="setting-row"><span><strong>Sound volume</strong><small>Adjust effects without changing system volume.</small></span><select ${settings.soundEnabled ? "" : "disabled"} onchange="updateSetting('soundVolume', Number(this.value))">
      ${[[0.25, "Quiet"], [0.6, "Balanced"], [1, "Full"]].map(([value, label]) => `<option value="${value}" ${Math.abs(settings.soundVolume - value) < 0.01 ? "selected" : ""}>${label}</option>`).join("")}
    </select></label>
    <label class="setting-row"><span><strong>Contextual guidance</strong><small>Show progression tips during play.</small></span><input type="checkbox" ${settings.tutorialsEnabled ? "checked" : ""} onchange="updateSetting('tutorialsEnabled', this.checked)"></label>
    <label class="setting-row"><span><strong>High contrast</strong><small>Increase text, border, and focus contrast.</small></span><input type="checkbox" ${settings.highContrast ? "checked" : ""} onchange="updateSetting('highContrast', this.checked)"></label>
    <label class="setting-row"><span><strong>Reduced motion</strong><small>Remove decorative transitions and animation.</small></span><input type="checkbox" ${settings.reducedMotion ? "checked" : ""} onchange="updateSetting('reducedMotion', this.checked)"></label>
    <label class="setting-row"><span><strong>Controller vibration</strong><small>Use light feedback for controller actions when supported.</small></span><input type="checkbox" ${settings.controllerVibration ? "checked" : ""} onchange="updateSetting('controllerVibration', this.checked)"></label>
    <label class="setting-row"><span><strong>Interface text</strong><small>Scale important game and management text.</small></span><select onchange="updateSetting('textScale', this.value)">
      <option value="normal" ${settings.textScale === "normal" ? "selected" : ""}>Normal</option>
      <option value="large" ${settings.textScale === "large" ? "selected" : ""}>Large</option>
      <option value="xlarge" ${settings.textScale === "xlarge" ? "selected" : ""}>Extra large</option>
    </select></label>
    <div class="setting-row setting-action-row"><span><strong>Screen mode</strong><small>Use the full display; press Escape or controller B to leave overlays.</small></span><button class="settings-reset" id="fullscreenToggle" onclick="toggleFullscreenMode()">${document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen"}</button></div>
    <button class="settings-reset" onclick="resetGuidanceProgress()">Replay all guidance</button>`;
}

async function toggleFullscreenMode() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen({ navigationUI: "hide" });
  } catch (_) {
    const button = document.getElementById("fullscreenToggle");
    if (button) button.textContent = "Fullscreen unavailable";
    return;
  }
  renderSettingsPanel();
  document.getElementById("fullscreenToggle")?.focus();
}

document.addEventListener("fullscreenchange", () => {
  if (document.getElementById("menuOverlay")?.classList.contains("show")) renderSettingsPanel();
});

function updateSetting(key, value) {
  setSetting(key, value);
  if (typeof BankAudio !== "undefined") {
    BankAudio.refresh();
    if (key === "soundEnabled" && value) BankAudio.play("positive");
    if (key === "soundVolume") BankAudio.play("neutral");
  }
  renderSettingsPanel();
  renderGuidance();
}

function resetGuidanceProgress() {
  BankGuidance.reset(bank);
  saveGame();
  renderSettingsPanel();
  renderGuidance();
}

const achievementToastQueue = [];
let achievementToastTimer = null;

function showAchievementToast(definition) {
  if (!definition) return;
  achievementToastQueue.push(definition);
  if (achievementToastTimer) return;
  presentNextAchievementToast();
}

function presentNextAchievementToast() {
  const toast = document.getElementById("achievementToast");
  const definition = achievementToastQueue.shift();
  if (!toast || !definition) {
    achievementToastTimer = null;
    return;
  }
  document.getElementById("achievementToastTitle").textContent = definition.title;
  document.getElementById("achievementToastBody").textContent = definition.description;
  toast.classList.add("show");
  BankAudio.play("positive");
  achievementToastTimer = setTimeout(() => {
    toast.classList.remove("show");
    achievementToastTimer = setTimeout(presentNextAchievementToast, settings.reducedMotion ? 0 : 220);
  }, 4200);
}

function renderAchievementsPanel() {
  const panel = document.getElementById("achievementsPanel");
  if (!panel) return;
  const summary = BankAchievements.summary(bank);
  const capabilities = BankPlatform.capabilities();
  panel.innerHTML = `
    <div class="achievement-summary">
      <div><strong>${summary.unlocked} / ${summary.total}</strong><span>${summary.complete ? "All achievements unlocked" : "Campaign-wide progress"}</span></div>
      <div class="achievement-progress-track"><i style="width:${summary.unlocked / summary.total * 100}%"></i></div>
      <small>${capabilities.achievements ? "Connected platform achievement sync is active." : "Progress is stored locally in every save; native platform sync is not connected."}</small>
    </div>
    <div class="achievement-grid">${summary.definitions.map(definition => `
      <article class="achievement-card ${definition.unlocked ? "unlocked" : "locked"}">
        <span>${definition.unlocked ? `Unlocked day ${definition.day}` : "Locked"}</span>
        <strong>${definition.title}</strong>
        <p>${definition.description}</p>
      </article>`).join("")}</div>`;
}

let pendingSaveArchive = null;

function renderSavePortability(message = "") {
  const panel = document.getElementById("savePortabilityPanel");
  if (!panel) return;
  panel.innerHTML = `
    <div class="save-portability-copy">
      <strong>${BankPlatform.isDesktop ? "Durable desktop saves" : "Portable browser saves"}</strong>
      <span>${BankPlatform.isDesktop ? "Saves are mirrored to the app data folder for future cloud synchronization." : "Export a backup before clearing browser data or moving devices."}</span>
    </div>
    <div class="save-portability-actions">
      <button class="btn btn-blue btn-small" onclick="exportSaveArchive()">Export all saves</button>
      <button class="btn btn-dark btn-small" onclick="beginImportSaveArchive()">Import archive</button>
    </div>
    <div class="save-portability-status" id="savePortabilityStatus" role="status" aria-live="polite">${message}</div>`;
}

async function exportSaveArchive() {
  const status = document.getElementById("savePortabilityStatus");
  try {
    saveGame();
    saveSettings();
    const archive = BankPlatform.createArchive(undefined, new Date().toISOString());
    const serialized = JSON.stringify(archive, null, 2);
    const result = await BankPlatform.exportArchive(serialized, `bank-manager-saves-day-${bank.day}.json`);
    if (status) status.textContent = result.ok
      ? result.filePath ? `Archive saved to ${result.filePath}` : "Save archive downloaded."
      : result.canceled ? "Export cancelled." : result.reason || "Export failed.";
    if (result.ok) BankAudio.play("positive");
  } catch (error) {
    if (status) status.textContent = error.message || "Export failed.";
    BankAudio.play("warning");
  }
}

async function beginImportSaveArchive() {
  if (!BankPlatform.isDesktop) {
    document.getElementById("saveArchiveInput")?.click();
    return;
  }
  const result = await BankPlatform.pickArchive();
  if (result.ok) stageSaveArchive(result.text);
  else if (!result.canceled) renderSavePortability(result.reason || "Import failed.");
}

async function handleSaveArchiveFile(input) {
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (file.size > BankPlatform.MAX_ARCHIVE_BYTES) {
    renderSavePortability("Archive is larger than 8 MB.");
    return;
  }
  try { stageSaveArchive(await file.text()); }
  catch (error) { renderSavePortability(error.message || "Could not read archive."); }
}

function stageSaveArchive(text) {
  try {
    const summary = BankPlatform.summarizeArchive(text);
    pendingSaveArchive = text;
    renderSavePortability();
    const status = document.getElementById("savePortabilityStatus");
    if (status) status.innerHTML = `
      <strong>Ready to import day ${summary.day}</strong>
      <span>${summary.saveCount} save${summary.saveCount === 1 ? "" : "s"} · ${summary.slotCount} manual slot${summary.slotCount === 1 ? "" : "s"}. Existing saves will be replaced.</span>
      <div><button class="btn btn-green btn-small" onclick="confirmSaveArchiveImport()">Confirm import</button><button class="btn btn-dark btn-small" onclick="cancelSaveArchiveImport()">Cancel</button></div>`;
  } catch (error) {
    pendingSaveArchive = null;
    renderSavePortability(error.message || "Unsupported archive.");
    BankAudio.play("warning");
  }
}

function cancelSaveArchiveImport() {
  pendingSaveArchive = null;
  renderSavePortability("Import cancelled. Existing saves were not changed.");
}

function confirmSaveArchiveImport() {
  if (!pendingSaveArchive) return;
  try {
    BankPlatform.applyArchive(pendingSaveArchive);
    pendingSaveArchive = null;
    location.reload();
  } catch (error) {
    pendingSaveArchive = null;
    renderSavePortability(error.message || "Import failed; existing saves were restored.");
    BankAudio.play("warning");
  }
}

function renderTelemetryPanel() {
  const panel = document.getElementById("telemetryPanel");
  if (!panel) return;
  const summary = BankTelemetry.summarize(bank);
  const percent = value => `${Math.round(value * 100)}%`;
  if (!summary.days) {
    panel.innerHTML = `
      <div class="telemetry-empty"><strong>No completed days recorded yet</strong><p>Finish a business day to begin a local balance history. Nothing is transmitted.</p></div>`;
    return;
  }
  panel.innerHTML = `
    <div class="telemetry-privacy">Stored only in this save · no identity or device data</div>
    <div class="telemetry-grid">
      <div><span>Recorded days</span><strong>${summary.days}</strong></div>
      <div><span>Average profit</span><strong class="${summary.averageProfit >= 0 ? "green" : "red"}">${summary.averageProfit >= 0 ? "+" : ""}${fmt(summary.averageProfit)}</strong></div>
      <div><span>Profitable days</span><strong>${percent(summary.profitableRate)}</strong></div>
      <div><span>Customers served</span><strong>${percent(summary.serviceRate)}</strong></div>
      <div><span>Work delegated</span><strong>${percent(summary.delegationRate)}</strong></div>
      <div><span>Average wait</span><strong>${Math.round(summary.averageWait)}s</strong></div>
      <div><span>Liquidity stress</span><strong class="${summary.stressDays ? "red" : "green"}">${summary.stressDays} day${summary.stressDays === 1 ? "" : "s"}</strong></div>
      <div><span>Regions visited</span><strong>${summary.regionsVisited}</strong></div>
    </div>
    <div class="telemetry-signals">
      ${summary.signals.map(signal => `<div class="telemetry-signal ${signal.level}"><strong>${signal.title}</strong><span>${signal.body}</span></div>`).join("")}
    </div>
    <button class="btn btn-blue menu-full-btn" onclick="downloadBalanceReport()">Download balance report</button>`;
}

function downloadBalanceReport() {
  const snapshot = BankTelemetry.exportSnapshot(bank, new Date().toISOString());
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `bank-manager-balance-day-${bank.day}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 0);
  BankAudio.play("positive");
}
