// All DOM rendering. Reads from `bank`, `queue`, `qIdx` globals.
// No game logic here — only visual updates.

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60)    return "just now";
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
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
  const repEl = document.getElementById("statRep");
  if (!dayLabel) return;

  dayLabel.textContent     = gameDate(bank.day);
  netWorthEl.textContent   = fmt(nw);
  netWorthEl.style.color   = nw >= 0 ? "var(--green)" : "var(--red)";
  cashEl.textContent       = fmt(bank.cash);
  cashEl.style.color       =
    bank.cash < 200 ? "var(--red)" : bank.cash < 800 ? "var(--yellow)" : "var(--green)";
  loansEl.textContent      = fmt(bank.loansOut);
  depositsEl.textContent   = fmt(bank.deposits);

  repEl.textContent = `${r} / 100`;
  repEl.style.color =
    r >= 50 ? "var(--green)" : r >= 30 ? "var(--yellow)" : "var(--red)";

  const fill = document.getElementById("repFill");
  fill.style.width      = `${r}%`;
  fill.style.background = r >= 50 ? "var(--green)" : r >= 30 ? "var(--yellow)" : "var(--red)";
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
function renderEndOfDay(loanIncome, depInt, overhead, dayDelta) {
  const card       = document.getElementById("eventCard");
  decisionOpen = true;
  document.getElementById("decisionLayer")?.classList.add("show");
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
    <div class="btn-row one-col">
      <button class="btn btn-purple" onclick="startNextDay()">Start ${gameDate(bank.day + 1)} →</button>
    </div>`;
  document.getElementById("dots").innerHTML = "";
}

function renderEvent() {
  const card = document.getElementById("eventCard");
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

  const btnsHtml = ev.single
    ? `<div class="btn-row two-col">
         <button class="btn btn-small btn-blue" onclick="openEventInfo()">More Info</button>
         <button class="btn btn-green" onclick="${approveAction}">${ev.approveLabel}</button>
       </div>`
    : `${cantHtml}
       <div class="btn-row three-col">
         <button class="btn btn-small btn-blue" onclick="openEventInfo()">More Info</button>
         <button class="btn btn-dark"  onclick="${denyAction}">${ev.denyLabel}</button>
         <button class="btn btn-green" onclick="${approveAction}" ${!ok?"disabled":""}>${ev.approveLabel}</button>
       </div>`;

  card.innerHTML = `
    <div class="event-head">
      <div class="event-icon">${ev.icon}</div>
      <div class="event-meta">
        <div class="type">${ev.eventType}</div>
        <div class="title">${ev.title}</div>
      </div>
    </div>
    <div class="event-body">${detailsHtml}</div>
    ${btnsHtml}`;

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
  body.innerHTML = `
    <div class="event-info-body">
      <p>${ev.eventType}: <strong>${ev.title}</strong></p>
      <div class="event-info-list">${details}</div>
    </div>`;
  document.getElementById("eventInfoOverlay")?.classList.add("show");
}

function closeEventInfo() {
  document.getElementById("eventInfoOverlay")?.classList.remove("show");
}

function showOverlay(kind, icon, title, body, statsHtml) {
  stopTimers();
  decisionOpen = true;
  document.getElementById("overlayIcon").textContent  = icon;
  document.getElementById("overlayTitle").textContent = title;
  document.getElementById("overlayTitle").className   = `overlay-title ${kind}`;
  document.getElementById("overlayBody").textContent  = body;
  document.getElementById("overlayStats").innerHTML   = statsHtml;
  document.getElementById("overlay").classList.add("show");
}

function addLog(msg, kind) {
  const list = document.getElementById("logList");
  const el   = document.createElement("div");
  el.className = `log-item ${kind}`;
  el.innerHTML = `<div class="day-tag">${gameDate(bank.day)}</div>${msg}`;
  list.prepend(el);
  while (list.children.length > 25) list.removeChild(list.lastChild);
}
