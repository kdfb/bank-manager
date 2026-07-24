// Regional strategy overlay and branch-network actions.

function openStrategy() {
  if (!BankOperations.featureAvailability(bank).regional) {
    addLog("Regional strategy unlocks at Trusted Institution prestige.", "neutral");
    BankAudio.play("warning");
    return false;
  }
  pauseTimers();
  BankCampaign.migrateCampaign(bank);
  renderStrategy();
  showAppDialog("strategyOverlay", ".menu-close-btn");
  BankAudio.play("uiOpen");
  return true;
}

function closeStrategy() {
  hideAppDialog("strategyOverlay", "#strategyBtn");
  BankAudio.play("uiClose");
}

function campaignRequirementLabel(key, value, metrics) {
  const labels = {
    served: "Customers served", rep: "Standing", prestige: "Prestige level", netCapital: "Net capital",
    branches: "Operating branches", networkShare: "Network market share", profitableBranches: "Profitable branches",
  };
  const current = metrics[key] || 0;
  const percentage = key === "networkShare";
  const money = key === "netCapital";
  const shownCurrent = money ? fmt(current) : percentage ? `${current.toFixed(1)}%` : Math.floor(current).toLocaleString();
  const shownTarget = money ? fmt(value) : percentage ? `${value}%` : value.toLocaleString();
  return `<div class="strategy-requirement ${current >= value ? "met" : ""}"><span>${labels[key]}</span><strong>${shownCurrent} / ${shownTarget}</strong></div>`;
}

function regionFactor(label, value) {
  return `<span><small>${label}</small><strong>${value}</strong></span>`;
}

function renderBranchControls(branch) {
  const region = BankCampaign.REGIONS[branch.regionId];
  const result = branch.lastResult;
  const reserve = branch.active ? 0 : Math.ceil(branch.deposits * BankCampaign.POLICIES[branch.policy].reserveRatio);
  const balance = branch.active ? bank.cash : branch.cash;
  const deposits = branch.active ? bank.deposits : branch.deposits;
  const loans = branch.active ? bank.loansOut : branch.loans;
  const scheduled = bank.campaign.nextActiveBranchId === branch.id;
  return `
    <article class="network-branch ${branch.active ? "headquarters" : ""}">
      <div class="network-branch-head">
        <div><span>${region.territory}</span><h4>${branch.name}</h4></div>
        <strong>${branch.active ? "Direct control" : scheduled ? "Next visit" : `${branch.marketShare.toFixed(1)}% share`}</strong>
      </div>
      <div class="branch-balance-grid">
        <div><span>Cash</span><strong>${fmt(balance)}</strong></div>
        <div><span>Deposits</span><strong>${fmt(deposits)}</strong></div>
        <div><span>Loans</span><strong>${fmt(loans)}</strong></div>
        <div><span>${branch.active ? "Bank earnings" : "Branch earnings"}</span><strong class="${branch.cumulativeProfit >= 0 ? "green" : "red"}">${fmt(branch.cumulativeProfit)}</strong></div>
      </div>
      <div class="branch-policy-grid">
        <label>Lending policy
          <select data-control="policy-${branch.id}" onchange="changeBranchPolicy('${branch.id}', this.value)">
            ${Object.entries(BankCampaign.POLICIES).map(([id, policy]) => `<option value="${id}" ${branch.policy === id ? "selected" : ""}>${policy.label}</option>`).join("")}
          </select>
        </label>
        <label>Customer focus
          <select data-control="focus-${branch.id}" onchange="changeBranchFocus('${branch.id}', this.value)">
            ${Object.entries(BankCampaign.FOCUSES).map(([id, focus]) => `<option value="${id}" ${branch.focus === id ? "selected" : ""}>${focus.label}</option>`).join("")}
          </select>
        </label>
        <label>Deposit pricing
          <select data-control="deposit-${branch.id}" onchange="changeBranchDepositPricing('${branch.id}', this.value)">
            ${Object.entries(BankCampaign.DEPOSIT_PRICING).map(([id, policy]) => `<option value="${id}" ${branch.depositPricing === id ? "selected" : ""}>${policy.label}</option>`).join("")}
          </select>
        </label>
        <label>Fee strategy
          <select data-control="fee-${branch.id}" onchange="changeBranchFeePricing('${branch.id}', this.value)">
            ${Object.entries(BankCampaign.FEE_PRICING).map(([id, policy]) => `<option value="${id}" ${branch.feePricing === id ? "selected" : ""}>${policy.label}</option>`).join("")}
          </select>
        </label>
      </div>
      ${branch.active ? `<p class="branch-note">You are managing this branch hands-on. Its local staff, loan book, and floor plan are active.</p>` : `
        <div class="capital-actions">
          <button class="btn btn-blue btn-small" onclick="moveBranchCapital('${branch.id}', 250)">Send $250</button>
          <button class="btn btn-dark btn-small" onclick="recallBranchCapital('${branch.id}', 250)" ${branch.cash - 250 < reserve ? "disabled" : ""}>Recall $250</button>
          <button class="btn ${scheduled ? "btn-dark" : "btn-green"} btn-small" onclick="${scheduled ? "cancelPlannedVisit()" : `planBranchVisit('${branch.id}')`}">${scheduled ? "Cancel visit" : "Visit next day"}</button>
          <span>Required reserve ${fmt(reserve)}</span>
        </div>
        ${result ? `<p class="branch-note">Last day: ${result.profit >= 0 ? "+" : ""}${fmt(result.profit)} profit · ${fmt(result.newDeposits)} new deposits · ${fmt(result.fees)} fees · ${fmt(result.depositInterest || 0)} funding cost</p>` : `<p class="branch-note">New branch · first operating result arrives at day end.</p>`}
      `}
    </article>`;
}

