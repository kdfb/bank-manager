// Customer segments, location demographics, and prestige progression.
(function exposeMarket(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BankMarket = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMarket() {
  const SEGMENTS = Object.freeze({
    households: Object.freeze({
      id: "households", label: "Households", icon: "🏠", prestigeRequired: 0,
      description: "Families need accounts, modest loans, and dependable access to savings.",
      names: Object.freeze(["Alice Mwangi", "Carmen Reyes", "David Patel", "Grace Liu", "Hiro Tanaka", "Isabelle Morin"]),
      organizations: Object.freeze(["Morin Family Savings", "The Patel Household", "Reyes Family Fund"]),
      purposes: Object.freeze(["a home renovation", "an education fund", "a medical expense", "a family wagon"]),
      serviceWeights: Object.freeze({ account: 0.32, deposit: 0.25, withdrawal: 0.25, loan: 0.18 }),
      riskWeights: Object.freeze({ low: 0.5, medium: 0.4, high: 0.1 }),
      amountMultiplier: 0.65,
    }),
    ranchers: Object.freeze({
      id: "ranchers", label: "Ranchers & Farms", icon: "🐂", prestigeRequired: 0,
      description: "Seasonal agricultural clients bring larger deposits and equipment borrowing.",
      names: Object.freeze(["Elena Ivanova", "James Osei", "Liam Nkosi", "Keiko Sato"]),
      organizations: Object.freeze(["Green Valley Farm", "Red Mesa Ranch", "Silver Creek Growers"]),
      purposes: Object.freeze(["farm equipment", "winter feed", "a new irrigation ditch", "breeding stock"]),
      serviceWeights: Object.freeze({ account: 0.12, deposit: 0.31, withdrawal: 0.17, loan: 0.4 }),
      riskWeights: Object.freeze({ low: 0.35, medium: 0.48, high: 0.17 }),
      amountMultiplier: 1.15,
    }),
    merchants: Object.freeze({
      id: "merchants", label: "Merchants", icon: "🏪", prestigeRequired: 0,
      description: "Local businesses value transaction speed, working capital, and deposit services.",
      names: Object.freeze(["Bob Okonkwo", "Frank Johansson", "Alice Mwangi", "David Patel"]),
      organizations: Object.freeze(["Sunrise Trading Co.", "Metro Retailers", "Blue Peak Outfitters", "Johansson Mercantile"]),
      purposes: Object.freeze(["a restaurant opening", "working capital", "new inventory", "a storefront expansion"]),
      serviceWeights: Object.freeze({ account: 0.17, deposit: 0.3, withdrawal: 0.2, loan: 0.33 }),
      riskWeights: Object.freeze({ low: 0.3, medium: 0.5, high: 0.2 }),
      amountMultiplier: 1.3,
    }),
    miners: Object.freeze({
      id: "miners", label: "Mining Households", icon: "⛏️", prestigeRequired: 0,
      description: "Payroll-driven customers make frequent withdrawals and carry volatile credit risk.",
      names: Object.freeze(["Liam Nkosi", "Hiro Tanaka", "James Osei", "Elena Ivanova"]),
      organizations: Object.freeze(["Silver Lode Payroll", "Prospector Mutual Fund", "Copper Ridge Crew"]),
      purposes: Object.freeze(["new prospecting equipment", "a claim lease", "medical expenses", "winter provisions"]),
      serviceWeights: Object.freeze({ account: 0.2, deposit: 0.17, withdrawal: 0.4, loan: 0.23 }),
      riskWeights: Object.freeze({ low: 0.18, medium: 0.47, high: 0.35 }),
      amountMultiplier: 0.85,
    }),
    institutions: Object.freeze({
      id: "institutions", label: "Institutions", icon: "🏛️", prestigeRequired: 1,
      description: "Civic and professional accounts offer large balances but expect a trusted bank.",
      names: Object.freeze(["Dr. Al-Rashid", "Carmen Reyes", "Isabelle Morin"]),
      organizations: Object.freeze(["City Pension Fund", "St. Agnes Hospital", "Silver Creek Council", "The Goldstein Trust"]),
      purposes: Object.freeze(["a public works advance", "hospital equipment", "a pension bridge", "a civic hall"]),
      serviceWeights: Object.freeze({ account: 0.12, deposit: 0.5, withdrawal: 0.12, loan: 0.26 }),
      riskWeights: Object.freeze({ low: 0.68, medium: 0.27, high: 0.05 }),
      amountMultiplier: 2.1,
    }),
    enterprises: Object.freeze({
      id: "enterprises", label: "Regional Enterprises", icon: "🚂", prestigeRequired: 2,
      description: "Large regional firms bring exceptional value, concentration, and liquidity demands.",
      names: Object.freeze(["Grace Liu", "Frank Johansson", "Bob Okonkwo"]),
      organizations: Object.freeze(["Harbour Logistics", "Western Rail & Freight", "Continental Milling", "Blue Peak Holdings"]),
      purposes: Object.freeze(["a rail spur", "warehouse construction", "fleet expansion", "a regional acquisition"]),
      serviceWeights: Object.freeze({ account: 0.08, deposit: 0.36, withdrawal: 0.16, loan: 0.4 }),
      riskWeights: Object.freeze({ low: 0.22, medium: 0.5, high: 0.28 }),
      amountMultiplier: 3,
    }),
  });

  const LOCATIONS = Object.freeze({
    silver_creek: Object.freeze({
      id: "silver_creek",
      label: "Silver Creek",
      region: "Frontier County",
      description: "A growing mining and ranching town with moderate rent and elevated frontier crime.",
      demographics: Object.freeze({ households: 0.3, ranchers: 0.25, merchants: 0.2, miners: 0.17, institutions: 0.06, enterprises: 0.02 }),
      rentMultiplier: 1,
      crimeRisk: 1.1,
      growth: 1.05,
    }),
    red_mesa: Object.freeze({
      id: "red_mesa", label: "Red Mesa", region: "Cattle Country",
      description: "A fast-growing ranch market with seasonal borrowing and elevated frontier risk.",
      demographics: Object.freeze({ households: 0.25, ranchers: 0.4, merchants: 0.15, miners: 0.1, institutions: 0.07, enterprises: 0.03 }),
      rentMultiplier: 1.15, crimeRisk: 1.3, growth: 1.09,
    }),
    ironwood: Object.freeze({
      id: "ironwood", label: "Ironwood", region: "Northern Timberlands",
      description: "A stable mill and timber economy with strong commercial and institutional demand.",
      demographics: Object.freeze({ households: 0.24, ranchers: 0.05, merchants: 0.24, miners: 0.15, institutions: 0.18, enterprises: 0.14 }),
      rentMultiplier: 1.35, crimeRisk: 0.88, growth: 1.04,
    }),
    port_mercy: Object.freeze({
      id: "port_mercy", label: "Port Mercy", region: "Western Coast",
      description: "A costly trade port dominated by merchants, institutions, and regional enterprises.",
      demographics: Object.freeze({ households: 0.15, ranchers: 0.03, merchants: 0.27, miners: 0.08, institutions: 0.2, enterprises: 0.27 }),
      rentMultiplier: 1.7, crimeRisk: 1.02, growth: 1.12,
    }),
  });

  const PRESTIGE_TIERS = Object.freeze([
    Object.freeze({ level: 0, title: "Local Banker", unlock: "Core Silver Creek customers", requirements: null }),
    Object.freeze({ level: 1, title: "Trusted Institution", unlock: "Institutional customers", requirements: Object.freeze({ served: 10, rep: 62 }) }),
    Object.freeze({ level: 2, title: "County Bank", unlock: "Regional enterprise customers and improved fees", requirements: Object.freeze({ served: 24, rep: 66, netCapital: 1_800, marketShare: 9.5 }) }),
    Object.freeze({ level: 3, title: "Territorial Bank", unlock: "Regional expansion planning and premium demand", requirements: Object.freeze({ served: 50, rep: 72, netCapital: 3_500, marketShare: 12 }) }),
  ]);

  function weightedPick(weights, random = Math.random) {
    const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let cursor = random() * total;
    for (const [id, weight] of entries) {
      cursor -= weight;
      if (cursor <= 0) return id;
    }
    return entries[entries.length - 1]?.[0] || null;
  }

  function migrateMarket(bank) {
    bank.locationId = LOCATIONS[bank.locationId] ? bank.locationId : "silver_creek";
    bank.prestigeLevel = Math.max(0, Math.min(PRESTIGE_TIERS.length - 1, Number(bank.prestigeLevel) || 0));
    bank.prestigeHistory = Array.isArray(bank.prestigeHistory) ? bank.prestigeHistory.slice(0, 10) : [];
    bank.stats = bank.stats || {};
    const existing = bank.stats.segmentResults || {};
    bank.stats.segmentResults = {};
    for (const id of Object.keys(SEGMENTS)) {
      bank.stats.segmentResults[id] = {
        served: Math.max(0, Number(existing[id]?.served) || 0),
        lost: Math.max(0, Number(existing[id]?.lost) || 0),
        value: Math.max(0, Number(existing[id]?.value) || 0),
      };
    }
    return bank;
  }

  function locationProfile(bank) {
    return LOCATIONS[bank.locationId] || LOCATIONS.silver_creek;
  }

  function availableDemographics(bank) {
    const location = locationProfile(bank);
    return Object.fromEntries(Object.entries(location.demographics).filter(([id]) =>
      SEGMENTS[id].prestigeRequired <= (bank.prestigeLevel || 0)
    ));
  }

  function chooseSegment(bank, random = Math.random) {
    const id = weightedPick(availableDemographics(bank), random);
    return SEGMENTS[id] || SEGMENTS.households;
  }

  function chooseService(segment, random = Math.random) {
    return weightedPick(segment.serviceWeights, random);
  }

  function chooseRisk(segment, random = Math.random) {
    return weightedPick(segment.riskWeights, random);
  }

  function pickFrom(items, random = Math.random) {
    return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
  }

  function customerProfileForSegment(segmentId, service = null, random = Math.random) {
    const segment = SEGMENTS[segmentId] || SEGMENTS.households;
    return {
      id: segment.id,
      label: segment.label,
      icon: segment.icon,
      description: segment.description,
      name: pickFrom(segment.names, random),
      organization: pickFrom(segment.organizations, random),
      purpose: pickFrom(segment.purposes, random),
      service: service && segment.serviceWeights[service] ? service : chooseService(segment, random),
      risk: chooseRisk(segment, random),
      amountMultiplier: segment.amountMultiplier,
    };
  }

  function customerProfile(bank, random = Math.random) {
    return customerProfileForSegment(chooseSegment(bank, random).id, null, random);
  }

  function prestigeModifiers(bank) {
    const level = bank.prestigeLevel || 0;
    return {
      feeMultiplier: level >= 2 ? 1.1 : 1,
      depositMultiplier: level >= 3 ? 1.12 : 1,
      patienceBonus: level * 2,
    };
  }

  function requirementsMet(requirements, bank, currentNetWorth) {
    if (!requirements) return true;
    return (bank.stats?.customersServed || 0) >= (requirements.served || 0)
      && bank.rep >= (requirements.rep || 0)
      && currentNetWorth >= (requirements.netCapital || -Infinity)
      && bank.marketShare >= (requirements.marketShare || 0);
  }

  function updatePrestige(bank, currentNetWorth) {
    migrateMarket(bank);
    const promotions = [];
    while (bank.prestigeLevel < PRESTIGE_TIERS.length - 1) {
      const next = PRESTIGE_TIERS[bank.prestigeLevel + 1];
      if (!requirementsMet(next.requirements, bank, currentNetWorth)) break;
      bank.prestigeLevel = next.level;
      bank.prestigeHistory.unshift({ day: bank.day, level: next.level, title: next.title, unlock: next.unlock });
      promotions.push(next);
    }
    return promotions;
  }

  function prestigeStatus(bank, currentNetWorth) {
    migrateMarket(bank);
    const current = PRESTIGE_TIERS[bank.prestigeLevel];
    const next = PRESTIGE_TIERS[bank.prestigeLevel + 1] || null;
    const metrics = {
      served: bank.stats.customersServed || 0,
      rep: bank.rep,
      netCapital: currentNetWorth,
      marketShare: bank.marketShare,
    };
    return { current, next, metrics, complete: !next };
  }

  function recordSegmentOutcome(bank, segmentId, outcome, value = 0) {
    migrateMarket(bank);
    const result = bank.stats.segmentResults[segmentId];
    if (!result) return;
    if (outcome === "served") result.served += 1;
    if (outcome === "lost") result.lost += 1;
    result.value += Math.max(0, Number(value) || 0);
    bank.dayMetrics.segmentResults = bank.dayMetrics.segmentResults || {};
    const daily = bank.dayMetrics.segmentResults[segmentId] || { served: 0, lost: 0, value: 0 };
    if (outcome === "served") daily.served += 1;
    if (outcome === "lost") daily.lost += 1;
    daily.value += Math.max(0, Number(value) || 0);
    bank.dayMetrics.segmentResults[segmentId] = daily;
  }

  function segmentReport(bank) {
    migrateMarket(bank);
    const demographics = availableDemographics(bank);
    const totalWeight = Object.values(demographics).reduce((sum, weight) => sum + weight, 0) || 1;
    return Object.keys(SEGMENTS).map(id => ({
      ...SEGMENTS[id],
      available: SEGMENTS[id].prestigeRequired <= bank.prestigeLevel,
      demographicShare: (demographics[id] || 0) / totalWeight,
      ...bank.stats.segmentResults[id],
    }));
  }

  return Object.freeze({
    SEGMENTS,
    LOCATIONS,
    PRESTIGE_TIERS,
    weightedPick,
    migrateMarket,
    locationProfile,
    availableDemographics,
    chooseSegment,
    chooseService,
    chooseRisk,
    customerProfileForSegment,
    customerProfile,
    prestigeModifiers,
    requirementsMet,
    updatePrestige,
    prestigeStatus,
    recordSegmentOutcome,
    segmentReport,
  });
});
