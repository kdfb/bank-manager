// Operations overlay: staffing, assignment, training, policy, and branch capacity.

function openOperations() {
  pauseTimers();
  renderOperations();
  showAppDialog("operationsOverlay", ".menu-close-btn");
  BankAudio.play("uiOpen");
}

function closeOperations() {
  hideAppDialog("operationsOverlay", "#operationsBtn");
  BankAudio.play("uiClose");
}

function hireStaff(candidateId) {
  const candidate = BankOperations.staffCandidate(candidateId);
  if (!candidate || bank.staff.some(member => member.id === candidateId)) return;
  if (bank.cash < candidate.hireCost) {
    addLog(`You need ${fmt(candidate.hireCost)} to hire ${candidate.name}.`, "warn");
    return;
  }
  bank.cash -= candidate.hireCost;
  bank.profit -= candidate.hireCost;
  bank.staff.push(BankOperations.normalizeStaffMember({
    ...candidate,
    assignment: candidate.assignments[0],
    level: 1,
    served: 0,
  }));
  addLog(`${candidate.name} hired as ${candidate.role}. Daily payroll increased by ${fmt(candidate.dailyWage)}.`, "good");
  BankAudio.play("purchase");
  if (bank.phase === "operating" && branchState && BankOperations.activeStaff(bank, "counter").length) {
    branchState.tellerLocked = false;
    branchState.nextStaffServiceAt = Math.min(
      branchState.nextStaffServiceAt || Number.POSITIVE_INFINITY,
      performance.now() + 800,
    );
    document.body.classList.remove("at-teller");
  }
  renderStats();
  if (document.getElementById("operationsOverlay")?.classList.contains("show")) renderOperations();
  renderBranchStatus(true);
  saveGame();
}

// Kept as a compatibility hook for old saves and any cached interface markup.
function hireFirstTeller() {
  hireStaff("mara-chen");
}

function assignStaff(memberId, assignment) {
  const member = bank.staff.find(entry => entry.id === memberId);
  const candidate = BankOperations.staffCandidate(memberId);
  if (!member || !candidate?.assignments.includes(assignment)) return;
  member.assignment = assignment;
  addLog(`${member.name} assigned to the ${BankOperations.ASSIGNMENT_LABELS[assignment].toLowerCase()}.`, "neutral");
  renderOperations();
  renderBranchStatus(true);
  saveGame();
}

function trainStaff(memberId) {
  const member = bank.staff.find(entry => entry.id === memberId);
  if (!member) return;
  const cost = BankOperations.trainingCost(member);
  if (!cost) return;
  if (bank.cash < cost) {
    addLog(`You need ${fmt(cost)} to train ${member.name}.`, "warn");
    return;
  }
  bank.cash -= cost;
  bank.profit -= cost;
  member.level = Math.min(3, (member.level || 1) + 1);
  member.dailyWage += 5;
  addLog(`${member.name} completed level ${member.level} training. Service speed improved; wage increased by $5.`, "good");
  BankAudio.play("purchase");
  renderStats();
  renderOperations();
  renderBranchStatus(true);
  saveGame();
}

function setLendingPolicy(policy) {
  if (!BankEconomy.POLICY_RULES[policy]) return;
  bank.lendingPolicy = policy;
  addLog(`Lending policy changed to ${policy}.`, "neutral");
  renderOperations();
  saveGame();
}

function setDepositPricing(pricing) {
  const branch = BankCampaign.activeBranch(bank);
  if (!BankCampaign.setBranchDepositPricing(bank, branch.id, pricing)) return;
  addLog(`${branch.name} changed deposit pricing to ${BankCampaign.DEPOSIT_PRICING[pricing].label.toLowerCase()}.`, "neutral");
  renderOperations();
  renderStats();
  saveGame();
}

function setFeePricing(pricing) {
  const branch = BankCampaign.activeBranch(bank);
  if (!BankCampaign.setBranchFeePricing(bank, branch.id, pricing)) return;
  addLog(`${branch.name} changed its fee strategy to ${BankCampaign.FEE_PRICING[pricing].label.toLowerCase()}.`, "neutral");
  renderOperations();
  renderStats();
  saveGame();
}

function useEmergencyCredit() {
  const result = BankWorld.drawEmergencyCredit(bank);
  addLog(result.message, result.ok ? "warn" : "neutral");
  if (result.ok) {
    renderStats();
    renderOperations();
    saveGame();
  }
}

