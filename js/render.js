// All DOM rendering. Reads from `bank`, `queue`, `qIdx` globals.
// No game logic here — only visual updates.

function renderStats() {
  const r  = bank.rep;
  const nw = netWorth();

  document.getElementById("dayLabel").textContent     = `Day ${bank.day}`;
  document.getElementById("netWorth").textContent     = fmt(nw);
  document.getElementById("netWorth").style.color     = nw >= 0 ? "var(--green)" : "var(--red)";
  document.getElementById("statCash").textContent     = fmt(bank.cash);
  document.getElementById("statCash").style.color     =
    bank.cash < 20_000 ? "var(--red)" : bank.cash < 80_000 ? "var(--yellow)" : "var(--green)";
  document.getElementById("statLoans").textContent    = fmt(bank.loansOut);
  document.getElementById("statDeposits").textContent = fmt(bank.deposits);

  const profEl = document.getElementById("statProfit");
  profEl.textContent = fmt(bank.profit);
  profEl.style.color = bank.profit >= 0 ? "var(--green)" : "var(--red)";

  document.getElementById("statRep").textContent = `${r} / 100`;
  document.getElementById("statRep").style.color =
    r >= 50 ? "var(--green)" : r >= 30 ? "var(--yellow)" : "var(--red)";

  const fill = document.getElementById("repFill");
  fill.style.width      = `${r}%`;
  fill.style.background = r >= 50 ? "var(--green)" : r >= 30 ? "var(--yellow)" : "var(--red)";
}

function renderDots() {
  const container = document.getElementById("dots");
  container.innerHTML = queue.map((_, i) => {
    const cls = i < qIdx ? "done" : i === qIdx ? "current" : "";
    return `<div class="dot ${cls}"></div>`;
  }).join("");
}

function renderEvent() {
  const card = document.getElementById("eventCard");

  if (qIdx >= queue.length) {
    const loanIncome = bank.loanBook.reduce((s, l) => s + l.dailyPay, 0);
    const depInt     = bank.deposits * 0.000055;
    const d          = DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
    card.innerHTML = `
      <div class="event-head">
        <div class="event-icon">🌙</div>
        <div class="event-meta">
          <div class="type">End of Day</div>
          <div class="title">Day ${bank.day} Complete</div>
        </div>
      </div>
      <div class="event-body">
        <div class="eod-row"><span class="key">Loan repayments in</span><span style="color:var(--green)">+${fmt(loanIncome)}</span></div>
        <div class="eod-row"><span class="key">Deposit interest out</span><span style="color:var(--red)">−${fmt(depInt)}</span></div>
        <div class="eod-row"><span class="key">Daily overhead</span><span style="color:var(--red)">−${fmt(d.dailyOverhead)}</span></div>
      </div>
      <div class="btn-row one-col">
        <button class="btn btn-purple" onclick="advanceDay()">Next Day →</button>
      </div>`;
    document.getElementById("dots").innerHTML = "";
    return;
  }

  const ev = queue[qIdx];
  const ok = ev.canApprove();

  const detailsHtml = ev.details.map(d =>
    `<div class="detail-row">
       <span class="key">${d.key}</span>
       <span class="val ${d.cls||''}">${d.val}</span>
     </div>`
  ).join("");

  const cantHtml = (!ok && ev.cantMsg)
    ? `<div class="cant-fund">${ev.cantMsg}</div>` : "";

  const btnsHtml = ev.single
    ? `<div class="btn-row one-col">
         <button class="btn btn-green" onclick="act('approve')">${ev.approveLabel}</button>
       </div>`
    : `${cantHtml}
       <div class="btn-row two-col">
         <button class="btn btn-dark"  onclick="act('deny')">${ev.denyLabel}</button>
         <button class="btn btn-green" onclick="act('approve')" ${!ok?"disabled":""}>${ev.approveLabel}</button>
       </div>`;

  card.innerHTML = `
    <div class="ev-timer-wrap"><div class="ev-timer-fill" id="evTimerFill"></div></div>
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

function showOverlay(kind, icon, title, body, statsHtml) {
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
  el.innerHTML = `<div class="day-tag">Day ${bank.day}</div>${msg}`;
  list.prepend(el);
  while (list.children.length > 25) list.removeChild(list.lastChild);
}
