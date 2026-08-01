// All DOM rendering. Reads from `bank`, `queue`, `qIdx` globals.
// No game logic here — only visual updates.

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60)    return "just now";
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function setDecisionLayerVisible(show) {
  document.getElementById("decisionLayer")?.classList.toggle("show", show);
  document.body.classList.toggle("decision-open", show);
  if (show) document.getElementById("guidanceCard")?.classList.remove("show");
}

function renderMenuSlots() {
  const container = document.getElementById("menuSlots");
  if (!container) return;

  container.innerHTML = SLOT_KEYS.map((_, i) => {
    const meta = readSlotMeta(i);
    const nwColor = meta && meta.netWorth >= 0 ? "var(--green)" : "var(--red)";

    const infoHtml = meta
      ? `<div class="slot-info">
           <span class="slot-day">${gameDate(meta.day)}</span>
           <span class="slot-nw" style="color:${nwColor}">${fmt(meta.netWorth)} net capital</span>
         </div>`
      : `<div class="slot-info empty">Empty slot</div>`;

    const savedAtHtml = meta
      ? `<span class="slot-saved-at">${timeAgo(meta.savedAt)}</span>` : "";

    const loadDeleteBtns = meta
      ? `<button class="slot-btn slot-btn-load"   onclick="menuLoadFromSlot(${i})">⬆ Load</button>
         <button class="slot-btn slot-btn-delete" onclick="menuDeleteSlot(${i})">✕</button>`
      : "";

    return `
      <div class="slot-card">
        <div class="slot-card-top">
          <span class="slot-name">Slot ${i + 1}</span>
          ${savedAtHtml}
        </div>
        ${infoHtml}
        <div class="slot-btns">
          <button class="slot-btn slot-btn-save" onclick="menuSaveToSlot(${i})">↓ Save</button>
          ${loadDeleteBtns}
        </div>
      </div>`;
  }).join("");
}

function renderStats() {
  const r  = bank.rep;
  const nw = netWorth();

  const dayLabel = document.getElementById("dayLabel");
  const netWorthEl = document.getElementById("netWorth");
  const cashEl = document.getElementById("statCash");
  const loansEl = document.getElementById("statLoans");
  const depositsEl = document.getElementById("statDeposits");
  const debtEl = document.getElementById("statDebt");
  const repEl = document.getElementById("statRep");
  const subtitleEl = document.getElementById("bankSubtitle");
  const mobileDayLabel = document.getElementById("mobileDayLabel");
  if (!dayLabel) return;

  dayLabel.textContent     = gameDate(bank.day);
  if (mobileDayLabel) mobileDayLabel.textContent = gameDate(bank.day);
  netWorthEl.textContent   = fmt(nw);
  netWorthEl.style.color   = nw >= 0 ? "var(--green)" : "var(--red)";
  cashEl.textContent       = fmt(bank.cash);
  cashEl.style.color       =
    bank.cash < 200 ? "var(--red)" : bank.cash < 800 ? "var(--yellow)" : "var(--green)";
  loansEl.textContent      = fmt(bank.loansOut);
  depositsEl.textContent   = fmt(bank.deposits);
  debtEl.textContent       = fmt(bank.debt || 0);
  if (subtitleEl) {
    const location = BankMarket.locationProfile(bank);
    subtitleEl.textContent = `${location.label} · Community Bank`;
  }

  repEl.textContent = `${r} / 100`;
  repEl.style.color =
    r >= 50 ? "var(--green)" : r >= 30 ? "var(--yellow)" : "var(--red)";

  const features = BankOperations.featureAvailability(bank);
  document.body.classList.toggle("delegated-counter", BankOperations.activeStaff(bank, "counter").length > 0);
  const operationsButton = document.getElementById("operationsBtn");
  const strategyButton = document.getElementById("strategyBtn");
  const buildButton = document.getElementById("buildModeBtn");
  const touchBuildButton = document.getElementById("touchBuildBtn");
  const ledgerButton = document.getElementById("ledgerToggleBtn");
  const mobileLedgerButton = document.getElementById("mobileLedgerBtn");
  const hasCustomerHistory = (bank.stats?.customersServed || 0) > 0;
  if (operationsButton) operationsButton.hidden = !features.staffing;
  if (strategyButton) {
    strategyButton.hidden = !features.regional;
    strategyButton.disabled = false;
    strategyButton.textContent = "Regions";
    strategyButton.title = "Open the regional strategy desk";
    strategyButton.setAttribute("aria-label", "Open regional strategy");
  }
  if (buildButton) {
    buildButton.hidden = true;
    buildButton.disabled = false;
    buildButton.textContent = "Build";
    buildButton.title = "Enter Build mode";
    buildButton.setAttribute("aria-label", "Enter build mode");
  }
  if (touchBuildButton) {
    touchBuildButton.hidden = true;
    touchBuildButton.disabled = false;
    touchBuildButton.title = "Enter Build mode";
  }
  if (ledgerButton) ledgerButton.hidden = !hasCustomerHistory;
  if (mobileLedgerButton) mobileLedgerButton.hidden = !hasCustomerHistory;

  const fill = document.getElementById("repFill");
  fill.style.width      = `${r}%`;
  fill.style.background = r >= 50 ? "var(--green)" : r >= 30 ? "var(--yellow)" : "var(--red)";
  if (typeof refreshPlatformProgress === "function") refreshPlatformProgress(true);
  if (typeof renderGuidance === "function") renderGuidance();
}

