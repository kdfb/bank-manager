// Game loop: event queue, day lifecycle, win/lose, restart, boot.

let queue = [];
let qIdx  = 0;
let debugWorldEventInjected = false;
let debugSegmentInjected = false;
const reportedAchievements = new Set();

function platformProgressContext() {
  const campaign = BankCampaign.campaignStatus(bank, netWorth());
  const townComplete = typeof BankTown !== "undefined" && BankTown.isComplete(bank);
  const location = BankMarket.locationProfile(bank);
  const prestige = BankMarket.PRESTIGE_TIERS[bank.prestigeLevel || 0];
  return {
    campaignComplete: townComplete || campaign.complete,
    campaignTitle: townComplete ? BankTown.identity(bank).title : campaign.complete ? "Legacy secured" : campaign.current.title,
    locationLabel: location.label,
    prestigeTitle: prestige.title,
  };
}

function refreshPlatformProgress(announce = true) {
  if (typeof BankAchievements === "undefined" || !bank?.stats) return [];
  const context = platformProgressContext();
  const newlyUnlocked = BankAchievements.sync(bank, context);
  for (const definition of BankAchievements.unlocked(bank)) {
    if (reportedAchievements.has(definition.id)) continue;
    BankPlatform.unlockAchievement(definition.id);
    reportedAchievements.add(definition.id);
  }
  BankPlatform.setRichPresence(BankAchievements.presence(bank, context));
  if (announce && typeof showAchievementToast === "function") {
    newlyUnlocked.forEach(showAchievementToast);
  }
  return newlyUnlocked;
}

// ── Build a day's event queue ──────────────────────────────────
function buildDay() {
  queue = [];
  qIdx  = 0;
  debugWorldEventInjected = false;
  debugSegmentInjected = false;
}

function makeOpeningDayEvent(index) {
  const caseNumber = Math.max(0, Math.min(4, index));
  const blueprints = [
    { customer: "carmen", service: "account", purpose: "a household account", risk: "low" },
    { customer: "elena", service: "loan", purpose: "winter feed before the first snow", risk: "medium" },
    { customer: "hiro", service: "withdrawal", purpose: "winter provisions", risk: "low" },
    { customer: "liam", service: "loan", purpose: "safer equipment for a promising claim", risk: "high" },
    { customer: "grace", service: "deposit", purpose: "the week's shop takings", risk: "low" },
  ];
  const blueprint = blueprints[caseNumber];
  const profile = BankCommunity.profile(bank, blueprint.customer, blueprint.service, blueprint);
  if (blueprint.service === "loan") return makeLoanEvent(profile);
  if (blueprint.service === "deposit") return makeDepositEvent(profile);
  if (blueprint.service === "withdrawal") return makeWithdrawalEvent(profile);
  return makeAccountEvent(profile);
}

function makeRecurringCustomerEvent(index) {
  const lineups = [
    ["grace", "samir", "carmen", "hiro", "elena"],
    ["hiro", "grace", "carmen", "samir", "liam"],
    ["elena", "liam", "grace", "carmen", "samir"],
  ];
  const services = ["deposit", "loan", "withdrawal", "loan", "account"];
  const purposes = {
    carmen: "a sturdy sewing machine for winter work",
    elena: "seed and repairs before the spring thaw",
    hiro: "insulation before the next cold front",
    liam: "tools and timber for the western shaft",
    grace: "winter stock for families arriving late in the season",
    samir: "a reliable iron oven for the morning bread line",
  };
  const lineup = lineups[(Math.max(2, bank.day) - 2) % lineups.length];
  const slot = Math.max(0, Math.min(4, index));
  const customerId = lineup[slot];
  const service = services[slot];
  const riskCycle = ["low", "medium", "high"];
  const risk = service === "loan" ? riskCycle[(bank.day + slot) % riskCycle.length] : "low";
  const profile = BankCommunity.profile(bank, customerId, service, {
    purpose: purposes[customerId],
    risk,
  });
  if (service === "loan") return makeLoanEvent(profile);
  if (service === "deposit") return makeDepositEvent(profile);
  if (service === "withdrawal") return makeWithdrawalEvent(profile);
  return makeAccountEvent(profile);
}