function sellLoanParticipation() {
  const result = BankWorld.sellLoanParticipation(bank);
  addLog(result.message, result.ok ? "neutral" : "warn");
  if (result.ok) {
    renderStats();
    renderOperations();
    saveGame();
  }
}

function staffDecisionFor(event, member) {
  if (!member || event.eventType !== "Credit Application") return "approve";
  return BankEconomy.canPolicyApproveLoan(
    bank.lendingPolicy,
    event.risk,
    bank.cash,
    event.amount
  ) ? "approve" : "deny";
}

function serviceTimeLabel(milliseconds) {
  return Number.isFinite(milliseconds) ? `${(milliseconds / 1000).toFixed(1)}s` : "Manual only";
}

function renderRosterMember(member, activeIds) {
  const candidate = BankOperations.staffCandidate(member.id);
  if (!candidate) return "";
  const isActive = activeIds.has(member.id);
  const trainingCost = BankOperations.trainingCost(member);
  return `
    <article class="staff-card ${isActive ? "active" : "inactive"}">
      <div class="staff-card-head">
        <div>
          <div class="panel-kicker">${candidate.role} · Level ${member.level}</div>
          <h4>${candidate.name}</h4>
        </div>
        <span class="staff-status">${isActive ? "On station" : "No workstation"}</span>
      </div>
      <p>${candidate.specialty} · ${serviceTimeLabel(BankOperations.staffServiceMs(member))} per case · ${member.served || 0} served</p>
      <div class="assignment-row" aria-label="Assign ${candidate.name}">
        ${candidate.assignments.map(assignment => `
          <button class="assignment-btn ${member.assignment === assignment ? "active" : ""}"
            onclick="assignStaff('${member.id}', '${assignment}')">
            ${BankOperations.ASSIGNMENT_LABELS[assignment]}
          </button>`).join("")}
      </div>
      <div class="staff-card-foot">
        <strong>${fmt(member.dailyWage)} / day</strong>
        ${trainingCost
          ? `<button class="btn btn-blue staff-train" aria-label="Train ${member.name} for ${fmt(trainingCost)}" onclick="trainStaff('${member.id}')" ${bank.cash < trainingCost ? "disabled" : ""}>Train ${fmt(trainingCost)}</button>`
          : `<span class="staff-max">Fully trained</span>`}
      </div>
    </article>`;
}

function renderCandidate(candidate) {
  return `
    <article class="candidate-card">
      <div class="panel-kicker">${candidate.role} · ${candidate.specialty}</div>
      <h4>${candidate.name}</h4>
      <p>${candidate.pitch}</p>
      <div class="candidate-terms">
        <span>${fmt(candidate.dailyWage)} / day</span>
        <button class="btn btn-green" onclick="hireStaff('${candidate.id}')" ${bank.cash < candidate.hireCost ? "disabled" : ""}>
          Hire ${fmt(candidate.hireCost)}
        </button>
      </div>
    </article>`;
}

function renderLoanScheduleRow(loan) {
  const dueIn = Math.max(0, loan.nextPaymentDay - bank.day);
  const dueLabel = dueIn === 0 ? "Due today" : dueIn === 1 ? "Due tomorrow" : `Due in ${dueIn} days`;
  return `
    <div class="loan-schedule-row ${loan.status === "late" ? "late" : ""}">
      <div>
        <strong>${loan.name}</strong>
        <span class="risk-tag ${loan.risk}">${loan.risk}</span>
      </div>
      <div><span>Balance</span><strong>${fmt(loan.balance)}</strong></div>
      <div><span>Payment</span><strong>${fmt(loan.scheduledPayment)}</strong></div>
      <div><span>Schedule</span><strong>${dueLabel} · ${loan.paymentsRemaining} left</strong></div>
      <div class="loan-state ${loan.status}">${loan.status === "late" ? `${loan.daysLate} day${loan.daysLate === 1 ? "" : "s"} late` : "Current"}</div>
    </div>`;
}