function renderDots() {
  const container = document.getElementById("dots");
  const start = Math.max(0, queue.length - 12);
  container.innerHTML = queue.slice(start).map((_, offset) => {
    const i = start + offset;
    const cls = i < qIdx ? "done" : i === qIdx ? "current" : "";
    return `<div class="dot ${cls}"></div>`;
  }).join("");
}

// End-of-day summary card — shows actual numbers already applied to bank state.
function renderTownReportThread() {
  if (bank.day < 3 || typeof BankTown === "undefined") return "";
  const status = BankTown.projectStatus(bank);
  return `<section class="town-report-thread">
    <div><span>Silver Creek Mill · ${status.progress}</span><strong>${status.title}</strong></div>
    <p>${status.body}</p>
  </section>`;
}

function renderAfterHoursTownChoice(momentId) {
  if (!momentId || typeof BankTown === "undefined") return "";
  const moment = BankTown.MOMENTS.find(entry => entry.id === momentId);
  if (!moment) return "";
  const event = makeTownProjectEvent(moment);
  const preview = event.choicePreview || {};
  return `<section class="after-hours-choice">
    <div class="panel-kicker">After hours · Take your time</div>
    <h3>${event.title}</h3>
    <p>${event.story}</p>
    <div class="choice-grid" aria-label="Town project options">
      <button class="choice-card ${preview.deny?.tone || "neutral"}" onclick="resolveAfterHoursTown('left')">
        <span>${preview.deny?.title || "First path"}</span>
        <strong>${event.denyLabel}</strong>
        <small>${preview.deny?.summary || "Choose the smaller commitment."}</small>
      </button>
      <button class="choice-card ${preview.approve?.tone || "balanced"}" onclick="resolveAfterHoursTown('right')" ${!event.canApprove() ? "disabled" : ""}>
        <span>${preview.approve?.title || "Second path"}</span>
        <strong>${event.approveLabel}</strong>
        <small>${preview.approve?.summary || "Choose the larger commitment."}</small>
      </button>
    </div>
    ${!event.canApprove() && event.cantMsg ? `<div class="cant-fund">${event.cantMsg}</div>` : ""}
  </section>`;
}

function renderAfterHoursWorldChoice(eventId) {
  if (!eventId || typeof BankWorld === "undefined") return "";
  const event = makeWorldEvent(eventId);
  if (!event) return "";
  const preview = event.choicePreview || {};
  return `<section class="after-hours-choice">
    <div class="panel-kicker">After hours · Take your time</div>
    <h3>${event.title}</h3>
    <p>${event.story}</p>
    <div class="choice-grid" aria-label="Regional event options">
      <button class="choice-card ${preview.deny?.tone || "neutral"}" onclick="resolveAfterHoursWorld('left')">
        <span>${preview.deny?.title || "Second path"}</span>
        <strong>${event.denyLabel}</strong>
        <small>${preview.deny?.summary || "Choose the measured response."}</small>
      </button>
      <button class="choice-card ${preview.approve?.tone || "balanced"}" onclick="resolveAfterHoursWorld('right')" ${!event.canApprove() ? "disabled" : ""}>
        <span>${preview.approve?.title || "First path"}</span>
        <strong>${event.approveLabel}</strong>
        <small>${preview.approve?.summary || "Choose the more ambitious response."}</small>
      </button>
    </div>
    ${!event.canApprove() && event.cantMsg ? `<div class="cant-fund">${event.cantMsg}</div>` : ""}
  </section>`;
}