function makeCustomerEvent() {
  if (bank.day === 1 && queue.length < BankOperations.dailyAppointmentTarget(bank)) {
    return makeOpeningDayEvent(queue.length);
  }
  if (typeof location !== "undefined" && !debugWorldEventInjected) {
    const requestedEvent = new URLSearchParams(location.search).get("debugEvent");
    if (BankWorld.worldEventDefinition(requestedEvent)) {
      debugWorldEventInjected = true;
      return makeWorldEvent(requestedEvent);
    }
  }
  if (typeof location !== "undefined" && !debugSegmentInjected) {
    const query = new URLSearchParams(location.search);
    const requestedSegment = query.get("debugSegment");
    if (BankMarket.SEGMENTS[requestedSegment]) {
      debugSegmentInjected = true;
      const requestedService = query.get("debugService");
      const profile = BankMarket.customerProfileForSegment(requestedSegment, requestedService, Math.random);
      if (profile.service === "loan") return makeLoanEvent(profile);
      if (profile.service === "deposit") return makeDepositEvent(profile);
      if (profile.service === "withdrawal") return makeWithdrawalEvent(profile);
      return makeAccountEvent(profile);
    }
  }
  const queuedCommunityFollowUps = queue.map(event => event.communityFollowUpId).filter(Boolean);
  const queuedTownMoments = queue.map(event => event.townMomentId).filter(Boolean);
  const townMoment = BankTown.nextMoment(bank, queuedTownMoments);
  if (townMoment) return makeTownProjectEvent(townMoment);
  const communityFollowUp = BankCommunity.pendingFollowUps(bank, queuedCommunityFollowUps)[0];
  if (communityFollowUp) return makeCommunityFollowUpEvent(communityFollowUp);
  if (BankWorld.pendingFollowUps(bank).some(pending => pending.dueDay <= bank.day)) return makeWorldEvent();
  const roll = Math.random();
  if (bank.day >= 8 && roll < 0.05) return makeRandomEvent();
  if (bank.day <= 30) return makeRecurringCustomerEvent(queue.length);
  const profile = BankMarket.customerProfile(bank, Math.random);
  if (profile.service === "loan") return makeLoanEvent(profile);
  if (profile.service === "deposit") return makeDepositEvent(profile);
  if (profile.service === "withdrawal") return makeWithdrawalEvent(profile);
  return makeAccountEvent(profile);
}

// ── Player action ──────────────────────────────────────────────
function act(choice) {
  const ev  = queue[qIdx];
  const res = choice === "approve" ? ev.onApprove() : ev.onDeny();
  BankAudio.playOutcome(res.kind);
  addLog(res.msg, res.kind);
  qIdx++;
  renderStats();
  resetEventTimer();
  if (checkLose()) { stopTimers(); return; }
  if (qIdx >= queue.length) { endOfDay(); return; }
  renderEvent();
  saveGame();
}