function renderRegion(region) {
  const branch = BankCampaign.regionBranch(bank, region.id);
  const competition = BankCampaign.regionalCompetition(bank, region.id);
  const check = BankCampaign.canOpenBranch(bank, region.id, 500);
  const unlocked = (bank.prestigeLevel || 0) >= region.prestigeRequired;
  return `
    <article class="region-card ${branch ? "occupied" : ""} ${unlocked ? "" : "locked"}">
      <div class="region-marker">${region.icon}</div>
      <div class="region-card-copy">
        <span>${region.territory}</span>
        <h3>${region.label}</h3>
        <p>${region.description}</p>
      </div>
      <div class="region-factors">
        ${regionFactor("Demand", `${Math.round(region.demand * 100)}%`)}
        ${regionFactor("Daily cost", fmt(region.rent + 16))}
        ${regionFactor("Crime", `${Math.round(region.crime * 100)}%`)}
        ${regionFactor("Growth", `${Math.round((region.growth - 1) * 100)}%`)}
      </div>
      <div class="region-action">
        <div class="region-rival-line"><span>Leading rival</span><strong>${competition.rivals[0].name} ${competition.rivals[0].share.toFixed(1)}%</strong></div>
        ${branch
          ? `<strong class="green">Operating · ${branch.active ? "HQ" : `${branch.marketShare.toFixed(1)}% share`}</strong>`
          : `<button class="btn btn-blue btn-small" onclick="establishBranch('${region.id}')" ${check.ok ? "" : "disabled"}>Open for ${fmt(region.setupCost + 500)}</button>
             <small>${check.ok ? `${fmt(region.setupCost)} setup + $500 capital` : check.reason}</small>`}
      </div>
    </article>`;
}