function renderEndOfDayLegacy(loanIncome, depInt, overhead, dayDelta) {
  const card       = document.getElementById("eventCard");
  card.classList.remove("service-active");
  decisionOpen = true;
  setDecisionLayerVisible(true);
  const deltaColor = dayDelta >= 0 ? "var(--green)" : "var(--red)";
  const deltaSign  = dayDelta >= 0 ? "+" : "";
  card.innerHTML = `
    <div class="event-head">
      <div class="event-icon">📊</div>
      <div class="event-meta">
        <div class="type">End of Day</div>
        <div class="title">${gameDate(bank.day)} Report</div>
      </div>
    </div>
    <div class="event-body eod-body">
      <div class="eod-row"><span class="key">Loan repayments</span><span style="color:var(--green)">+${fmt(loanIncome)}</span></div>
      <div class="eod-row"><span class="key">Deposit interest</span><span style="color:var(--red)">−${fmt(depInt)}</span></div>
      <div class="eod-row"><span class="key">Daily overhead</span><span style="color:var(--red)">−${fmt(overhead)}</span></div>
      <div class="eod-row" style="margin-top:4px;padding-top:10px;border-top:1px solid var(--border)">
        <span class="key" style="font-weight:700;color:var(--text)">Net change</span>
        <span style="color:${deltaColor};font-weight:800;font-size:16px">${deltaSign}${fmt(dayDelta)}</span>
      </div>
      <div class="eod-row">
        <span class="key">Total earnings</span>
        <span style="color:${bank.profit >= 0 ? "var(--green)" : "var(--red)"}">${fmt(bank.profit)}</span>
      </div>
    </div>
    ${typeof renderEndOfDayReward === "function" ? renderEndOfDayReward() : ""}
    <div class="btn-row one-col">
      <button class="btn btn-purple" onclick="startNextDay()">Start ${gameDate(bank.day + 1)} →</button>
    </div>`;
  card.scrollTop = 0;
  document.getElementById("dots").innerHTML = "";
}