function renderPrestigeRequirements(status) {
  if (!status.next) return `<span class="prestige-complete">Maximum prestige reached</span>`;
  const requirements = status.next.requirements;
  const rows = [
    ["Customers", status.metrics.served, requirements.served, value => value.toLocaleString()],
    ["Standing", status.metrics.rep, requirements.rep, value => `${value}`],
    ["Net capital", status.metrics.netCapital, requirements.netCapital, value => fmt(value)],
    ["Market share", status.metrics.marketShare, requirements.marketShare, value => `${value.toFixed(1)}%`],
  ].filter(([, , target]) => Number.isFinite(target));
  return rows.map(([label, current, target, formatter]) => `
    <div class="prestige-requirement ${current >= target ? "met" : ""}">
      <span>${label}</span><strong>${formatter(current)} / ${formatter(target)}</strong>
    </div>`).join("");
}

function renderSegmentCard(segment) {
  return `
    <article class="segment-card ${segment.available ? "" : "locked"}">
      <div class="segment-head">
        <div><span class="segment-icon">${segment.icon}</span><strong>${segment.label}</strong></div>
        <span>${segment.available ? `${Math.round(segment.demographicShare * 100)}% of demand` : `Prestige ${segment.prestigeRequired}`}</span>
      </div>
      <p>${segment.description}</p>
      ${segment.available ? `
        <div class="segment-share"><i style="width:${Math.max(3, segment.demographicShare * 100)}%"></i></div>
        <div class="segment-results"><span>${segment.served} served</span><span>${segment.lost} lost</span><span>${fmt(segment.value)} value</span></div>`
        : `<div class="segment-locked">Locked until ${BankMarket.PRESTIGE_TIERS[segment.prestigeRequired].title}</div>`}
    </article>`;
}

function focusedUpgradeCards(compact = false) {
  return `<div class="focused-upgrade-grid ${compact ? "compact" : ""}">
    ${FOCUSED_UPGRADES.map(upgrade => {
      const owned = Boolean(bank.upgrades?.[upgrade.id]);
      return `<button class="focused-upgrade-card ${owned ? "owned" : ""}" onclick="buyFocusedUpgrade('${upgrade.id}')" ${owned || bank.cash < upgrade.cost ? "disabled" : ""}>
        <span class="focused-upgrade-icon">${SHOP_SYMBOLS[upgrade.id] || "◆"}</span>
        <strong>${upgrade.label}</strong>
        <span>${upgrade.desc}</span>
        <em>${owned ? "Installed" : fmt(upgrade.cost)}</em>
      </button>`;
    }).join("")}
  </div>`;
}

function findFocusedUpgradePlacement(upgradeId) {
  const oldRotation = branchState.buildRotation;
  branchState.buildRotation = 0;
  for (let y = 1; y < BRANCH_ROWS - 1; y++) {
    for (let x = 1; x < BRANCH_COLS - 1; x++) {
      if (canPlaceBranch(upgradeId, x, y)) return { x, y, oldRotation };
    }
  }
  branchState.buildRotation = oldRotation;
  return null;
}

function buyFocusedUpgrade(upgradeId) {
  const upgrade = FOCUSED_UPGRADES.find(entry => entry.id === upgradeId);
  if (!upgrade || bank.upgrades?.[upgradeId]) return;
  const position = findFocusedUpgradePlacement(upgradeId);
  if (!position) {
    addLog(`There is no clear floor space for ${upgrade.label}.`, "warn");
    return;
  }
  const placed = placeBranchUpgrade(upgradeId, position.x, position.y);
  branchState.buildRotation = position.oldRotation;
  if (!placed) return;
  if (bank.phase === "report" && bank.lastReport) renderEndOfDay(bank.lastReport);
  else renderOperations();
}

function hireMaraFromReward() {
  hireStaff("mara-chen");
  if (bank.staff.some(member => member.id === "mara-chen") && bank.phase === "report" && bank.lastReport) {
    renderEndOfDay(bank.lastReport);
  }
}

function renderEndOfDayReward() {
  if ((bank.stats?.customersServed || 0) < 10) return "";
  const mara = bank.staff?.find(member => member.id === "mara-chen");
  if (!mara) {
    const candidate = BankOperations.staffCandidate("mara-chen");
    return `<section class="day-reward-card">
      <div class="panel-kicker">A sustainable next step</div>
      <h3>You cannot do every transaction forever.</h3>
      <p><strong>${candidate.name}</strong> can handle deposits, withdrawals, and new accounts. You will still make every loan and customer follow-up decision.</p>
      <button class="btn btn-green" onclick="hireMaraFromReward()" ${bank.cash < candidate.hireCost ? "disabled" : ""}>Hire Mara · ${fmt(candidate.hireCost)} now · ${fmt(candidate.dailyWage)}/day</button>
    </section>`;
  }
  const owned = FOCUSED_UPGRADES.filter(upgrade => bank.upgrades?.[upgrade.id]).length;
  if (!owned) {
    return `<section class="day-reward-card">
      <div class="panel-kicker">Choose your first improvement</div>
      <h3>What should the bank become better at?</h3>
      <p>Each improvement has one visible purpose. Choose when you are ready.</p>
      ${focusedUpgradeCards(true)}
    </section>`;
  }
  return "";
}