// ── Phase 1: process EOD math, show summary, pause timers ─────
function endOfDay() {
  stopTimers();
  const profitBefore = bank.dayStartProfit;
  const worldModifiers = BankWorld.modifiers(bank);
  const conditionsToday = BankWorld.activeConditionDetails(bank);
  const portfolioDay = BankPortfolio.processPortfolioDay(bank.loanBook, bank.day, Math.random, {
    missedPaymentMultiplier: worldModifiers.missedPaymentChance,
  });
  const loanMetrics = portfolioDay.metrics;
  bank.loanBook = portfolioDay.loans;
  bank.cash += loanMetrics.received;
  bank.profit += loanMetrics.interestIncome - loanMetrics.defaultedBalance;
  bank.loansOut = Math.max(0, bank.loanBook.reduce((sum, loan) => sum + loan.balance, 0));
  bank.stats.defaults += loanMetrics.defaultCount;
  bank.stats.delinquencies += loanMetrics.newDelinquencies;
  bank.stats.loansRepaid += loanMetrics.completedCount;
  bank.dayMetrics.interestIncome = loanMetrics.interestIncome;
  bank.dayMetrics.loanPaymentsDue = loanMetrics.due;
  bank.dayMetrics.loanPaymentsReceived = loanMetrics.received;
  bank.dayMetrics.loanPaymentsMissed = loanMetrics.missedPayments;
  bank.dayMetrics.newDelinquencies = loanMetrics.newDelinquencies;
  if (loanMetrics.newDelinquencies) {
    addLog(`${loanMetrics.newDelinquencies} borrower${loanMetrics.newDelinquencies === 1 ? " is" : "s are"} newly late on payment.`, "warn");
  }
  if (loanMetrics.defaultCount) {
    addLog(`${loanMetrics.defaultCount} loan${loanMetrics.defaultCount === 1 ? "" : "s"} defaulted, writing off ${fmt(loanMetrics.defaultedBalance)}.`, "warn");
  }

  const loanIncome = loanMetrics.received;
  const defaults = loanMetrics.defaultedBalance;

  const d      = DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
  const location = BankMarket.locationProfile(bank);
  const pricingEffects = BankCampaign.activePricingEffects(bank);
  const depInt = bank.deposits * 0.000055 * worldModifiers.depositInterestCost * pricingEffects.depositInterestCost;
  const quarters = bank.upgrades?.break_room || 0;
  const rent = Math.max(5, (d.dailyOverhead - quarters * 2) * worldModifiers.rentCost * location.rentMultiplier);
  const wages = BankEconomy.dailyStaffCost(bank);
  bank.cash   -= depInt + rent + wages;
  bank.profit -= depInt + rent + wages;
  bank.dayMetrics.depositInterest = depInt;
  bank.dayMetrics.rent = rent;
  bank.dayMetrics.wages = wages;
  bank.dayMetrics.defaults = defaults;

  let debtPayment = 0;
  if (bank.debt > 0 && bank.day % bank.debtPaymentInterval === 0) {
    debtPayment = Math.min(bank.debt, bank.debtPaymentAmount);
    BankCampaign.coverActiveShortfall(bank);
    if (BankCampaign.networkCash(bank) >= debtPayment) {
      BankCampaign.withdrawNetworkCash(bank, debtPayment);
      bank.debt -= debtPayment;
      bank.dayMetrics.debtPayment = debtPayment;
    } else {
      bank.missedDebtPayment = true;
    }
  }

  const activeBranchProfit = bank.profit - profitBefore;
  BankCampaign.recordActiveBranchDay(bank, activeBranchProfit);
  const focusedLocalDay = bank.day <= 7 && (bank.campaign?.branches?.length || 1) === 1;
  const networkDay = focusedLocalDay
    ? { results: [], profit: 0, competition: { actions: [], rivals: bank.campaign.rivals || [], activeLeader: null } }
    : BankCampaign.simulateNetworkDay(bank, { rivalGrowth: worldModifiers.rivalGrowth });
  if (networkDay.results.length) {
    const profitable = networkDay.results.filter(result => result.profit > 0).length;
    addLog(`Regional branches reported ${networkDay.profit >= 0 ? "+" : ""}${fmt(networkDay.profit)} consolidated profit; ${profitable}/${networkDay.results.length} were profitable.`, networkDay.profit >= 0 ? "good" : "warn");
  }
  for (const action of networkDay.competition.actions) {
    const rival = BankCampaign.RIVAL_DEFINITIONS[action.rivalId];
    addLog(`${rival.name}: ${action.title} in ${BankCampaign.REGIONS[action.regionId].label}.`, action.playerLoss ? "warn" : "neutral");
  }

  const shareChange = Math.max(-0.4, Math.min(0.5,
    bank.dayMetrics.customersServed * 0.035
      - bank.dayMetrics.customersLost * 0.08
      + (bank.rep - 60) * 0.004
      + worldModifiers.marketShareDaily
      + pricingEffects.marketShareDaily
  ));
  bank.marketShare = Math.max(1, bank.marketShare + shareChange);
  if ((bank.upgrades?.lobby || 0) > 0) bank.rep = Math.max(25, bank.rep);
  const prestigePromotions = BankMarket.updatePrestige(bank, netWorth());
  const campaignProgress = BankCampaign.updateProgress(bank, netWorth());

  const dayDelta = bank.profit - profitBefore;
  const cashChange = bank.cash - bank.dayStartCash;
  if (dayDelta > bank.stats.bestDay)  bank.stats.bestDay  = dayDelta;
  if (dayDelta < bank.stats.worstDay) bank.stats.worstDay = dayDelta;

  const portfolio = BankPortfolio.portfolioSummary(bank.loanBook, bank.day);
  const expiredConditions = BankWorld.advanceConditions(bank);
  const worldEvents = bank.world.history.filter(entry => entry.day === bank.day);
  bank.lastReport = {
    loanIncome, depInt, rent, wages, defaults, debtPayment, dayDelta, cashChange,
    loanMetrics, portfolio,
    world: { conditionsToday, expiredConditions, events: worldEvents },
    pricing: { depositPricing: bank.depositPricing, feePricing: bank.feePricing, effects: pricingEffects },
    prestigePromotions,
    network: networkDay,
    campaignProgress,
  };
  const networkDeposits = bank.campaign.branches.reduce((sum, branch) => sum + (branch.active ? bank.deposits : branch.deposits), 0);
  const networkLoans = bank.campaign.branches.reduce((sum, branch) => sum + (branch.active ? bank.loansOut : branch.loans), 0);
  BankTelemetry.recordDay(bank, bank.lastReport, {
    difficulty: settings.difficulty,
    activeBranch: BankCampaign.activeBranch(bank),
    networkCash: BankCampaign.networkCash(bank),
    networkDeposits,
    networkLoans,
    netCapital: BankCampaign.consolidatedNetCapital(bank),
    networkShare: BankCampaign.networkShare(bank),
  });
  bank.phase = "report";
  renderStats();
  if (bank.missedDebtPayment) {
    saveGame();
    checkLose();
    return;
  }
  renderEndOfDay(bank.lastReport);
  BankAudio.play("dayEnd");
  maybeShowCampaignConclusion();
  saveGame();
}