function renderRivalCard(rival) {
  const definition = BankCampaign.RIVAL_DEFINITIONS[rival.id];
  const strongest = Object.entries(rival.shares).sort((a, b) => b[1] - a[1])[0];
  const lastAction = rival.lastAction;
  return `
    <article class="rival-card" style="--rival-color:${definition.color}">
      <div class="rival-card-head">
        <div class="rival-seal">${definition.initials}</div>
        <div><span>${definition.strategy}</span><h3>${definition.name}</h3></div>
        <strong>${rival.openedRegions.length} regions</strong>
      </div>
      <p>${definition.description}</p>
      <div class="rival-metrics">
        <div><span>Capital</span><strong>${fmt(rival.capital)}</strong></div>
        <div><span>Stronghold</span><strong>${strongest ? `${BankCampaign.REGIONS[strongest[0]].label} ${strongest[1].toFixed(1)}%` : "None"}</strong></div>
        <div><span>Actions</span><strong>${rival.totalActions}</strong></div>
      </div>
      <div class="rival-foot">${lastAction
        ? `Day ${lastAction.day}: ${lastAction.title} in ${BankCampaign.REGIONS[lastAction.regionId].label}`
        : "No competitive action reported yet."}</div>
    </article>`;
}

function renderRivalHistory() {
  const history = bank.campaign.rivalHistory.slice(-8).reverse();
  if (!history.length) return `<p class="rival-empty">Competitive intelligence will appear as rival campaigns and expansions occur.</p>`;
  return `<div class="rival-history">${history.map(action => {
    const rival = BankCampaign.RIVAL_DEFINITIONS[action.rivalId];
    return `<div><span>Day ${action.day} · ${BankCampaign.REGIONS[action.regionId].label}</span><strong>${rival.name}: ${action.title}</strong></div>`;
  }).join("")}</div>`;
}

function renderStrategy() {
  const body = document.getElementById("strategyBody");
  if (!body) return;
  const restorePosition = document.getElementById("strategyOverlay")?.classList.contains("show");
  const previousScroll = body.scrollTop;
  const activeControl = document.activeElement?.dataset?.control || "";
  BankCampaign.migrateCampaign(bank);
  const status = BankCampaign.campaignStatus(bank, netWorth());
  const networkShare = BankCampaign.networkShare(bank);
  const currentGoal = status.current;
  const scheduledBranch = bank.campaign.branches.find(branch => branch.id === bank.campaign.nextActiveBranchId);
  body.innerHTML = `
    <div class="strategy-summary">
      <div class="campaign-card">
        <div class="campaign-step">Campaign ${status.complete ? "complete" : `goal ${status.step} of ${status.total}`}</div>
        <h2>${status.complete ? "Frontier banking legacy secured" : currentGoal.title}</h2>
        <p>${status.complete ? `Victory reached on day ${bank.campaign.victoryDay || bank.day}. Continue in open-ended mode.` : currentGoal.description}</p>
        ${status.complete ? `<button class="btn btn-green btn-small campaign-legacy-btn" id="legacyReportBtn" onclick="showLegacyConclusion()">View legacy report</button>` : ""}
        <div class="strategy-requirements">
          ${Object.entries(currentGoal.requirements).map(([key, value]) => campaignRequirementLabel(key, value, status.metrics)).join("")}
        </div>
      </div>
      <div class="network-totals">
        <div><span>Branches</span><strong>${bank.campaign.branches.length} / ${Object.keys(BankCampaign.REGIONS).length}</strong></div>
        <div><span>Satellite equity</span><strong>${fmt(bank.branchAssets)}</strong></div>
        <div><span>Network share</span><strong>${networkShare.toFixed(1)}%</strong></div>
        <div><span>Network cash</span><strong>${fmt(BankCampaign.networkCash(bank))}</strong></div>
        <div><span>Consolidated capital</span><strong>${fmt(netWorth())}</strong></div>
      </div>
    </div>
    ${scheduledBranch ? `<div class="travel-notice"><span>Next-day visit scheduled</span><strong>${scheduledBranch.name}</strong><button class="btn btn-dark btn-small" onclick="cancelPlannedVisit()">Cancel</button></div>` : ""}
    <section class="strategy-section">
      <div class="strategy-section-head"><div><span>Regional map</span><h2>Expansion opportunities</h2></div><p>Every region changes demand, cost, risk, and rival pressure.</p></div>
      <div class="region-map">${Object.values(BankCampaign.REGIONS).map(renderRegion).join("")}</div>
    </section>
    <section class="strategy-section">
      <div class="strategy-section-head"><div><span>Competitive intelligence</span><h2>Rival institutions</h2></div><p>Named competitors follow persistent strategies, campaign for share, and open new regional branches.</p></div>
      <div class="rival-grid">${bank.campaign.rivals.map(renderRivalCard).join("")}</div>
      ${renderRivalHistory()}
    </section>
    <section class="strategy-section">
      <div class="strategy-section-head"><div><span>Capital allocation</span><h2>Operating network</h2></div><p>Satellite branches simulate deterministically at the end of each day.</p></div>
      <div class="network-grid">${bank.campaign.branches.map(renderBranchControls).join("")}</div>
    </section>`;
  if (restorePosition) {
    body.scrollTop = previousScroll;
    if (activeControl) body.querySelector(`[data-control="${activeControl}"]`)?.focus({ preventScroll: true });
  }
}