function renderOperations() {
  const body = document.getElementById("operationsBody");
  if (!body) return;
  BankOperations.migrateRoster(bank);
  const mara = bank.staff.find(member => member.id === "mara-chen");
  const focusedPortfolio = BankPortfolio.portfolioSummary(bank.loanBook, bank.day);
  const focusedDebt = BankEconomy.nextDebtPayment(bank);
  body.innerHTML = `
    <div class="focused-operations">
      <section class="operations-card operations-wide">
        <div class="panel-kicker">Team</div>
        ${mara ? `<h3>Mara Chen runs the public counter</h3>
          <p>She handles routine appointments automatically. Loans and returning-customer follow-ups always come to you.</p>
          <div class="ops-metrics"><div><span>Daily wage</span><strong>${fmt(mara.dailyWage)}</strong></div><div><span>Appointments handled</span><strong>${mara.served || 0}</strong></div></div>`
        : `<h3>Your first teller</h3><p>Mara Chen can remove routine repetition without taking over the choices that define the bank.</p>
          <button class="btn btn-green" onclick="hireStaff('mara-chen')" ${bank.cash < 600 ? "disabled" : ""}>Hire Mara · ${fmt(600)}</button>`}
      </section>
      <section class="operations-card operations-wide">
        <div class="panel-kicker">Commitments</div>
        <div class="ops-metrics">
          <div><span>Loans outstanding</span><strong>${fmt(focusedPortfolio.balance)}</strong></div>
          <div><span>Expected next payment</span><strong>${fmt(focusedPortfolio.expectedNextDay)}</strong></div>
          <div><span>Expected loan loss</span><strong>${fmt(focusedPortfolio.expectedLoss)}</strong></div>
          <div><span>Next debt payment</span><strong>${fmt(focusedDebt.amount)} in ${focusedDebt.dueInDays} day${focusedDebt.dueInDays === 1 ? "" : "s"}</strong></div>
        </div>
      </section>
      <section class="operations-card operations-wide">
        <div class="panel-kicker">Four useful improvements</div>
        <h3>Improve a felt need</h3>
        <p>No sprawling catalog: every option changes a part of the daily loop you can see.</p>
        ${focusedUpgradeCards()}
      </section>
    </div>`;
  return;
  const restorePosition = document.getElementById("operationsOverlay")?.classList.contains("show");
  const previousScroll = body.scrollTop;
  const activeControl = document.activeElement?.dataset?.control || "";
  BankOperations.migrateRoster(bank);
  const debt = BankEconomy.nextDebtPayment(bank);
  const objective = BankOperations.currentObjective(bank, netWorth());
  const features = BankOperations.featureAvailability(bank);
  const queue = BankOperations.queueHealth(branchState?.customers || [], performance.now(), bank);
  const staffing = BankOperations.staffingSummary(bank);
  const worldModifiers = BankWorld.modifiers(bank);
  const pricingEffects = BankCampaign.activePricingEffects(bank);
  const conditions = BankWorld.activeConditionDetails(bank);
  const pendingFollowUps = BankWorld.pendingFollowUps(bank);
  const recentWorldHistory = bank.world.history.slice(0, 4);
  const location = BankMarket.locationProfile(bank);
  const prestige = BankMarket.prestigeStatus(bank, netWorth());
  const segments = BankMarket.segmentReport(bank);
  const portfolio = BankPortfolio.portfolioSummary(bank.loanBook, bank.day);
  const difficulty = DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
  const dailyOperatingCost = BankEconomy.dailyStaffCost(bank)
    + bank.deposits * 0.000055 * worldModifiers.depositInterestCost * pricingEffects.depositInterestCost
    + Math.max(5, (difficulty.dailyOverhead - (bank.upgrades?.break_room || 0) * 2) * worldModifiers.rentCost * location.rentMultiplier);
  const projectedDebtPayment = debt.dueInDays === 1 ? debt.amount : 0;
  const projectedCloseCash = bank.cash + portfolio.expectedNextDay - dailyOperatingCost - projectedDebtPayment;
  const reserveRatio = bank.deposits > 0 ? bank.cash / bank.deposits : 1;
  const activeIds = new Set([
    ...BankOperations.activeStaff(bank, "counter"),
    ...BankOperations.activeStaff(bank, "loans"),
  ].map(member => member.id));
  const candidates = BankOperations.STAFF_CANDIDATES.filter(candidate =>
    !bank.staff.some(member => member.id === candidate.id)
  );
  const policies = [
    ["conservative", "Conservative", "Approve low-risk loans only."],
    ["balanced", "Balanced", "Approve low- and medium-risk loans."],
    ["growth", "Growth", "Approve any affordable loan; defaults will be higher."],
  ];

  body.innerHTML = `
    <div class="operations-grid">
      <section class="operations-card operations-wide objective-card">
        <div>
          <div class="panel-kicker">Current branch goal · ${objective.step}/${objective.total}</div>
          <h3>${objective.title}</h3>
        </div>
        <div class="objective-progress">${objective.progress}</div>
      </section>

      <section class="operations-card operations-wide prestige-card">
        <div class="prestige-tier">
          <div class="prestige-seal" aria-label="Prestige tier ${prestige.current.level + 1} of ${BankMarket.PRESTIGE_TIERS.length}">${prestige.current.level + 1}</div>
          <div>
            <div class="panel-kicker">Bank prestige · Tier ${prestige.current.level + 1}/${BankMarket.PRESTIGE_TIERS.length}</div>
            <h3>${prestige.current.title}</h3>
            <p>${prestige.next ? `Next: ${prestige.next.title} unlocks ${prestige.next.unlock.toLowerCase()}.` : "Silver Creek recognizes this bank as a territorial institution."}</p>
          </div>
        </div>
        <div class="prestige-requirements">${renderPrestigeRequirements(prestige)}</div>
      </section>

      ${features.staffing ? `
      <section class="operations-card operations-wide">
        <div class="operations-section-head">
          <div>
            <div class="panel-kicker">Staff roster</div>
            <h3>${staffing.hired ? `${staffing.hired} employee${staffing.hired === 1 ? "" : "s"}` : "Owner-operated branch"}</h3>
          </div>
          <div class="capacity-pills">
            <span>Counter ${staffing.counter}/${BankOperations.workstationCapacity(bank, "counter")} · ${serviceTimeLabel(staffing.counterIntervalMs * worldModifiers.serviceInterval)}</span>
            <span>Loans ${staffing.loans}/${BankOperations.workstationCapacity(bank, "loans")} · ${serviceTimeLabel(staffing.loanIntervalMs * worldModifiers.serviceInterval)}</span>
          </div>
        </div>
        ${staffing.hired
          ? `<div class="staff-roster">${bank.staff.map(member => renderRosterMember(member, activeIds)).join("")}</div>`
          : `<p>Hire a specialist to begin delegating work. Employees only process cases when assigned to a matching workstation.</p>`}
      </section>

      ${candidates.length ? `
        <section class="operations-card operations-wide">
          <div class="panel-kicker">Hiring board</div>
          <h3>Available specialists</h3>
          <div class="candidate-grid">${candidates.map(renderCandidate).join("")}</div>
        </section>` : ""}` : `
        <section class="operations-card operations-wide discovery-card">
          <div><div class="panel-kicker">Next management system</div><h3>Staffing unlocks after ten customers</h3></div>
          <p>For now, learn the daily rhythm. After ten appointments, the hiring board and Build mode open together so every new tool has an immediate purpose.</p>
          <div class="discovery-progress"><i style="width:${Math.min(100, (bank.stats.customersServed || 0) / 10 * 100)}%"></i></div>
          <strong>${bank.stats.customersServed || 0} / 10 customers served</strong>
        </section>`}

      ${features.world ? `<section class="operations-card operations-wide world-card">
        <div class="operations-section-head">
          <div>
            <div class="panel-kicker">${location.label} conditions</div>
            <h3>${conditions.length ? `${conditions.length} active condition${conditions.length === 1 ? "" : "s"}` : "Stable local outlook"}</h3>
          </div>
          <div class="world-location">Regional desk · ${gameDate(bank.day)}</div>
        </div>
        ${conditions.length
          ? `<div class="condition-grid">${conditions.map(condition => `
              <article class="condition-card">
                <div class="condition-icon">${condition.icon}</div>
                <div><strong>${condition.label}</strong><span>${condition.remainingDays} day${condition.remainingDays === 1 ? "" : "s"} remaining</span></div>
                <p>${condition.description}</p>
              </article>`).join("")}</div>`
          : `<p>No temporary regional, competitor, crime, or staff effects are changing today's forecast.</p>`}
        ${pendingFollowUps.length ? `
          <div class="world-followups">
            <div class="panel-kicker">Developing stories</div>
            ${pendingFollowUps.map(pending => `<div><span>${pending.event.icon} ${pending.event.title}</span><strong>${pending.dueDay <= bank.day ? "Decision due" : `${pending.dueDay - bank.day} day${pending.dueDay - bank.day === 1 ? "" : "s"}`}</strong></div>`).join("")}
          </div>` : ""}
        ${recentWorldHistory.length ? `
          <div class="world-history">
            ${recentWorldHistory.map(entry => `<div><span>${gameDate(entry.day)} · ${entry.eventTitle}</span><strong>${entry.choiceLabel}</strong></div>`).join("")}
          </div>` : ""}
      </section>` : ""}

      ${features.market ? `<section class="operations-card operations-wide market-card">
        <div class="operations-section-head">
          <div>
            <div class="panel-kicker">Location and customer market</div>
            <h3>${location.label} · ${location.region}</h3>
            <p>${location.description}</p>
          </div>
          <div class="location-factors">
            <span>Rent ×${location.rentMultiplier.toFixed(2)}</span>
            <span>Crime ×${location.crimeRisk.toFixed(2)}</span>
            <span>Growth ×${location.growth.toFixed(2)}</span>
          </div>
        </div>
        <div class="segment-grid">${segments.map(renderSegmentCard).join("")}</div>
      </section>` : ""}

      ${features.credit ? `<section class="operations-card operations-wide portfolio-card">
        <div class="operations-section-head">
          <div>
            <div class="panel-kicker">Loan portfolio</div>
            <h3>${portfolio.count} active loan${portfolio.count === 1 ? "" : "s"} · ${fmt(portfolio.balance)} outstanding</h3>
          </div>
          <div class="portfolio-alert ${portfolio.delinquentCount ? "warn" : ""}">
            ${portfolio.delinquentCount
              ? `${portfolio.delinquentCount} late · ${fmt(portfolio.delinquentBalance)} exposed`
              : "No delinquent loans"}
          </div>
        </div>
        <div class="portfolio-metrics">
          <div><span>Scheduled inflow</span><strong>${fmt(portfolio.scheduledNextDay)}</strong></div>
          <div><span>Expected inflow</span><strong>${fmt(portfolio.expectedNextDay)}</strong></div>
          <div><span>Expected loss</span><strong class="${portfolio.expectedLoss ? "risk-value" : ""}">${fmt(portfolio.expectedLoss)}</strong></div>
          <div><span>Risk mix</span><strong>${portfolio.countsByRisk.low} low · ${portfolio.countsByRisk.medium} med · ${portfolio.countsByRisk.high} high</strong></div>
          <div><span>Reserve ratio</span><strong class="${reserveRatio < 0.2 ? "risk-value" : ""}">${Math.round(reserveRatio * 100)}%</strong></div>
          <div><span>Projected close cash</span><strong class="${projectedCloseCash < 0 ? "risk-value" : ""}">${fmt(projectedCloseCash)}</strong></div>
        </div>
        ${portfolio.loans.length
          ? `<div class="loan-schedule">${portfolio.loans.slice(0, 8).map(renderLoanScheduleRow).join("")}</div>`
          : `<p class="portfolio-empty">Approved credit applications will appear here with their payment schedule and forecast risk.</p>`}
      </section>` : ""}

      ${features.credit ? `<section class="operations-card">
        <div class="panel-kicker">Lending policy</div>
        <p>Loan-desk employees apply this rule. Credit applications remain manual until a loan officer and Loan Officer's Desk are both available.</p>
        <div class="policy-list">
          ${policies.map(([id, label, desc]) => `
            <button class="policy-option ${bank.lendingPolicy === id ? "active" : ""}" data-control="lending-${id}" onclick="setLendingPolicy('${id}')">
              <strong>${label}</strong><span>${desc}</span>
            </button>`).join("")}
        </div>
      </section>` : ""}

      ${features.pricing ? `<section class="operations-card operations-wide pricing-card">
        <div class="operations-section-head">
          <div><div class="panel-kicker">Pricing policy</div><h3>Funding and service charges</h3></div>
          <p>Pricing changes customer demand, fee yield, deposit growth, daily interest expense, and market share. Every branch sets its own posture.</p>
        </div>
        <div class="pricing-policy-grid">
          <div>
            <h4>Deposit pricing</h4>
            <div class="policy-list compact-policy-list">
              ${Object.entries(BankCampaign.DEPOSIT_PRICING).map(([id, policy]) => `
                <button class="policy-option ${bank.depositPricing === id ? "active" : ""}" data-control="deposit-${id}" onclick="setDepositPricing('${id}')">
                  <strong>${policy.label}</strong><span>${policy.description}</span>
                </button>`).join("")}
            </div>
          </div>
          <div>
            <h4>Fee strategy</h4>
            <div class="policy-list compact-policy-list">
              ${Object.entries(BankCampaign.FEE_PRICING).map(([id, policy]) => `
                <button class="policy-option ${bank.feePricing === id ? "active" : ""}" data-control="fee-${id}" onclick="setFeePricing('${id}')">
                  <strong>${policy.label}</strong><span>${policy.description}</span>
                </button>`).join("")}
            </div>
          </div>
        </div>
        <div class="pricing-summary">
          <span>Deposit flow <strong>${Math.round(pricingEffects.depositDemand * 100)}%</strong></span>
          <span>Funding cost <strong>${Math.round(pricingEffects.depositInterestCost * 100)}%</strong></span>
          <span>Fee yield <strong>${Math.round(pricingEffects.feeMultiplier * 100)}%</strong></span>
          <span>Customer demand <strong>${Math.round(pricingEffects.customerDemand * 100)}%</strong></span>
          <span>Daily share pressure <strong>${pricingEffects.marketShareDaily >= 0 ? "+" : ""}${pricingEffects.marketShareDaily.toFixed(2)}%</strong></span>
        </div>
      </section>` : ""}

      ${features.recovery ? `<section class="operations-card liquidity-actions">
        <div class="panel-kicker">Liquidity recovery</div>
        <h3>Emergency options</h3>
        <p>Recovery tools trade future earnings or debt capacity for cash. They only unlock under genuine reserve pressure.</p>
        <div class="recovery-actions">
          <button class="policy-option" onclick="useEmergencyCredit()" ${BankWorld.canUseEmergencyCredit(bank) ? "" : "disabled"}>
            <strong>Draw $750 emergency credit</strong><span>Debt +$900 · scheduled debt payment +$25 · standing -2</span>
          </button>
          <button class="policy-option" onclick="sellLoanParticipation()" ${BankWorld.canSellParticipation(bank) ? "" : "disabled"}>
            <strong>Sell 25% of the loan book</strong><span>Receive 92¢ per $1 of principal sold and recognize the discount immediately.</span>
          </button>
        </div>
      </section>` : ""}

      <section class="operations-card ${features.recovery ? "" : "operations-wide"}">
        <div class="panel-kicker">Bank position</div>
        <div class="ops-metrics">
          <div><span>Net capital</span><strong>${fmt(netWorth())}</strong></div>
          <div><span>Daily payroll</span><strong>${fmt(BankEconomy.dailyStaffCost(bank))}</strong></div>
          <div><span>Debt outstanding</span><strong>${fmt(bank.debt)}</strong></div>
          <div><span>Next payment</span><strong>${fmt(debt.amount)} in ${debt.dueInDays} day${debt.dueInDays === 1 ? "" : "s"}</strong></div>
          <div><span>Your market share</span><strong>${bank.marketShare.toFixed(1)}%</strong></div>
          <div><span>Continental Trust</span><strong>${bank.rivalShare.toFixed(1)}%</strong></div>
          <div><span>Current queue</span><strong>${queue.count} waiting</strong></div>
          <div><span>Customer patience</span><strong>${BankOperations.patienceSeconds(bank)} seconds</strong></div>
        </div>
      </section>
    </div>`;
  if (restorePosition) {
    body.scrollTop = previousScroll;
    if (activeControl) body.querySelector(`[data-control="${activeControl}"]`)?.focus({ preventScroll: true });
  }
}