function renderEndOfDay(report) {
  const { loanIncome, depInt, rent, wages, defaults, debtPayment, dayDelta } = report;
  const cashChange = Number.isFinite(report.cashChange) ? report.cashChange : 0;
  const loanMetrics = report.loanMetrics || {
    due: loanIncome,
    received: loanIncome,
    interestIncome: bank.dayMetrics.interestIncome || 0,
    missedPayments: bank.dayMetrics.loanPaymentsMissed || 0,
    newDelinquencies: bank.dayMetrics.newDelinquencies || 0,
    defaultCount: defaults > 0 ? 1 : 0,
  };
  const portfolio = report.portfolio || BankPortfolio.portfolioSummary(bank.loanBook, bank.day);
  const service = report.service || {
    served: bank.dayMetrics.customersServed || 0,
    lost: bank.dayMetrics.customersLost || 0,
    accuracy: 0,
    perfect: 0,
    steady: 0,
    rushed: 0,
  };
  const card = document.getElementById("eventCard");
  card.classList.remove("service-active");
  const nextDebt = BankEconomy.nextDebtPayment({ ...bank, day: bank.day + 1 });
  decisionOpen = true;
  setDecisionLayerVisible(true);
  const deltaColor = dayDelta >= 0 ? "var(--green)" : "var(--red)";
  const deltaSign = dayDelta >= 0 ? "+" : "";
  const mainCause = service.lost > 0
    ? `${service.served} customers were served and ${service.lost} left the queue.`
    : defaults > 0
    ? `${fmt(defaults)} was lost to loan defaults.`
    : loanMetrics.interestIncome > rent + wages + depInt
      ? "Loan income covered the bank's daily costs."
      : bank.dayMetrics.fees > 0
        ? `Customer service earned ${fmt(bank.dayMetrics.fees)} in fees.`
        : "Rent and operating costs were the day's largest pressure.";
  card.innerHTML = `
    <div class="event-head">
      <div class="event-icon">📊</div>
      <div class="event-meta">
        <div class="type">End of Day</div>
        <div class="title">${gameDate(bank.day)} Report</div>
      </div>
    </div>
    <div class="day-result ${dayDelta >= 0 ? "positive" : "negative"}">
      <span>Today's result</span>
      <strong style="color:${deltaColor}">${deltaSign}${fmt(dayDelta)}</strong>
      <p>${mainCause}</p>
    </div>
    <div class="day-summary-grid">
      <div><span>Closing cash</span><strong>${fmt(bank.cash)}</strong></div>
      <div><span>Net capital</span><strong>${fmt(netWorth())}</strong></div>
      <div><span>Customers served</span><strong>${service.served} · goal ${BankOperations.dailyServiceGoal(bank)}</strong></div>
      <div><span>Service accuracy</span><strong>${service.accuracy}%</strong></div>
    </div>
    <div class="next-obligation"><span>Next known obligation</span><strong>${fmt(nextDebt.amount)} debt payment in ${nextDebt.dueInDays} day${nextDebt.dueInDays === 1 ? "" : "s"}</strong></div>
    ${renderTownReportThread()}
    <details class="report-details">
      <summary>View full ledger</summary>
      <div class="event-body eod-body">
        <div class="eod-row"><span class="key">Loan payments received</span><span>+${fmt(loanMetrics.received)} of ${fmt(loanMetrics.due)} due</span></div>
        <div class="eod-row"><span class="key">Loan interest earned</span><span>+${fmt(loanMetrics.interestIncome)}</span></div>
        <div class="eod-row"><span class="key">Fees earned</span><span>+${fmt(bank.dayMetrics.fees)}</span></div>
        <div class="eod-row"><span class="key">Service quality</span><span>${service.perfect} perfect · ${service.steady} steady · ${service.rushed} rushed</span></div>
        <div class="eod-row"><span class="key">Customers lost</span><span>${service.lost}</span></div>
        <div class="eod-row"><span class="key">Returning faces</span><span>${bank.dayMetrics.returningCustomers || 0}</span></div>
        <div class="eod-row"><span class="key">Deposit interest</span><span>-${fmt(depInt)}</span></div>
        <div class="eod-row"><span class="key">Rent & operations</span><span>-${fmt(rent)}</span></div>
        <div class="eod-row"><span class="key">Staff wages</span><span>-${fmt(wages)}</span></div>
        ${defaults ? `<div class="eod-row"><span class="key">Loan defaults</span><span>-${fmt(defaults)}</span></div>` : ""}
        ${debtPayment ? `<div class="eod-row"><span class="key">Debt principal paid</span><span>-${fmt(debtPayment)}</span></div>` : ""}
        <div class="eod-row"><span class="key">Cash movement</span><span>${cashChange >= 0 ? "+" : ""}${fmt(cashChange)}</span></div>
        <div class="eod-row"><span class="key">Loan portfolio</span><span>${fmt(portfolio.balance)} outstanding · ${fmt(portfolio.expectedLoss)} expected loss</span></div>
      </div>
    </details>
    ${renderAfterHoursTownChoice(report.townMomentId)}
    ${renderAfterHoursWorldChoice(report.afterHoursWorldEventId)}
    ${typeof renderEndOfDayReward === "function" ? renderEndOfDayReward() : ""}
    <div class="btn-row one-col">
      <button class="btn btn-green" onclick="startNextDay()" ${report.townMomentId || report.afterHoursWorldEventId ? "disabled" : ""}>${report.townMomentId || report.afterHoursWorldEventId ? "Resolve the after-hours choice to close the day" : `Open for ${gameDate(bank.day + 1)} →`}</button>
    </div>`;
  card.scrollTop = 0;
  document.getElementById("dots").innerHTML = "";
}