function establishBranch(regionId) {
  const result = BankCampaign.openBranch(bank, regionId, 500);
  addLog(result.ok
    ? `${result.branch.name} opened with ${fmt(result.allocation)} working capital after ${fmt(result.setupCost)} setup costs.`
    : result.reason, result.ok ? "good" : "warn");
  BankAudio.play(result.ok ? "purchase" : "warning");
  renderStats();
  renderStrategy();
  updateModeBanner();
  saveGame();
}

function moveBranchCapital(branchId, amount) {
  const result = BankCampaign.transferCapital(bank, branchId, amount);
  addLog(result.ok ? `${fmt(result.amount)} sent to ${result.branch.name}.` : result.reason, result.ok ? "neutral" : "warn");
  renderStats();
  renderStrategy();
  saveGame();
}

function recallBranchCapital(branchId, amount) {
  const result = BankCampaign.withdrawCapital(bank, branchId, amount);
  addLog(result.ok ? `${fmt(result.amount)} recalled from ${result.branch.name}.` : result.reason, result.ok ? "neutral" : "warn");
  renderStats();
  renderStrategy();
  saveGame();
}

function changeBranchPolicy(branchId, policy) {
  if (!BankCampaign.setBranchPolicy(bank, branchId, policy)) return;
  const branch = bank.campaign.branches.find(entry => entry.id === branchId);
  addLog(`${branch.name} adopted a ${BankCampaign.POLICIES[policy].label.toLowerCase()} lending policy.`, "neutral");
  renderStrategy();
  saveGame();
}

function changeBranchFocus(branchId, focus) {
  if (!BankCampaign.setBranchFocus(bank, branchId, focus)) return;
  const branch = bank.campaign.branches.find(entry => entry.id === branchId);
  addLog(`${branch.name} now focuses on ${BankCampaign.FOCUSES[focus].label.toLowerCase()} clients.`, "neutral");
  renderStrategy();
  saveGame();
}

function changeBranchDepositPricing(branchId, pricing) {
  if (!BankCampaign.setBranchDepositPricing(bank, branchId, pricing)) return;
  const branch = bank.campaign.branches.find(entry => entry.id === branchId);
  addLog(`${branch.name} changed deposit pricing to ${BankCampaign.DEPOSIT_PRICING[pricing].label.toLowerCase()}.`, "neutral");
  renderStrategy();
  renderStats();
  saveGame();
}

function changeBranchFeePricing(branchId, pricing) {
  if (!BankCampaign.setBranchFeePricing(bank, branchId, pricing)) return;
  const branch = bank.campaign.branches.find(entry => entry.id === branchId);
  addLog(`${branch.name} changed its fee strategy to ${BankCampaign.FEE_PRICING[pricing].label.toLowerCase()}.`, "neutral");
  renderStrategy();
  renderStats();
  saveGame();
}

function planBranchVisit(branchId) {
  const result = BankCampaign.scheduleBranchVisit(bank, branchId);
  addLog(result.ok ? `Travel scheduled: direct control will move to ${result.branch.name} next day.` : result.reason, result.ok ? "good" : "warn");
  renderStrategy();
  saveGame();
}

function cancelPlannedVisit() {
  BankCampaign.cancelBranchVisit(bank);
  addLog("The planned branch visit was cancelled.", "neutral");
  renderStrategy();
  saveGame();
}
