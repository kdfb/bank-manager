// Regional campaign, branch network, and deterministic off-screen simulation.
(function exposeCampaign(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BankCampaign = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCampaign() {
  const REGIONS = Object.freeze({
    silver_creek: Object.freeze({
      id: "silver_creek", label: "Silver Creek", territory: "Frontier County", icon: "SC",
      description: "The original mining and ranching town: familiar demand, middling costs, and lively competition.",
      demand: 1, rent: 20, crime: 1.1, growth: 1.05, setupCost: 0, prestigeRequired: 0,
    }),
    red_mesa: Object.freeze({
      id: "red_mesa", label: "Red Mesa", territory: "Cattle Country", icon: "RM",
      description: "Fast-growing ranch country with strong seasonal credit demand and elevated frontier losses.",
      demand: 1.08, rent: 23, crime: 1.3, growth: 1.09, setupCost: 1_800, prestigeRequired: 1,
    }),
    ironwood: Object.freeze({
      id: "ironwood", label: "Ironwood", territory: "Northern Timberlands", icon: "IW",
      description: "A steady mill town with larger commercial accounts, higher wages, and lower crime.",
      demand: 1.2, rent: 31, crime: 0.88, growth: 1.04, setupCost: 2_600, prestigeRequired: 2,
    }),
    port_mercy: Object.freeze({
      id: "port_mercy", label: "Port Mercy", territory: "Western Coast", icon: "PM",
      description: "A costly trade port where enterprise deposits and ambitious rivals move quickly.",
      demand: 1.45, rent: 44, crime: 1.02, growth: 1.12, setupCost: 4_000, prestigeRequired: 3,
    }),
  });

  const POLICIES = Object.freeze({
    conservative: Object.freeze({ label: "Conservative", loanDemand: 0.7, lossRate: 0.00035, reserveRatio: 0.28, shareGrowth: 0.8 }),
    balanced: Object.freeze({ label: "Balanced", loanDemand: 1, lossRate: 0.00075, reserveRatio: 0.22, shareGrowth: 1.05 }),
    growth: Object.freeze({ label: "Growth", loanDemand: 1.35, lossRate: 0.0018, reserveRatio: 0.16, shareGrowth: 1.8 }),
  });

  const FOCUSES = Object.freeze({
    community: Object.freeze({ label: "Community", demand: 1, deposits: 1.08, loans: 0.9, fees: 0.9 }),
    business: Object.freeze({ label: "Business", demand: 0.95, deposits: 0.95, loans: 1.22, fees: 1.18 }),
    wealth: Object.freeze({ label: "Wealth", demand: 0.8, deposits: 1.38, loans: 0.72, fees: 1.35 }),
  });

  const DEPOSIT_PRICING = Object.freeze({
    margin: Object.freeze({
      label: "Protect Margin", depositDemand: 0.78, interestCost: 0.65, customerDemand: 0.96, marketShareDaily: -0.04,
      description: "Pay less for deposits. Funding costs fall, but deposit growth and local share weaken.",
    }),
    market: Object.freeze({
      label: "Market Rate", depositDemand: 1, interestCost: 1, customerDemand: 1, marketShareDaily: 0,
      description: "Match prevailing deposit rates for balanced funding growth and interest expense.",
    }),
    attract: Object.freeze({
      label: "Attract Deposits", depositDemand: 1.28, interestCost: 1.65, customerDemand: 1.06, marketShareDaily: 0.05,
      description: "Offer a leading rate. Deposits and share grow faster, with substantially higher funding cost.",
    }),
  });

  const FEE_PRICING = Object.freeze({
    accessible: Object.freeze({
      label: "Accessible Fees", feeMultiplier: 0.7, customerDemand: 1.15, marketShareDaily: 0.04,
      description: "Charge less to win routine business and market share at lower revenue per service.",
    }),
    standard: Object.freeze({
      label: "Standard Fees", feeMultiplier: 1, customerDemand: 1, marketShareDaily: 0,
      description: "Use balanced service charges with no additional demand or loyalty effect.",
    }),
    premium: Object.freeze({
      label: "Premium Fees", feeMultiplier: 1.5, customerDemand: 0.82, marketShareDaily: -0.05,
      description: "Earn more per service while accepting fewer customers and gradual share pressure.",
    }),
  });

  const RIVAL_DEFINITIONS = Object.freeze({
    continental: Object.freeze({
      id: "continental", name: "Continental Trust", initials: "CT", color: "#d66b4f",
      strategy: "Deposit aggressor", description: "Pays for rapid deposit growth, then uses its funding advantage to enter high-growth markets.",
      cadence: 3, offset: 0, expansionInterval: 10, startingCapital: 8_200,
      initialShares: Object.freeze({ silver_creek: 16, port_mercy: 13 }),
      action: Object.freeze({ id: "rate_campaign", title: "Raises deposit rates", shareGain: 0.28, playerLoss: 0.11, cost: 38 }),
    }),
    pioneer: Object.freeze({
      id: "pioneer", name: "Pioneer Mutual", initials: "PM", color: "#cfad58",
      strategy: "Community network", description: "Builds slowly through household loyalty and targets underserved frontier towns.",
      cadence: 4, offset: 1, expansionInterval: 12, startingCapital: 5_900,
      initialShares: Object.freeze({ red_mesa: 18, silver_creek: 9 }),
      action: Object.freeze({ id: "community_drive", title: "Funds a community drive", shareGain: 0.2, playerLoss: 0.07, cost: 24 }),
    }),
    iron_crown: Object.freeze({
      id: "iron_crown", name: "Iron Crown Bank", initials: "IC", color: "#7aa5b2",
      strategy: "Commercial specialist", description: "Chases large borrowers and concentrates capital in timber, rail, and port commerce.",
      cadence: 5, offset: 2, expansionInterval: 14, startingCapital: 7_100,
      initialShares: Object.freeze({ ironwood: 21, port_mercy: 8 }),
      action: Object.freeze({ id: "commercial_push", title: "Courts commercial accounts", shareGain: 0.24, playerLoss: 0.09, cost: 31 }),
    }),
  });

  const CAMPAIGN_GOALS = Object.freeze([
    Object.freeze({ id: "foundation", title: "Build a trusted foundation", description: "Serve 10 customers and reach 62 standing.", requirements: Object.freeze({ served: 10, rep: 62 }) }),
    Object.freeze({ id: "institution", title: "Become a county institution", description: "Reach County Bank prestige with $1,800 net capital.", requirements: Object.freeze({ prestige: 2, netCapital: 1_800 }) }),
    Object.freeze({ id: "network", title: "Open the regional network", description: "Operate two branches and hold 10% consolidated market share.", requirements: Object.freeze({ branches: 2, networkShare: 10 }) }),
    Object.freeze({ id: "territory", title: "Command the territory", description: "Operate three branches with $7,500 net capital and 14% network share.", requirements: Object.freeze({ branches: 3, netCapital: 7_500, networkShare: 14 }) }),
    Object.freeze({ id: "legacy", title: "Establish a banking legacy", description: "Reach Territorial Bank prestige and operate all four regions profitably.", requirements: Object.freeze({ prestige: 3, branches: 4, profitableBranches: 3 }) }),
  ]);

  function cloneData(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function makeHeadquarters(bank) {
    return {
      id: "silver-creek-hq", regionId: "silver_creek", name: "Silver Creek Headquarters",
      openedDay: 1, active: true, policy: bank.lendingPolicy || "balanced", focus: "community",
      depositPricing: DEPOSIT_PRICING[bank.depositPricing] ? bank.depositPricing : "market",
      feePricing: FEE_PRICING[bank.feePricing] ? bank.feePricing : "standard",
      cash: Number(bank.cash) || 0, deposits: Number(bank.deposits) || 0, loans: Number(bank.loansOut) || 0,
      loanBook: cloneData(bank.loanBook || []), staff: cloneData(bank.staff || []), upgrades: cloneData(bank.upgrades || {}),
      localState: null,
      marketShare: Number(bank.marketShare) || 8, cumulativeProfit: Number(bank.profit) || 0,
    };
  }

  function makeRival(definition) {
    return {
      id: definition.id,
      capital: definition.startingCapital,
      shares: { ...definition.initialShares },
      openedRegions: Object.keys(definition.initialShares),
      lastAction: null,
      totalActions: 0,
    };
  }

  function migrateRivals(bank) {
    const existing = Array.isArray(bank.campaign.rivals) ? bank.campaign.rivals : [];
    bank.campaign.rivals = Object.values(RIVAL_DEFINITIONS).map(definition => {
      const saved = existing.find(rival => rival.id === definition.id) || makeRival(definition);
      const shares = {};
      for (const [regionId, value] of Object.entries(saved.shares || definition.initialShares)) {
        if (REGIONS[regionId]) shares[regionId] = Math.max(0, Math.min(55, Number(value) || 0));
      }
      if (definition.id === "continental" && !Number.isFinite(Number(shares.silver_creek))) {
        shares.silver_creek = Math.max(1, Number(bank.rivalShare) || 16);
      }
      const openedRegions = [...new Set([...(saved.openedRegions || []), ...Object.keys(shares)])].filter(id => REGIONS[id]);
      return {
        id: definition.id,
        capital: Math.max(0, Number(saved.capital) || definition.startingCapital),
        shares,
        openedRegions,
        lastAction: saved.lastAction || null,
        totalActions: Math.max(0, Number(saved.totalActions) || 0),
      };
    });
    bank.campaign.rivalHistory = Array.isArray(bank.campaign.rivalHistory)
      ? bank.campaign.rivalHistory.filter(entry => entry && RIVAL_DEFINITIONS[entry.rivalId]).slice(-40)
      : [];
    return bank.campaign.rivals;
  }

  function branchEquity(branch) {
    if (branch.active) return 0;
    return (Number(branch.cash) || 0) + (Number(branch.loans) || 0) - (Number(branch.deposits) || 0);
  }

  function syncBranchAssets(bank) {
    bank.branchAssets = bank.campaign.branches.reduce((sum, branch) => sum + branchEquity(branch), 0);
    return bank.branchAssets;
  }

  function migrateCampaign(bank) {
    bank.campaign = bank.campaign && typeof bank.campaign === "object" ? bank.campaign : {};
    let branches = Array.isArray(bank.campaign.branches) ? bank.campaign.branches : [];
    if (!branches.some(branch => branch.active)) branches.unshift(makeHeadquarters(bank));
    branches = branches.filter(branch => REGIONS[branch.regionId]).map((branch, index) => ({
      id: String(branch.id || `${branch.regionId}-${index + 1}`),
      regionId: branch.regionId,
      name: String(branch.name || `${REGIONS[branch.regionId].label} Branch`),
      openedDay: Math.max(1, Number(branch.openedDay) || bank.day || 1),
      active: Boolean(branch.active),
      policy: POLICIES[branch.policy] ? branch.policy : "balanced",
      focus: FOCUSES[branch.focus] ? branch.focus : "community",
      depositPricing: DEPOSIT_PRICING[branch.depositPricing] ? branch.depositPricing : "market",
      feePricing: FEE_PRICING[branch.feePricing] ? branch.feePricing : "standard",
      cash: Math.max(0, Number(branch.cash) || 0),
      deposits: Math.max(0, Number(branch.deposits) || 0),
      loans: Math.max(0, Number(branch.loans) || 0),
      loanBook: Array.isArray(branch.loanBook) ? cloneData(branch.loanBook) : [],
      staff: Array.isArray(branch.staff) ? cloneData(branch.staff) : [],
      upgrades: branch.upgrades && typeof branch.upgrades === "object" ? cloneData(branch.upgrades) : {},
      localState: branch.localState && typeof branch.localState === "object" ? cloneData(branch.localState) : null,
      marketShare: Math.max(1, Number(branch.marketShare) || 5),
      rivalShare: Math.max(1, Number(branch.rivalShare) || 18),
      cumulativeProfit: Number(branch.cumulativeProfit) || 0,
      profitableDays: Math.max(0, Number(branch.profitableDays) || 0),
      lastResult: branch.lastResult || null,
    }));
    const active = branches.find(branch => branch.active);
    active.regionId = bank.locationId || "silver_creek";
    active.marketShare = Number(bank.marketShare) || active.marketShare;
    active.policy = bank.lendingPolicy || active.policy;
    active.depositPricing = DEPOSIT_PRICING[bank.depositPricing] ? bank.depositPricing : active.depositPricing;
    active.feePricing = FEE_PRICING[bank.feePricing] ? bank.feePricing : active.feePricing;
    active.cash = Math.max(0, Number(bank.cash) || 0);
    active.deposits = Math.max(0, Number(bank.deposits) || 0);
    active.loans = Math.max(0, Number(bank.loansOut) || 0);
    active.loanBook = cloneData(bank.loanBook || []);
    active.staff = cloneData(bank.staff || []);
    active.upgrades = cloneData(bank.upgrades || {});
    bank.depositPricing = active.depositPricing;
    bank.feePricing = active.feePricing;
    bank.campaign.branches = branches;
    bank.campaign.history = Array.isArray(bank.campaign.history) ? bank.campaign.history.slice(-30) : [];
    bank.campaign.completedGoals = Array.isArray(bank.campaign.completedGoals) ? bank.campaign.completedGoals : [];
    bank.campaign.victoryDay = Number(bank.campaign.victoryDay) || null;
    bank.campaign.victoryAcknowledged = Boolean(bank.campaign.victoryAcknowledged);
    bank.campaign.nextActiveBranchId = branches.some(branch => branch.id === bank.campaign.nextActiveBranchId)
      ? bank.campaign.nextActiveBranchId
      : null;
    migrateRivals(bank);
    syncBranchAssets(bank);
    return bank;
  }

  function activeBranch(bank) {
    migrateCampaign(bank);
    return bank.campaign.branches.find(branch => branch.active);
  }

  function captureActiveBranch(bank, localState = undefined) {
    migrateCampaign(bank);
    const branch = bank.campaign.branches.find(entry => entry.active);
    if (!branch) return null;
    branch.cash = Math.max(0, Number(bank.cash) || 0);
    branch.deposits = Math.max(0, Number(bank.deposits) || 0);
    branch.loans = Math.max(0, Number(bank.loansOut) || 0);
    branch.loanBook = cloneData(bank.loanBook || []);
    branch.staff = cloneData(bank.staff || []);
    branch.upgrades = cloneData(bank.upgrades || {});
    branch.policy = bank.lendingPolicy || branch.policy;
    branch.depositPricing = DEPOSIT_PRICING[bank.depositPricing] ? bank.depositPricing : branch.depositPricing;
    branch.feePricing = FEE_PRICING[bank.feePricing] ? bank.feePricing : branch.feePricing;
    branch.marketShare = Number(bank.marketShare) || branch.marketShare;
    if (localState !== undefined) branch.localState = cloneData(localState);
    return branch;
  }

  function syntheticLoanBook(branch, day) {
    if (!(branch.loans > 0)) return [];
    const termDays = 24;
    const principal = branch.loans;
    return [{
      id: `${branch.id}-regional-pool-${day}`,
      name: `${REGIONS[branch.regionId].label} regional loan pool`,
      principal,
      risk: branch.policy === "growth" ? "high" : branch.policy === "conservative" ? "low" : "medium",
      termDays,
      daysLeft: termDays,
      dailyPay: principal / termDays * 1.015,
    }];
  }

  function scheduleBranchVisit(bank, branchId) {
    migrateCampaign(bank);
    const branch = bank.campaign.branches.find(entry => entry.id === branchId);
    if (!branch) return { ok: false, reason: "That branch is not part of the network." };
    if (branch.active) {
      bank.campaign.nextActiveBranchId = null;
      return { ok: false, reason: `${branch.name} is already under direct control.` };
    }
    bank.campaign.nextActiveBranchId = branch.id;
    return { ok: true, branch };
  }

  function cancelBranchVisit(bank) {
    migrateCampaign(bank);
    bank.campaign.nextActiveBranchId = null;
  }

  function activateScheduledBranch(bank, currentLocalState = null) {
    migrateCampaign(bank);
    const targetId = bank.campaign.nextActiveBranchId;
    if (!targetId) return { ok: false, reason: "No branch visit is scheduled." };
    const beforeCapital = consolidatedNetCapital(bank);
    captureActiveBranch(bank, currentLocalState);
    const outgoing = bank.campaign.branches.find(entry => entry.active);
    const target = bank.campaign.branches.find(entry => entry.id === targetId && !entry.active);
    if (!target) {
      bank.campaign.nextActiveBranchId = null;
      return { ok: false, reason: "The scheduled branch is unavailable." };
    }
    outgoing.active = false;
    target.active = true;
    bank.locationId = target.regionId;
    bank.cash = target.cash;
    bank.deposits = target.deposits;
    bank.loanBook = target.loanBook.length ? cloneData(target.loanBook) : syntheticLoanBook(target, bank.day);
    bank.loansOut = target.loans;
    bank.staff = cloneData(target.staff);
    bank.upgrades = cloneData(target.upgrades);
    bank.lendingPolicy = target.policy;
    bank.depositPricing = target.depositPricing;
    bank.feePricing = target.feePricing;
    bank.marketShare = target.marketShare;
    bank.rivalShare = target.rivalShare;
    bank.campaign.nextActiveBranchId = null;
    syncBranchAssets(bank);
    const afterCapital = consolidatedNetCapital(bank);
    return {
      ok: true, outgoing, branch: target, localState: cloneData(target.localState),
      capitalBefore: beforeCapital, capitalAfter: afterCapital, capitalDelta: afterCapital - beforeCapital,
    };
  }

  function recordActiveBranchDay(bank, profitDelta) {
    const branch = captureActiveBranch(bank);
    if (!branch) return null;
    branch.cumulativeProfit += Number(profitDelta) || 0;
    if (profitDelta > 0) branch.profitableDays += 1;
    return branch;
  }

  function networkCash(bank) {
    migrateCampaign(bank);
    return (Number(bank.cash) || 0) + bank.campaign.branches
      .filter(branch => !branch.active)
      .reduce((sum, branch) => sum + (Number(branch.cash) || 0), 0);
  }

  function coverActiveShortfall(bank) {
    if (!(bank.cash < 0)) return { ok: true, amount: 0 };
    let remaining = -bank.cash;
    const requested = remaining;
    bank.cash = 0;
    const sources = (bank.campaign?.branches || [])
      .filter(branch => !branch.active)
      .sort((a, b) => (a.regionId === "silver_creek" ? -1 : b.regionId === "silver_creek" ? 1 : b.cash - a.cash));
    for (const branch of sources) {
      if (remaining <= 0) break;
      const used = Math.min(Math.max(0, branch.cash), remaining);
      branch.cash -= used;
      remaining -= used;
    }
    if (remaining > 0) bank.cash = -remaining;
    syncBranchAssets(bank);
    return { ok: remaining <= 0.001, amount: requested - remaining, uncovered: remaining };
  }

  function withdrawNetworkCash(bank, amount) {
    const coverage = coverActiveShortfall(bank);
    if (!coverage.ok) return { ok: false, amount: 0 };
    migrateCampaign(bank);
    let remaining = Math.max(0, Number(amount) || 0);
    const requested = remaining;
    const availableCash = (Number(bank.cash) || 0) + bank.campaign.branches
      .filter(branch => !branch.active)
      .reduce((sum, branch) => sum + (Number(branch.cash) || 0), 0);
    if (availableCash < remaining) return { ok: false, amount: 0 };
    const sources = bank.campaign.branches.slice().sort((a, b) => {
      if (a.regionId === "silver_creek") return -1;
      if (b.regionId === "silver_creek") return 1;
      return Number(b.cash) - Number(a.cash);
    });
    for (const branch of sources) {
      if (remaining <= 0) break;
      const available = Math.max(0, branch.active ? bank.cash : branch.cash);
      const used = Math.min(available, remaining);
      if (branch.active) {
        bank.cash -= used;
        branch.cash = bank.cash;
      } else branch.cash -= used;
      remaining -= used;
    }
    syncBranchAssets(bank);
    return { ok: remaining <= 0.001, amount: requested - remaining };
  }

  function playerShareInRegion(bank, regionId) {
    const branch = bank.campaign.branches.find(entry => entry.regionId === regionId);
    if (!branch) return 0;
    return branch.active ? Number(bank.marketShare) || 0 : Number(branch.marketShare) || 0;
  }

  function regionalCompetition(bank, regionId) {
    migrateCampaign(bank);
    const rivals = bank.campaign.rivals.map(rival => ({
      ...RIVAL_DEFINITIONS[rival.id],
      share: Number(rival.shares[regionId]) || 0,
      present: rival.openedRegions.includes(regionId),
      capital: rival.capital,
      lastAction: rival.lastAction,
    })).sort((a, b) => b.share - a.share);
    const playerShare = playerShareInRegion(bank, regionId);
    const claimed = playerShare + rivals.reduce((sum, rival) => sum + rival.share, 0);
    return {
      region: REGIONS[regionId], playerShare, rivals,
      leader: rivals[0]?.share > playerShare ? rivals[0] : null,
      openMarket: Math.max(0, 100 - claimed),
    };
  }

  function expansionTarget(bank, rival) {
    const definition = RIVAL_DEFINITIONS[rival.id];
    const candidates = Object.values(REGIONS).filter(region => !rival.openedRegions.includes(region.id));
    if (!candidates.length) return null;
    return candidates.sort((a, b) => {
      const aPlayer = playerShareInRegion(bank, a.id) > 0 ? 0.45 : 0;
      const bPlayer = playerShareInRegion(bank, b.id) > 0 ? 0.45 : 0;
      const aAffinity = definition.id === "pioneer" && a.id === "red_mesa" ? 0.3 : definition.id === "iron_crown" && ["ironwood", "port_mercy"].includes(a.id) ? 0.3 : 0;
      const bAffinity = definition.id === "pioneer" && b.id === "red_mesa" ? 0.3 : definition.id === "iron_crown" && ["ironwood", "port_mercy"].includes(b.id) ? 0.3 : 0;
      return (b.demand * b.growth + bPlayer + bAffinity - b.setupCost / 20_000)
        - (a.demand * a.growth + aPlayer + aAffinity - a.setupCost / 20_000);
    })[0];
  }

  function campaignTarget(bank, rival) {
    const candidates = rival.openedRegions.map(regionId => ({
      regionId,
      playerShare: playerShareInRegion(bank, regionId),
      rivalShare: rival.shares[regionId] || 0,
      growth: REGIONS[regionId].growth,
    }));
    return candidates.sort((a, b) => (b.playerShare * 1.5 + b.growth + b.rivalShare * 0.1)
      - (a.playerShare * 1.5 + a.growth + a.rivalShare * 0.1))[0]?.regionId || null;
  }

  function applyPlayerShareLoss(bank, regionId, amount) {
    const branch = bank.campaign.branches.find(entry => entry.regionId === regionId);
    if (!branch || amount <= 0) return 0;
    if (branch.active) {
      const before = bank.marketShare;
      bank.marketShare = Math.max(1, bank.marketShare - amount);
      branch.marketShare = bank.marketShare;
      return before - bank.marketShare;
    }
    const before = branch.marketShare;
    branch.marketShare = Math.max(1, branch.marketShare - amount);
    return before - branch.marketShare;
  }

  function adjustRivalShare(bank, rivalId, regionId, delta) {
    migrateCampaign(bank);
    const rival = bank.campaign.rivals.find(entry => entry.id === rivalId);
    if (!rival || !REGIONS[regionId]) return 0;
    if (!rival.openedRegions.includes(regionId)) rival.openedRegions.push(regionId);
    rival.shares[regionId] = Math.max(0, Math.min(55, (rival.shares[regionId] || 0) + (Number(delta) || 0)));
    if (regionId === (bank.locationId || "silver_creek")) {
      bank.rivalShare = regionalCompetition(bank, regionId).rivals[0]?.share || 1;
    }
    return rival.shares[regionId];
  }

  function recordRivalAction(bank, rival, action) {
    rival.lastAction = action;
    rival.totalActions += 1;
    bank.campaign.rivalHistory.push(action);
    bank.campaign.rivalHistory = bank.campaign.rivalHistory.slice(-40);
    return action;
  }

  function simulateRivalDay(bank, options = {}) {
    migrateCampaign(bank);
    const growthMultiplier = Math.max(0.5, Number(options.rivalGrowth) || 1);
    const actions = [];
    for (const rival of bank.campaign.rivals) {
      const definition = RIVAL_DEFINITIONS[rival.id];
      const operatingIncome = Math.round(Object.values(rival.shares).reduce((sum, share) => sum + share, 0) * 1.6);
      const operatingCost = 18 + rival.openedRegions.length * 9;
      rival.capital = Math.max(0, rival.capital + operatingIncome - operatingCost);

      const expansionDue = bank.day >= 6 && (bank.day + definition.offset) % definition.expansionInterval === 0;
      const target = expansionDue ? expansionTarget(bank, rival) : null;
      if (target && rival.capital >= target.setupCost * 0.65) {
        const cost = Math.round(target.setupCost * 0.65 + 300);
        rival.capital -= cost;
        rival.openedRegions.push(target.id);
        rival.shares[target.id] = 3.5;
        const playerLoss = applyPlayerShareLoss(bank, target.id, 0.18 * growthMultiplier);
        actions.push(recordRivalAction(bank, rival, {
          day: bank.day, rivalId: rival.id, type: "expansion", regionId: target.id,
          title: `Opens ${/^[aeiou]/i.test(target.label) ? "an" : "a"} ${target.label} branch`, detail: `${definition.name} committed $${cost.toLocaleString()} to enter ${target.label}.`,
          shareGain: 3.5, playerLoss,
        }));
        continue;
      }

      if ((bank.day + definition.offset) % definition.cadence !== 0) continue;
      const regionId = campaignTarget(bank, rival);
      if (!regionId || rival.capital < definition.action.cost) continue;
      const gain = definition.action.shareGain * growthMultiplier * REGIONS[regionId].growth;
      const playerLoss = applyPlayerShareLoss(bank, regionId, definition.action.playerLoss * growthMultiplier);
      rival.shares[regionId] = Math.min(55, (rival.shares[regionId] || 0) + gain);
      rival.capital -= definition.action.cost;
      actions.push(recordRivalAction(bank, rival, {
        day: bank.day, rivalId: rival.id, type: definition.action.id, regionId,
        title: definition.action.title,
        detail: `${definition.name} pressed its ${definition.strategy.toLowerCase()} strategy in ${REGIONS[regionId].label}.`,
        shareGain: gain, playerLoss,
      }));
    }
    const activeCompetition = regionalCompetition(bank, bank.locationId || "silver_creek");
    bank.rivalShare = activeCompetition.rivals[0]?.share || 1;
    for (const branch of bank.campaign.branches) {
      branch.rivalShare = regionalCompetition(bank, branch.regionId).rivals[0]?.share || 1;
    }
    return { actions, rivals: bank.campaign.rivals, activeLeader: activeCompetition.rivals[0] || null };
  }

  function regionBranch(bank, regionId) {
    migrateCampaign(bank);
    return bank.campaign.branches.find(branch => branch.regionId === regionId) || null;
  }

  function canOpenBranch(bank, regionId, allocation = 500) {
    migrateCampaign(bank);
    const region = REGIONS[regionId];
    if (!region || region.id === "silver_creek") return { ok: false, reason: "That region is unavailable." };
    if (regionBranch(bank, regionId)) return { ok: false, reason: "A branch already operates in this region." };
    if ((bank.prestigeLevel || 0) < region.prestigeRequired) return { ok: false, reason: `Requires prestige level ${region.prestigeRequired}.` };
    const capital = Math.max(250, Number(allocation) || 500);
    if (networkCash(bank) < region.setupCost + capital) return { ok: false, reason: `Requires $${(region.setupCost + capital).toLocaleString()} network cash.` };
    return { ok: true, region, allocation: capital, totalCash: region.setupCost + capital };
  }

  function openBranch(bank, regionId, allocation = 500) {
    const check = canOpenBranch(bank, regionId, allocation);
    if (!check.ok) return check;
    const { region } = check;
    const branch = {
      id: `${regionId}-${bank.day}-${bank.campaign.branches.length + 1}`,
      regionId, name: `${region.label} Branch`, openedDay: bank.day, active: false,
      policy: "balanced", focus: regionId === "ironwood" ? "business" : "community",
      depositPricing: "market", feePricing: "standard",
      cash: check.allocation, deposits: 0, loans: 0, marketShare: 4, rivalShare: 18,
      loanBook: [], staff: [], upgrades: {}, localState: null,
      cumulativeProfit: 0, profitableDays: 0, lastResult: null,
    };
    withdrawNetworkCash(bank, check.totalCash);
    bank.profit -= region.setupCost;
    bank.dayMetrics = bank.dayMetrics || {};
    bank.dayMetrics.expansionCosts = (bank.dayMetrics.expansionCosts || 0) + region.setupCost;
    bank.campaign.branches.push(branch);
    bank.campaign.history.push({ day: bank.day, type: "opened", branchId: branch.id, regionId, amount: check.totalCash });
    syncBranchAssets(bank);
    updateProgress(bank, consolidatedNetCapital(bank));
    return {
      ok: true,
      branch: bank.campaign.branches.find(entry => entry.id === branch.id),
      setupCost: region.setupCost,
      allocation: check.allocation,
    };
  }

  function transferCapital(bank, branchId, amount) {
    migrateCampaign(bank);
    const branch = bank.campaign.branches.find(entry => entry.id === branchId && !entry.active);
    const value = Math.max(0, Number(amount) || 0);
    if (!branch || value < 1) return { ok: false, reason: "Choose an operating satellite branch." };
    if (bank.cash < value) return { ok: false, reason: "The visited branch does not have enough cash." };
    bank.cash -= value;
    branch.cash += value;
    bank.campaign.history.push({ day: bank.day, type: "capital_in", branchId, amount: value });
    syncBranchAssets(bank);
    return { ok: true, amount: value, branch };
  }

  function withdrawCapital(bank, branchId, amount) {
    migrateCampaign(bank);
    const branch = bank.campaign.branches.find(entry => entry.id === branchId && !entry.active);
    const value = Math.max(0, Number(amount) || 0);
    const reserve = branch ? Math.ceil(branch.deposits * POLICIES[branch.policy].reserveRatio) : 0;
    if (!branch || value < 1) return { ok: false, reason: "Choose an operating satellite branch." };
    if (branch.cash - value < reserve) return { ok: false, reason: `The branch must retain its $${reserve.toLocaleString()} reserve.` };
    branch.cash -= value;
    bank.cash += value;
    bank.campaign.history.push({ day: bank.day, type: "capital_out", branchId, amount: value });
    syncBranchAssets(bank);
    return { ok: true, amount: value, branch };
  }

  function setBranchPolicy(bank, branchId, policy) {
    migrateCampaign(bank);
    const branch = bank.campaign.branches.find(entry => entry.id === branchId);
    if (!branch || !POLICIES[policy]) return false;
    branch.policy = policy;
    if (branch.active) bank.lendingPolicy = policy;
    return true;
  }

  function setBranchFocus(bank, branchId, focus) {
    migrateCampaign(bank);
    const branch = bank.campaign.branches.find(entry => entry.id === branchId);
    if (!branch || !FOCUSES[focus]) return false;
    branch.focus = focus;
    return true;
  }

  function setBranchDepositPricing(bank, branchId, pricing) {
    migrateCampaign(bank);
    const branch = bank.campaign.branches.find(entry => entry.id === branchId);
    if (!branch || !DEPOSIT_PRICING[pricing]) return false;
    branch.depositPricing = pricing;
    if (branch.active) bank.depositPricing = pricing;
    return true;
  }

  function setBranchFeePricing(bank, branchId, pricing) {
    migrateCampaign(bank);
    const branch = bank.campaign.branches.find(entry => entry.id === branchId);
    if (!branch || !FEE_PRICING[pricing]) return false;
    branch.feePricing = pricing;
    if (branch.active) bank.feePricing = pricing;
    return true;
  }

  function pricingEffects(depositPricing = "market", feePricing = "standard") {
    const deposit = DEPOSIT_PRICING[depositPricing] || DEPOSIT_PRICING.market;
    const fees = FEE_PRICING[feePricing] || FEE_PRICING.standard;
    return {
      depositDemand: deposit.depositDemand,
      depositInterestCost: deposit.interestCost,
      feeMultiplier: fees.feeMultiplier,
      customerDemand: deposit.customerDemand * fees.customerDemand,
      marketShareDaily: deposit.marketShareDaily + fees.marketShareDaily,
    };
  }

  function activePricingEffects(bank) {
    migrateCampaign(bank);
    return pricingEffects(bank.depositPricing, bank.feePricing);
  }

  function simulateBranchDay(branch, day) {
    const region = REGIONS[branch.regionId];
    const policy = POLICIES[branch.policy];
    const focus = FOCUSES[branch.focus];
    const pricing = pricingEffects(branch.depositPricing, branch.feePricing);
    const maturity = 1 + Math.min(0.35, Math.max(0, day - branch.openedDay) * (region.growth - 1) / 30);
    const staffWages = (branch.staff || []).reduce((sum, member) => sum + (Number(member.dailyWage) || 0), 0);
    const furnishingCapacity = (branch.upgrades?.teller_window || 0) * 0.08 + (branch.upgrades?.risk_desk || 0) * 0.06;
    const serviceCapacity = 1 + Math.min(0.95, (branch.staff || []).length * 0.22 + furnishingCapacity);
    const demandIndex = region.demand * focus.demand * pricing.customerDemand * maturity * serviceCapacity * (0.72 + branch.marketShare / 25);
    const demand = Math.max(3, demandIndex * 12);
    const newDeposits = Math.max(0, Math.round(demand * 18 * focus.deposits * pricing.depositDemand));
    const reserve = Math.ceil((branch.deposits + newDeposits) * policy.reserveRatio);
    const principalPaid = Math.min(branch.loans, Math.round(branch.loans * 0.003));
    const interest = Math.max(0, Math.round(branch.loans * 0.0018));
    const defaults = Math.min(branch.loans, Math.round(branch.loans * policy.lossRate * region.crime));
    const fees = Math.max(1, Math.round(demand * 4 * focus.fees * pricing.feeMultiplier));
    const depositInterest = Math.max(0, Math.round(branch.deposits * 0.000055 * pricing.depositInterestCost));
    const operatingCost = Math.round(region.rent + (staffWages || 16) + demand * 0.6 - (branch.upgrades?.break_room || 0) * 2);
    const lendableCash = Math.max(0, branch.cash + newDeposits + principalPaid + interest + fees - depositInterest - operatingCost - reserve);
    const originations = Math.min(lendableCash, Math.max(0, Math.round(demand * 26 * focus.loans * policy.loanDemand)));
    const profit = interest + fees - depositInterest - operatingCost - defaults;
    branch.cash += newDeposits + principalPaid + interest + fees - originations - depositInterest - operatingCost;
    branch.deposits += newDeposits;
    branch.loans = Math.max(0, branch.loans + originations - principalPaid - defaults);
    branch.cumulativeProfit += profit;
    if (profit > 0) branch.profitableDays += 1;
    branch.marketShare = Math.max(1, Math.min(40,
      branch.marketShare + demand * 0.006 * policy.shareGrowth + pricing.marketShareDaily - Math.min(0.2, defaults * 0.002)
    ));
    branch.rivalShare = Math.max(1, Math.min(45, branch.rivalShare + 0.06 + region.growth * 0.015));
    branch.lastResult = { day, demand, newDeposits, originations, principalPaid, interest, defaults, fees, depositInterest, operatingCost, profit };
    branch.loanBook = [];
    return branch.lastResult;
  }

  function simulateNetworkDay(bank, options = {}) {
    migrateCampaign(bank);
    const results = [];
    let profit = 0;
    for (const branch of bank.campaign.branches) {
      if (branch.active) {
        branch.marketShare = bank.marketShare;
        branch.policy = bank.lendingPolicy;
        branch.depositPricing = bank.depositPricing;
        branch.feePricing = bank.feePricing;
        continue;
      }
      const result = simulateBranchDay(branch, bank.day);
      results.push({ branchId: branch.id, regionId: branch.regionId, ...result });
      profit += result.profit;
    }
    bank.profit += profit;
    bank.dayMetrics = bank.dayMetrics || {};
    bank.dayMetrics.branchProfit = profit;
    bank.dayMetrics.branchCustomers = Math.round(results.reduce((sum, result) => sum + result.demand, 0));
    const competition = simulateRivalDay(bank, options);
    bank.dayMetrics.rivalActions = competition.actions.length;
    syncBranchAssets(bank);
    const progress = updateProgress(bank, consolidatedNetCapital(bank));
    return { results, profit, branchAssets: bank.branchAssets, competition, progress };
  }

  function networkShare(bank) {
    migrateCampaign(bank);
    const branches = bank.campaign.branches;
    return branches.reduce((sum, branch) => sum + (branch.active ? bank.marketShare : branch.marketShare), 0) / branches.length;
  }

  function consolidatedNetCapital(bank) {
    return (Number(bank.cash) || 0) + (Number(bank.loansOut) || 0) + (Number(bank.branchAssets) || 0)
      - (Number(bank.deposits) || 0) - (Number(bank.debt) || 0);
  }

  function requirementMetrics(bank, currentNetWorth) {
    migrateCampaign(bank);
    return {
      served: bank.stats?.customersServed || 0,
      rep: bank.rep || 0,
      prestige: bank.prestigeLevel || 0,
      netCapital: currentNetWorth,
      branches: bank.campaign.branches.length,
      networkShare: networkShare(bank),
      profitableBranches: bank.campaign.branches.filter(branch => branch.active || branch.cumulativeProfit > 0).length,
    };
  }

  function meets(requirements, metrics) {
    return Object.entries(requirements).every(([key, value]) => metrics[key] >= value);
  }

  function campaignStatus(bank, currentNetWorth) {
    const metrics = requirementMetrics(bank, currentNetWorth);
    const completed = CAMPAIGN_GOALS.filter(goal => meets(goal.requirements, metrics));
    const nextIndex = CAMPAIGN_GOALS.findIndex(goal => !meets(goal.requirements, metrics));
    const complete = nextIndex === -1;
    const current = complete ? CAMPAIGN_GOALS[CAMPAIGN_GOALS.length - 1] : CAMPAIGN_GOALS[nextIndex];
    return { current, step: complete ? CAMPAIGN_GOALS.length : nextIndex + 1, total: CAMPAIGN_GOALS.length, metrics, complete };
  }

  function updateProgress(bank, currentNetWorth) {
    const status = campaignStatus(bank, currentNetWorth);
    for (const goal of CAMPAIGN_GOALS) {
      if (!meets(goal.requirements, status.metrics) || bank.campaign.completedGoals.includes(goal.id)) continue;
      bank.campaign.completedGoals.push(goal.id);
      bank.campaign.history.push({ day: bank.day, type: "goal", goalId: goal.id });
    }
    if (status.complete && !bank.campaign.victoryDay) bank.campaign.victoryDay = bank.day;
    return campaignStatus(bank, currentNetWorth);
  }

  function leadingKey(items, key, definitions) {
    return Object.keys(definitions).reduce((best, id) => {
      const count = items.filter(item => item[key] === id).length;
      return count > best.count ? { id, count } : best;
    }, { id: Object.keys(definitions)[0], count: -1 }).id;
  }

  function legacySummary(bank, currentNetWorth) {
    const status = campaignStatus(bank, currentNetWorth);
    if (!status.complete) return null;
    const branches = bank.campaign.branches;
    const dominantFocusId = leadingKey(branches, "focus", FOCUSES);
    const dominantPolicyId = leadingKey(branches, "policy", POLICIES);
    const strongestBranch = branches.reduce((best, branch) => !best || branch.marketShare > best.marketShare ? branch : best, null);
    const leadingRival = bank.campaign.rivals.reduce((best, rival) => {
      const footprint = Object.values(rival.shares).reduce((sum, share) => sum + share, 0);
      return !best || footprint > best.footprint ? { rival, footprint } : best;
    }, null)?.rival || null;
    const profiles = {
      community: {
        title: dominantPolicyId === "conservative" ? "Steward of the Frontier" : "The People's Institution",
        epilogue: "Your branches became civic anchors: trusted with household savings, harvest loans, and the ambitions of growing towns.",
      },
      business: {
        title: dominantPolicyId === "growth" ? "Engine of Expansion" : "Builder of Commerce",
        epilogue: "Your network financed the merchants, mills, and transport links that bound the territory into a regional economy.",
      },
      wealth: {
        title: dominantPolicyId === "conservative" ? "Guardian of Capital" : "House of Opportunity",
        epilogue: "Your institution drew frontier fortunes into durable reserves and turned private capital into regional influence.",
      },
    };
    const profile = profiles[dominantFocusId];
    return {
      title: profile.title,
      epilogue: profile.epilogue,
      victoryDay: bank.campaign.victoryDay || bank.day,
      dominantFocusId,
      dominantFocus: FOCUSES[dominantFocusId].label,
      dominantPolicyId,
      dominantPolicy: POLICIES[dominantPolicyId].label,
      strongestBranch: strongestBranch ? {
        id: strongestBranch.id,
        name: strongestBranch.name,
        region: REGIONS[strongestBranch.regionId].label,
        marketShare: strongestBranch.marketShare,
        cumulativeProfit: strongestBranch.cumulativeProfit,
      } : null,
      leadingRival: leadingRival ? {
        id: leadingRival.id,
        name: RIVAL_DEFINITIONS[leadingRival.id].name,
        regions: leadingRival.openedRegions.length,
      } : null,
      metrics: {
        branches: branches.length,
        profitableBranches: status.metrics.profitableBranches,
        networkShare: status.metrics.networkShare,
        netCapital: currentNetWorth,
        customersServed: Number(bank.stats?.customersServed) || 0,
        strategicDecisions: Number(bank.stats?.worldEventsResolved) || 0,
      },
      branches: branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        region: REGIONS[branch.regionId].label,
        marketShare: branch.marketShare,
        cumulativeProfit: branch.cumulativeProfit,
        policy: POLICIES[branch.policy].label,
        focus: FOCUSES[branch.focus].label,
        depositPricing: DEPOSIT_PRICING[branch.depositPricing].label,
        feePricing: FEE_PRICING[branch.feePricing].label,
      })),
    };
  }

  return Object.freeze({
    REGIONS, POLICIES, FOCUSES, DEPOSIT_PRICING, FEE_PRICING, RIVAL_DEFINITIONS, CAMPAIGN_GOALS, migrateCampaign, migrateRivals, syncBranchAssets, branchEquity,
    activeBranch, captureActiveBranch, scheduleBranchVisit, cancelBranchVisit, activateScheduledBranch, recordActiveBranchDay, networkCash, coverActiveShortfall, withdrawNetworkCash,
    regionBranch, canOpenBranch, openBranch, transferCapital, withdrawCapital, setBranchPolicy,
    setBranchFocus, setBranchDepositPricing, setBranchFeePricing, pricingEffects, activePricingEffects,
    regionalCompetition, adjustRivalShare, simulateRivalDay, simulateBranchDay, simulateNetworkDay, networkShare, consolidatedNetCapital,
    campaignStatus, updateProgress, legacySummary,
  });
});