function showLegacyConclusion() {
  const summary = BankCampaign.legacySummary(bank, netWorth());
  if (!summary) return false;
  pauseTimers();
  decisionOpen = true;
  const body = document.getElementById("legacyBody");
  body.innerHTML = `
    <div class="legacy-heading">
      <span>Legacy established on day ${summary.victoryDay}</span>
      <h3>${summary.title}</h3>
      <p id="legacyEpilogue">${summary.epilogue}</p>
    </div>
    <div class="legacy-metrics">
      <div><span>Branches</span><strong>${summary.metrics.branches}</strong></div>
      <div><span>Network share</span><strong>${summary.metrics.networkShare.toFixed(1)}%</strong></div>
      <div><span>Net capital</span><strong>${fmt(summary.metrics.netCapital)}</strong></div>
      <div><span>Customers served</span><strong>${summary.metrics.customersServed.toLocaleString()}</strong></div>
      <div><span>World decisions</span><strong>${summary.metrics.strategicDecisions}</strong></div>
      <div><span>Operating style</span><strong>${summary.dominantPolicy}</strong></div>
    </div>
    <div class="legacy-story">
      <article><span>Strongest institution</span><strong>${summary.strongestBranch.name} · ${summary.strongestBranch.region}</strong><p>${summary.strongestBranch.marketShare.toFixed(1)}% local share and ${fmt(summary.strongestBranch.cumulativeProfit)} recorded branch earnings.</p></article>
      <article><span>The contest continues</span><strong>${summary.leadingRival.name}</strong><p>Your leading rival still operates in ${summary.leadingRival.regions} region${summary.leadingRival.regions === 1 ? "" : "s"}. Open-ended play continues with the full economy and rival simulation active.</p></article>
    </div>
    <div class="legacy-branches">
      ${summary.branches.map(branch => `<div class="legacy-branch"><strong>${branch.name}</strong><span>${branch.region} · ${branch.focus} · ${branch.policy} · ${branch.depositPricing} · ${branch.feePricing}</span><strong>${branch.marketShare.toFixed(1)}%</strong></div>`).join("")}
    </div>`;
  showAppDialog("legacyOverlay", "#legacyContinueBtn");
  BankAudio.play("victory");
  return true;
}

function showSilverCreekConclusion() {
  const summary = BankTown.summary(bank, netWorth());
  if (!summary) return false;
  pauseTimers();
  decisionOpen = true;
  document.getElementById("legacyTitle").textContent = "The Silver Creek Ledger";
  document.getElementById("legacyContinueBtn").textContent = "Continue in Silver Creek";
  const body = document.getElementById("legacyBody");
  body.innerHTML = `
    <div class="legacy-heading">
      <span>Seven days of names, risks, and promises</span>
      <h3>${summary.title}</h3>
      <p id="legacyEpilogue">${summary.styleSummary}</p>
    </div>
    <div class="legacy-metrics">
      <div><span>Closing net capital</span><strong>${fmt(summary.metrics.netCapital)}</strong></div>
      <div><span>Customers served</span><strong>${summary.metrics.customersServed}</strong></div>
      <div><span>Familiar neighbors</span><strong>${summary.metrics.knownCustomers}</strong></div>
      <div><span>Trusted relationships</span><strong>${summary.metrics.trustedCustomers}</strong></div>
      <div><span>Loans prepared</span><strong>${summary.metrics.loansPrepared}</strong></div>
      <div><span>Perfect service</span><strong>${summary.metrics.perfectServices}</strong></div>
    </div>
    <div class="legacy-story silver-creek-ending">
      <article><span>Your town-defining choice</span><strong>${summary.headline}</strong><p>${summary.epilogue}</p></article>
      <article><span>What the ledger cannot measure</span><strong>The counter remembers</strong><p>Carmen, Elena, Hiro, Liam, Grace, and Samir will keep returning. Their histories—and the mill loan—continue in open-ended play.</p></article>
    </div>`;
  showAppDialog("legacyOverlay", "#legacyContinueBtn");
  BankAudio.play("victory");
  return true;
}

function maybeShowCampaignConclusion() {
  if (BankTown.isComplete(bank) && !bank.town.acknowledged) return showSilverCreekConclusion();
  if (BankCampaign.campaignStatus(bank, netWorth()).complete && !bank.campaign.victoryAcknowledged) return showLegacyConclusion();
  return false;
}