// ── Phase 2: player confirms, next day begins ──────────────────
function startNextDay() {
  setDecisionLayerVisible(false);
  decisionOpen = false;
  addLog(`${gameDate(bank.day)} concluded.`, "neutral");
  bank.day++;

  if (checkLose()) { saveGame(); return; }

  const branchVisit = BankCampaign.activateScheduledBranch(bank, serializeBranch());
  if (branchVisit.ok) {
    deserializeBranch(branchVisit.localState);
    BankPortfolio.migrateLoanBook(bank);
    addLog(`Direct control moved to ${branchVisit.branch.name}. Local staff, books, and floor plan loaded.`, "good");
    renderShop();
  }

  BankEconomy.resetDayMetrics(bank);
  bank.dayStartProfit = bank.profit;
  bank.dayStartCash = bank.cash;
  bank.phase = "operating";
  bank.lastReport = null;
  buildDay();
  startBranchDay();
  renderStats();
  saveGame();
  startTimers();
  BankAudio.play("dayStart");
}

// ── Lose check ─────────────────────────────────────────────────
function checkLose() {
  if (bank.missedDebtPayment) {
    showOverlay(
      "lose", "⛔", "Debt Default",
      "The bank could not make its scheduled debt payment. Creditors have closed the institution.",
      `<div class="overlay-stat">Outstanding debt: <strong>${fmt(bank.debt)}</strong></div>
       <div class="overlay-stat">Available cash: <strong>${fmt(bank.cash)}</strong></div>`
    );
    return true;
  }
  if (BankCampaign.networkCash(bank) <= 0 || netWorth() <= -500) {
    showOverlay(
      "lose", "💸", "Bankrupt!",
      "The vault is empty. Creditors have seized the bank.",
      `<div class="overlay-stat">${gameDate(1)} — ${gameDate(bank.day)}</div>
       <div class="overlay-stat">Final assets: <strong>${fmt(totalAssets())}</strong></div>
       <div class="overlay-stat">Loans approved: <strong>${bank.stats.loansApproved}</strong></div>`
    );
    deleteSave();
    return true;
  }
  if (bank.rep <= 15) {
    showOverlay(
      "lose", "🏃", "Bank Run!",
      "Depositors lost confidence and withdrew their funds. The bank has closed its doors.",
      `<div class="overlay-stat">${gameDate(1)} — ${gameDate(bank.day)}</div>
       <div class="overlay-stat">Final standing: <strong>${bank.rep}/100</strong></div>
       <div class="overlay-stat">Loans approved: <strong>${bank.stats.loansApproved}</strong></div>`
    );
    deleteSave();
    return true;
  }
  return false;
}