function closeLegacyConclusion() {
  hideAppDialog("legacyOverlay", "#decisionLayer button");
  if (BankTown.isComplete(bank)) bank.town.acknowledged = true;
  else bank.campaign.victoryAcknowledged = true;
  saveGame();
  BankAudio.play("uiClose");
}

function renderServiceEvent(event, serviceState) {
  const card = document.getElementById("eventCard");
  if (!card || !event || !serviceState) return;
  const stepCount = serviceState.definition.steps.length;
  const currentStep = serviceState.definition.steps[serviceState.stepIndex];
  const completed = serviceState.judgments.map((judgment, index) =>
    `<li class="done ${judgment.id}"><span>${index + 1}</span>${serviceState.definition.steps[index]}<strong>${judgment.label}</strong></li>`
  ).join("");
  const upcoming = serviceState.definition.steps.slice(serviceState.stepIndex + 1).map((step, offset) =>
    `<li><span>${serviceState.stepIndex + offset + 2}</span>${step}</li>`
  ).join("");
  card.classList.add("service-active");
  card.innerHTML = `
    <div class="event-head service-head">
      <div class="event-icon">${serviceState.definition.icon}</div>
      <div class="event-meta">
        <div class="type">Live service · Step ${serviceState.stepIndex + 1} of ${stepCount}</div>
        <div class="title">${event.title}</div>
      </div>
      <span class="service-request-label">${serviceState.definition.label}${event.summary?.amount ? ` · ${event.summary.amount}` : ""}</span>
    </div>
    <p class="service-customer-need">${event.story || "A customer is waiting at the wicket."}</p>
    <ol class="service-step-list">
      ${completed}
      <li class="current"><span>${serviceState.stepIndex + 1}</span>${currentStep}<strong>Now</strong></li>
      ${upcoming}
    </ol>
    <div class="service-timing-wrap">
      <div class="service-timing-copy"><strong>${currentStep}</strong><span>Tap inside the green zone</span></div>
      <div class="service-timing-track" aria-label="Timing bar">
        <div class="service-timing-good" style="left:${(serviceState.target - 0.16) * 100}%;width:32%"></div>
        <div class="service-timing-perfect" style="left:${(serviceState.target - 0.065) * 100}%;width:13%"></div>
        <div class="service-timing-marker" id="serviceTimingMarker" style="left:${serviceState.position * 100}%"></div>
      </div>
      <div class="service-hit-feedback" id="serviceHitFeedback" aria-live="polite"></div>
    </div>
    <button class="btn btn-green service-action-btn" onclick="performServiceStep()">Do it now</button>
    <div class="service-quality-key"><span>Perfect: bonus fee + standing</span><span>Misses still progress</span></div>`;
  card.scrollTop = 0;
}