// ── Menu ───────────────────────────────────────────────────────
function openMenu() {
  pauseTimers();
  renderMenuSlots();
  renderSavePortability();
  renderSettingsPanel();
  renderAchievementsPanel();
  renderTelemetryPanel();
  showAppDialog("menuOverlay", ".menu-close-btn");
  BankAudio.play("uiOpen");
}

function closeMenu() {
  hideAppDialog("menuOverlay", "#menuBtn");
  resetRestartConfirmation();
  BankAudio.play("uiClose");
}

function resetRestartConfirmation() {
  document.getElementById("restartArea").innerHTML =
    `<button class="btn btn-dark menu-full-btn" onclick="confirmRestart()">🔄 Restart New Game</button>`;
}

function menuSaveToSlot(slot) {
  saveToSlot(slot);
  renderMenuSlots();
}

function menuLoadFromSlot(slot) {
  if (!loadFromSlot(slot)) return;
  hideAppDialog("menuOverlay");
  decisionOpen = false;
  document.getElementById("logList").innerHTML = "";
  stopTimers();
  buildDay();
  startBranchDay();
  renderStats();
  renderShop();
  if (bank.phase === "report" && bank.lastReport) {
    renderEndOfDay(bank.lastReport);
    maybeShowCampaignConclusion();
  }
  else startTimers();
}

function menuDeleteSlot(slot) {
  deleteSlot(slot);
  renderMenuSlots();
}

function confirmRestart() {
  document.getElementById("restartArea").innerHTML = `
    <div class="restart-confirm">
      <p>Start a brand new game? Current progress will be lost.</p>
      <div class="restart-confirm-btns">
        <button class="btn btn-dark"  onclick="closeMenu()">Cancel</button>
        <button class="btn btn-green" onclick="doRestart()">Yes, Restart</button>
      </div>
    </div>`;
}

function doRestart() {
  hideAppDialog("menuOverlay");
  decisionOpen = false;
  restartGame();
}

// ── Restart ────────────────────────────────────────────────────
function restartGame() {
  stopTimers();
  decisionOpen = false;
  deleteSave();
  hideAppDialog("overlay");
  document.getElementById("logList").innerHTML = "";
  initBank();
  branchState = defaultBranchState();
  loadBranchImages();
  buildDay();
  startBranchDay();
  renderStats();
  renderShop();
  startTimers();
}

// ── Boot ───────────────────────────────────────────────────────
(function boot() {
  loadSettings();
  if (typeof BankControls !== "undefined") BankControls.init();
  const resumed = loadGame();
  if (!resumed) initBank();
  settings = normalizeSettings(settings);
  applySettings();
  buildDay();
  initBranch();
  startBranchDay();
  refreshPlatformProgress(false);
  renderStats();
  renderShop();
  if (bank.phase === "report" && bank.lastReport) {
    renderEndOfDay(bank.lastReport);
    maybeShowCampaignConclusion();
  }
  else startTimers();

  // Wire the menu button with touchend so it works reliably on iOS Safari,
  // where click events on buttons inside sticky headers can silently fail.
  const menuBtn = document.getElementById("menuBtn");
  menuBtn.addEventListener("touchend", function (e) {
    e.preventDefault();
    openMenu();
  }, { passive: false });
  menuBtn.addEventListener("click", openMenu);
  document.getElementById("operationsBtn")?.addEventListener("click", openOperations);
  document.getElementById("strategyBtn")?.addEventListener("click", openStrategy);
  document.getElementById("helpBtn")?.addEventListener("click", openGuide);
  BankPlatform.registerServiceWorker();
})();