function renderEvent() {
  const card = document.getElementById("eventCard");
  card.classList.remove("service-active");
  const activeCustomer = branchState?.customers?.find(c => c.id === branchState.activeDecisionCustomerId);
  const ev = activeCustomer?.event || queue[qIdx];

  if (!ev) {
    card.innerHTML = "";
    document.getElementById("dots").innerHTML = "";
    return;
  }

  const ok = ev.canApprove();
  const approveAction = activeCustomer
    ? `resolveCustomer(${activeCustomer.id}, 'approve')`
    : "act('approve')";
  const denyAction = activeCustomer
    ? `resolveCustomer(${activeCustomer.id}, 'deny')`
    : "act('deny')";

  const summary = eventSummary(ev);
  const detailsHtml = [
    { key: "Purpose", val: summary.purpose },
    { key: "Amount", val: summary.amount },
    { key: "Risk", val: summary.risk, cls: summary.riskClass },
  ].map(d =>
    `<div class="detail-row">
       <span class="key">${d.key}</span>
       <span class="val ${d.cls||''}">${d.val}</span>
     </div>`
  ).join("");

  const cantHtml = (!ok && ev.cantMsg) ? `<div class="cant-fund">${ev.cantMsg}</div>` : "";
  const preview = ev.choicePreview || {};
  const btnsHtml = ev.single
    ? `<div class="routine-service"><span>Routine service</span><strong>No strategic tradeoff</strong></div>
       <div class="btn-row two-col event-actions">
         <button class="btn btn-small btn-blue" onclick="openEventInfo()">View details</button>
         <button class="btn btn-green" onclick="${approveAction}">${ev.approveLabel}</button>
       </div>`
    : `${cantHtml}
       <div class="choice-grid" aria-label="Decision options">
         <button class="choice-card ${preview.deny?.tone || "neutral"}" onclick="${denyAction}">
           <span>${preview.deny?.title || "Decline"}</span>
           <strong>${ev.denyLabel}</strong>
           <small>${preview.deny?.summary || "Keep the bank's cash and avoid the immediate risk."}</small>
         </button>
         <button class="choice-card ${preview.approve?.tone || "balanced"}" onclick="${approveAction}" ${!ok?"disabled":""}>
           <span>${preview.approve?.title || "Accept"}</span>
           <strong>${ev.approveLabel}</strong>
           <small>${preview.approve?.summary || "Accept the immediate cost and its possible reward."}</small>
         </button>
       </div>
       <button class="event-more-link" onclick="openEventInfo()">Review the full file</button>`;

  const relationshipHtml = ev.relationship
    ? `<div class="relationship-note ${ev.relationship.isReturning ? "returning" : "new"}">
         <span>${ev.relationship.isReturning ? "Known customer" : "New customer"}</span>
         <strong>${ev.relationship.text}</strong>
       </div>`
    : "";

  card.innerHTML = `
    <div class="event-head">
      <div class="event-icon">${ev.icon}</div>
      <div class="event-meta">
        <div class="type">${ev.eventType}</div>
        <div class="title">${ev.title}</div>
      </div>
    </div>
    ${relationshipHtml}
    <p class="event-story">${ev.story || `${ev.title} has come to the counter.`}</p>
    <div class="event-body">${detailsHtml}</div>
    ${btnsHtml}`;

  card.scrollTop = 0;
  renderDots();
}

function eventSummary(ev) {
  if (ev.summary) return ev.summary;
  const find = key => ev.details?.find(d => d.key.toLowerCase() === key)?.val || "N/A";
  const risk = ev.details?.find(d => d.key.toLowerCase() === "risk");
  return {
    purpose: find("purpose"),
    amount: find("amount"),
    risk: risk?.val || "MEDIUM",
    riskClass: risk?.cls || "yellow",
  };
}

function activeEvent() {
  const activeCustomer = branchState?.customers?.find(c => c.id === branchState.activeDecisionCustomerId);
  return activeCustomer?.event || queue[qIdx];
}

function openEventInfo() {
  const ev = activeEvent();
  if (!ev) return;
  const body = document.getElementById("eventInfoBody");
  const details = ev.details?.map(d =>
    `<div class="event-info-row"><span>${d.key}</span><span class="${d.cls || ""}">${d.val}</span></div>`
  ).join("") || "";
  const relationship = ev.relationship
    ? `<div class="event-info-relationship"><span>Relationship</span><strong>${ev.relationship.text}</strong></div>`
    : "";
  body.innerHTML = `
    <div class="event-info-body">
      <p>${ev.eventType}: <strong>${ev.title}</strong></p>
      ${relationship}
      <div class="event-info-list">${details}</div>
    </div>`;
  showAppDialog("eventInfoOverlay", ".menu-close-btn");
}

function closeEventInfo() {
  hideAppDialog("eventInfoOverlay", "#decisionLayer button");
}

function showOverlay(kind, icon, title, body, statsHtml) {
  stopTimers();
  decisionOpen = true;
  document.getElementById("overlayIcon").textContent  = icon;
  document.getElementById("overlayTitle").textContent = title;
  document.getElementById("overlayTitle").className   = `overlay-title ${kind}`;
  document.getElementById("overlayBody").textContent  = body;
  document.getElementById("overlayStats").innerHTML   = statsHtml;
  showAppDialog("overlay", "button");
  BankAudio.play(kind === "win" ? "victory" : "failure");
}

function addLog(msg, kind) {
  const list = document.getElementById("logList");
  const el   = document.createElement("div");
  el.className = `log-item ${kind}`;
  el.innerHTML = `<div class="day-tag">${gameDate(bank.day)}</div>${msg}`;
  list.prepend(el);
  while (list.children.length > 25) list.removeChild(list.lastChild);
}
