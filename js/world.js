// Persistent regional conditions, narrative choices, and recovery actions.
(function exposeWorld(root, factory) {
  const api = factory();
  if (typeof module === "undefined" || !module.exports) root.BankWorld = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createWorld() {
  const DEFAULT_MODIFIERS = Object.freeze({
    depositAmount: 1,
    withdrawalAmount: 1,
    loanAmount: 1,
    missedPaymentChance: 1,
    depositInterestCost: 1,
    rentCost: 1,
    rivalGrowth: 1,
    spawnInterval: 1,
    serviceInterval: 1,
    robberyLoss: 1,
    marketShareDaily: 0,
  });

  const CONDITIONS = Object.freeze({
    harvest_boom: Object.freeze({
      label: "Harvest Boom", icon: "🌾",
      description: "Merchant deposits and credit demand are elevated; borrowers are more reliable.",
      modifiers: { depositAmount: 1.25, loanAmount: 1.15, missedPaymentChance: 0.8, spawnInterval: 0.88 },
    }),
    cautious_lending: Object.freeze({
      label: "Cautious Lending", icon: "🧮",
      description: "The branch protects liquidity but yields some local business to Continental Trust.",
      modifiers: { loanAmount: 0.82, rivalGrowth: 1.3, marketShareDaily: -0.04 },
    }),
    hardship_program: Object.freeze({
      label: "Hardship Program", icon: "🤝",
      description: "Payment support reduces arrears while the local slowdown suppresses deposits.",
      modifiers: { depositAmount: 0.88, withdrawalAmount: 1.08, missedPaymentChance: 0.82, rentCost: 1.08 },
    }),
    mine_slowdown: Object.freeze({
      label: "Mine Slowdown", icon: "⛏️",
      description: "Withdrawals and repayment risk rise while new credit demand contracts.",
      modifiers: { depositAmount: 0.82, withdrawalAmount: 1.28, loanAmount: 0.78, missedPaymentChance: 1.45 },
    }),
    rate_match: Object.freeze({
      label: "Matched Deposit Rates", icon: "📈",
      description: "Better rates attract deposits and market share but raise daily interest expense.",
      modifiers: { depositAmount: 1.22, depositInterestCost: 1.65, marketShareDaily: 0.06 },
    }),
    rival_pressure: Object.freeze({
      label: "Rival Rate Pressure", icon: "🏦",
      description: "Continental Trust is winning deposits with an aggressive rate campaign.",
      modifiers: { depositAmount: 0.78, rivalGrowth: 1.8, marketShareDaily: -0.08 },
    }),
    compliance_review: Object.freeze({
      label: "Compliance Review", icon: "🔎",
      description: "Staff work more carefully during a formal review, reducing service throughput.",
      modifiers: { serviceInterval: 1.18, spawnInterval: 1.08 },
    }),
    distracted_team: Object.freeze({
      label: "Distracted Team", icon: "📚",
      description: "Unresolved internal concerns slow the branch and weaken public confidence.",
      modifiers: { serviceInterval: 1.3, marketShareDaily: -0.04 },
    }),
    guarded_branch: Object.freeze({
      label: "Guarded Branch", icon: "⭐",
      description: "Temporary guards sharply reduce crime losses but add operating expense.",
      modifiers: { robberyLoss: 0.25, rentCost: 1.18 },
    }),
    crime_wave: Object.freeze({
      label: "Crime Wave", icon: "🔫",
      description: "Cash losses from crime are more severe until the town restores order.",
      modifiers: { robberyLoss: 1.6, spawnInterval: 1.08 },
    }),
    cattle_drive: Object.freeze({
      label: "Cattle Drive", icon: "🐂",
      description: "Ranch trade is lifting deposits, credit demand, and customer traffic.",
      modifiers: { depositAmount: 1.18, loanAmount: 1.12, spawnInterval: 0.9 },
    }),
    drought_relief: Object.freeze({
      label: "Drought Relief", icon: "💧",
      description: "Payment support reduces defaults, though weak ranch income still suppresses deposits.",
      modifiers: { depositAmount: 0.88, missedPaymentChance: 0.82, rentCost: 1.06 },
    }),
    drought_stress: Object.freeze({
      label: "Drought Stress", icon: "☀️",
      description: "Ranch withdrawals and late payments are rising while loan demand contracts.",
      modifiers: { depositAmount: 0.78, withdrawalAmount: 1.3, loanAmount: 0.82, missedPaymentChance: 1.4 },
    }),
    rail_expansion: Object.freeze({
      label: "Rail Expansion", icon: "🚂",
      description: "New rail traffic is driving deposits, business credit, and regional attention.",
      modifiers: { depositAmount: 1.2, loanAmount: 1.2, spawnInterval: 0.86, rentCost: 1.08, marketShareDaily: 0.05 },
    }),
    rail_rival: Object.freeze({
      label: "Rival Rail Office", icon: "🏦",
      description: "A rival captured the depot relationship and is pressing its regional advantage.",
      modifiers: { depositAmount: 0.82, rivalGrowth: 1.55, marketShareDaily: -0.06 },
    }),
    trained_team: Object.freeze({
      label: "Certified Team", icon: "🎓",
      description: "Fresh training improves service speed and customer confidence.",
      modifiers: { serviceInterval: 0.84, marketShareDaily: 0.03 },
    }),
    strained_team: Object.freeze({
      label: "Strained Team", icon: "📚",
      description: "Deferred development has hurt morale and slowed service.",
      modifiers: { serviceInterval: 1.24, marketShareDaily: -0.03 },
    }),
    reassured_depositors: Object.freeze({
      label: "Reassured Depositors", icon: "📣",
      description: "Clear reserve reporting has calmed customers and stabilized deposits.",
      modifiers: { depositAmount: 1.15, withdrawalAmount: 0.86, marketShareDaily: 0.04 },
    }),
    run_rumor: Object.freeze({
      label: "Bank Run Rumor", icon: "📰",
      description: "Unanswered rumors are driving withdrawals and weakening new deposits.",
      modifiers: { depositAmount: 0.72, withdrawalAmount: 1.42, spawnInterval: 1.1, marketShareDaily: -0.08 },
    }),
    verified_cash: Object.freeze({
      label: "Verified Cash", icon: "🔎",
      description: "Note checks protect the vault but add a little time to each service.",
      modifiers: { serviceInterval: 1.1, robberyLoss: 0.72 },
    }),
    counterfeit_risk: Object.freeze({
      label: "Counterfeit Risk", icon: "⚠️",
      description: "Unverified notes are slowing trade and weakening confidence in the branch.",
      modifiers: { depositAmount: 0.86, serviceInterval: 1.12, marketShareDaily: -0.04 },
    }),
    homestead_growth: Object.freeze({
      label: "Homestead Growth", icon: "🏠",
      description: "New households are increasing account openings and responsible small-loan demand.",
      modifiers: { loanAmount: 1.24, missedPaymentChance: 0.9, spawnInterval: 0.88, marketShareDaily: 0.03 },
    }),
    freight_contract: Object.freeze({
      label: "Freight Contract", icon: "📦",
      description: "Depot merchants are routing payroll and working capital through the bank.",
      modifiers: { depositAmount: 1.16, loanAmount: 1.1, spawnInterval: 0.9, marketShareDaily: 0.04 },
    }),
    seasonal_recovery: Object.freeze({
      label: "Seasonal Recovery", icon: "🌦️",
      description: "Returning rain is restoring deposits and borrower reliability.",
      modifiers: { depositAmount: 1.1, withdrawalAmount: 0.9, missedPaymentChance: 0.84 },
    }),
    clean_ledger: Object.freeze({
      label: "Clean Ledger", icon: "✅",
      description: "Published controls improve confidence and help staff process clean cases efficiently.",
      modifiers: { serviceInterval: 0.94, marketShareDaily: 0.04 },
    }),
    rival_exposed: Object.freeze({
      label: "Rival Exposed", icon: "🗞️",
      description: "Proof of a rival's whisper campaign is shifting customers back toward the bank.",
      modifiers: { depositAmount: 1.12, rivalGrowth: 0.72, marketShareDaily: 0.06 },
    }),
    timber_contract: Object.freeze({
      label: "Timber Consortium", icon: "🪵",
      description: "Mill payroll and shipment finance are lifting commercial deposits and credit demand.",
      modifiers: { depositAmount: 1.16, loanAmount: 1.22, spawnInterval: 0.9, marketShareDaily: 0.04 },
    }),
    timber_caution: Object.freeze({
      label: "Secured Timber Credit", icon: "📐",
      description: "Strict collateral protects the loan book but leaves some mill business to Iron Crown Bank.",
      modifiers: { loanAmount: 0.86, missedPaymentChance: 0.82, rivalGrowth: 1.25, marketShareDaily: -0.02 },
    }),
    timber_recovery: Object.freeze({
      label: "Restructured Timber Trade", icon: "🌲",
      description: "Seasonal repayment terms are keeping mills current and their workers' deposits local.",
      modifiers: { depositAmount: 1.12, missedPaymentChance: 0.78, marketShareDaily: 0.04 },
    }),
    lumber_liquidation: Object.freeze({
      label: "Lumber Liquidation", icon: "📦",
      description: "Collateral proceeds strengthened cash, but mill closures are depressing local activity.",
      modifiers: { depositAmount: 0.82, loanAmount: 0.74, spawnInterval: 1.12, marketShareDaily: -0.03 },
    }),
    harbor_buildout: Object.freeze({
      label: "Harbor Bond Works", icon: "⚓",
      description: "Bond construction is driving enterprise accounts, payroll deposits, and working-capital demand.",
      modifiers: { depositAmount: 1.2, loanAmount: 1.24, spawnInterval: 0.86, rentCost: 1.1, marketShareDaily: 0.05 },
    }),
    port_caution: Object.freeze({
      label: "Port Capital Protected", icon: "🧭",
      description: "The bank kept reserves liquid while Iron Crown Bank leads the harbor financing syndicate.",
      modifiers: { depositAmount: 0.9, loanAmount: 0.86, rivalGrowth: 1.35, marketShareDaily: -0.03 },
    }),
    harbor_trade: Object.freeze({
      label: "Harbor Trade Accounts", icon: "🚢",
      description: "Warehouse firms are consolidating deposits, fees, and trade credit with the bank.",
      modifiers: { depositAmount: 1.24, loanAmount: 1.14, spawnInterval: 0.84, marketShareDaily: 0.06 },
    }),
    underwriting_income: Object.freeze({
      label: "Bond Underwriting Income", icon: "📜",
      description: "The bank collected its syndication fees while limiting additional harbor exposure.",
      modifiers: { depositAmount: 1.08, loanAmount: 0.92, marketShareDaily: 0.02 },
    }),
    charter_review: Object.freeze({
      label: "Territorial Charter Review", icon: "🏛️",
      description: "Examiners are testing every branch, slowing service while the network seeks a territorial charter.",
      modifiers: { serviceInterval: 1.18, spawnInterval: 1.08, rivalGrowth: 0.92 },
    }),
    territorial_charter: Object.freeze({
      label: "Territorial Charter", icon: "⭐",
      description: "A common charter strengthens confidence, regional transfers, and competitive standing.",
      modifiers: { depositAmount: 1.18, serviceInterval: 0.92, rivalGrowth: 0.82, marketShareDaily: 0.07 },
    }),
    local_independence: Object.freeze({
      label: "Independent Branch Compact", icon: "🗺️",
      description: "Local discretion builds community loyalty but makes network operations less efficient.",
      modifiers: { depositAmount: 1.1, serviceInterval: 1.1, marketShareDaily: 0.02 },
    }),
    mutual_compact: Object.freeze({
      label: "Frontier Mutual Compact", icon: "🤝",
      description: "A locally governed compact is pooling deposits and resisting Pioneer Mutual's expansion.",
      modifiers: { depositAmount: 1.15, missedPaymentChance: 0.9, rivalGrowth: 0.76, marketShareDaily: 0.05 },
    }),
  });

  const WORLD_EVENTS = Object.freeze([
    Object.freeze({
      id: "harvest_outlook", category: "Regional", icon: "🌾", title: "Record Harvest Forecast",
      regions: Object.freeze(["silver_creek"]),
      description: "Silver Creek merchants expect a bumper season and want the bank visibly behind local expansion.",
      choices: Object.freeze([
        Object.freeze({ id: "back_merchants", label: "Back Merchants · $120", cost: 120, rep: 4, condition: "harvest_boom", duration: 3, result: "Community lending launched. Harvest activity will lift demand for three days.", kind: "good" }),
        Object.freeze({ id: "protect_reserves", label: "Protect Reserves", rival: 0.25, condition: "cautious_lending", duration: 3, result: "Liquidity protected, but Continental Trust moved into the opportunity.", kind: "neutral" }),
      ]),
    }),
    Object.freeze({
      id: "mine_closure", category: "Regional", icon: "⛏️", title: "Silver Mine Layoffs",
      regions: Object.freeze(["silver_creek"]),
      description: "The largest mine cut its payroll. Families face withdrawals and borrowers may miss payments.",
      choices: Object.freeze([
        Object.freeze({ id: "offer_relief", label: "Offer Relief · $100", cost: 100, rep: 5, condition: "hardship_program", duration: 4, result: "A hardship program steadied borrowers and earned public trust.", kind: "good" }),
        Object.freeze({ id: "tighten_credit", label: "Tighten Credit", rep: -2, condition: "mine_slowdown", duration: 4, result: "Reserves are protected, but the slowdown will hit withdrawals and arrears.", kind: "warn" }),
      ]),
    }),
    Object.freeze({
      id: "rival_rate_campaign", category: "Competitor", icon: "🏦", title: "Continental Trust Raises Rates",
      description: "Your rival is advertising unusually generous deposit rates throughout the county.",
      choices: Object.freeze([
        Object.freeze({ id: "match_rates", label: "Match Their Rates", condition: "rate_match", duration: 4, result: "Deposits should grow, but interest expense will remain elevated.", kind: "neutral" }),
        Object.freeze({ id: "hold_pricing", label: "Hold Pricing", rival: 0.35, condition: "rival_pressure", duration: 4, result: "Margins are protected while Continental Trust presses its advantage.", kind: "warn" }),
      ]),
    }),
    Object.freeze({
      id: "staff_fraud_alert", category: "Staff", icon: "🔍", title: "Suspicious Ledger Entry",
      description: "An employee found mismatched signatures in yesterday's records and recommends a formal review.",
      requiresStaff: true,
      choices: Object.freeze([
        Object.freeze({ id: "audit", label: "Commission Audit · $75", cost: 75, rep: 3, condition: "compliance_review", duration: 2, followUp: { eventId: "audit_findings", delay: 2 }, result: "The audit reassured depositors, though careful checks will slow service.", kind: "good" }),
        Object.freeze({ id: "settle_quietly", label: "Handle Quietly · $30", cost: 30, rep: -3, condition: "distracted_team", duration: 3, result: "The issue stayed private, but uncertainty is distracting the team.", kind: "warn" }),
      ]),
    }),
    Object.freeze({
      id: "crime_warning", category: "Crime", icon: "🔫", title: "Sheriff Warns of a Crime Wave",
      description: "A gang is moving along the rail line. The sheriff recommends temporary private guards.",
      choices: Object.freeze([
        Object.freeze({ id: "hire_guards", label: "Hire Guards · $100", cost: 100, condition: "guarded_branch", duration: 3, result: "Guards posted. Crime losses will be sharply reduced for three days.", kind: "good" }),
        Object.freeze({ id: "take_risk", label: "Take the Risk", condition: "crime_wave", duration: 3, result: "No immediate cost, but an attempted robbery will be far more damaging.", kind: "warn" }),
      ]),
    }),
    Object.freeze({
      id: "cattle_drive_finance", category: "Regional", icon: "🐂", title: "Territorial Cattle Drive",
      regions: Object.freeze(["silver_creek", "red_mesa"]),
      description: "Ranchers need short-term banking support before thousands of head move through Silver Creek.",
      choices: Object.freeze([
        Object.freeze({ id: "sponsor_drive", label: "Sponsor Drive · $110", cost: 110, rep: 3, condition: "cattle_drive", duration: 3, result: "The bank became the drive's clearing house, lifting ranch trade for three days.", kind: "good" }),
        Object.freeze({ id: "stay_liquid", label: "Stay Liquid", rival: 0.2, condition: "cautious_lending", duration: 2, result: "Reserves stayed intact while a rival secured the ranchers' business.", kind: "neutral" }),
      ]),
    }),
    Object.freeze({
      id: "drought_response", category: "Economic", icon: "💧", title: "Ranch Country Drought",
      regions: Object.freeze(["red_mesa"]),
      description: "Dry wells threaten livestock income, depositor cash flow, and upcoming loan payments.",
      choices: Object.freeze([
        Object.freeze({ id: "fund_water_relief", label: "Fund Relief · $140", cost: 140, rep: 5, condition: "drought_relief", duration: 4, followUp: { eventId: "drought_recovery", delay: 4 }, result: "Emergency water financing protected borrowers, though local income remains weak.", kind: "good" }),
        Object.freeze({ id: "tighten_for_drought", label: "Tighten Credit", rep: -2, condition: "drought_stress", duration: 4, followUp: { eventId: "drought_recovery", delay: 4 }, result: "The bank protected new capital while ranch withdrawals and delinquencies climbed.", kind: "warn" }),
      ]),
    }),
    Object.freeze({
      id: "railway_depot", category: "Regional", icon: "🚂", title: "Railway Depot Subscription",
      regions: Object.freeze(["ironwood"]), minBranches: 2,
      description: "The railway will build a freight office if a local bank finances the final subscription.",
      choices: Object.freeze([
        Object.freeze({ id: "subscribe_rail", label: "Subscribe · $250", cost: 250, rep: 2, market: 0.35, condition: "rail_expansion", duration: 5, followUp: { eventId: "railway_freight_contract", delay: 3 }, result: "The depot agreement brought new merchants, deposits, and credit demand.", kind: "good" }),
        Object.freeze({ id: "pass_rail", label: "Pass on the Deal", rival: 0.45, condition: "rail_rival", duration: 5, result: "A rival financed the depot and opened a campaign for its new traffic.", kind: "warn" }),
      ]),
    }),
    Object.freeze({
      id: "counterfeit_notes", category: "Crime", icon: "🔎", title: "Counterfeit Notes Circulating",
      description: "Merchants report convincing false notes. The branch can install temporary verification controls.",
      choices: Object.freeze([
        Object.freeze({ id: "verify_notes", label: "Install Checks · $85", cost: 85, rep: 2, condition: "verified_cash", duration: 3, result: "Verification protected the vault, with a modest service-time cost.", kind: "good" }),
        Object.freeze({ id: "accept_notes", label: "Keep Counters Moving", rep: -2, condition: "counterfeit_risk", duration: 3, result: "Service stayed open, but uncertainty is suppressing deposits and confidence.", kind: "warn" }),
      ]),
    }),
    Object.freeze({
      id: "staff_certification", category: "Staff", icon: "🎓", title: "Territorial Banking Certification",
      description: "Your employees request time and tuition for a visiting banking examiner's course.",
      requiresStaff: true,
      choices: Object.freeze([
        Object.freeze({ id: "fund_certification", label: "Fund Training · $90", cost: 90, rep: 3, condition: "trained_team", duration: 4, result: "The certified team will process work faster and inspire confidence.", kind: "good" }),
        Object.freeze({ id: "defer_certification", label: "Defer Training", rep: -2, condition: "strained_team", duration: 3, result: "The team stayed at its posts, but morale and service speed suffered.", kind: "warn" }),
      ]),
    }),
    Object.freeze({
      id: "bank_run_rumor", category: "Competitor", icon: "📰", title: "Anonymous Bank Run Rumor",
      description: "A handbill claims the bank cannot cover withdrawals. Its printer has ties to a rival campaign.",
      choices: Object.freeze([
        Object.freeze({ id: "publish_reserves", label: "Publish Reserves · $70", cost: 70, rep: 4, condition: "reassured_depositors", duration: 3, followUp: { eventId: "rumor_source_found", delay: 2 }, result: "Transparent reserve figures calmed depositors and strengthened trust.", kind: "good" }),
        Object.freeze({ id: "ignore_rumor", label: "Ignore the Handbill", rival: 0.25, condition: "run_rumor", duration: 3, followUp: { eventId: "rumor_source_found", delay: 2 }, result: "The rumor spread unchecked, accelerating withdrawals and rival pressure.", kind: "warn" }),
      ]),
    }),
    Object.freeze({
      id: "homestead_credit", category: "Economic", icon: "🏠", title: "New Homestead Applications",
      regions: Object.freeze(["silver_creek", "red_mesa"]),
      description: "A wave of families needs accounts and modest improvement loans before settling nearby claims.",
      choices: Object.freeze([
        Object.freeze({ id: "back_homesteads", label: "Back Settlers · $80", cost: 80, rep: 3, condition: "homestead_growth", duration: 4, result: "Household accounts and responsible small-loan demand will rise.", kind: "good" }),
        Object.freeze({ id: "limit_homesteads", label: "Limit Exposure", condition: "cautious_lending", duration: 3, result: "The loan book stayed conservative while rivals courted the new households.", kind: "neutral" }),
      ]),
    }),
    Object.freeze({
      id: "timber_consortium", category: "Regional Arc", icon: "🪵", title: "Ironwood Timber Consortium",
      regions: Object.freeze(["ironwood"]), minBranches: 2, minPrestige: 2, once: true,
      description: "Three mills want one bank to coordinate payroll, inventory credit, and winter shipment finance. Iron Crown Bank is preparing a competing offer.",
      choices: Object.freeze([
        Object.freeze({ id: "underwrite_mills", label: "Underwrite Consortium · $260", cost: 260, rep: 3, market: 0.3, rival: -0.2, rivalId: "iron_crown", condition: "timber_contract", duration: 4, followUp: { eventId: "timber_settlement", delay: 4 }, result: "The mills consolidated their accounts with your bank, creating a large but seasonal credit exposure.", kind: "good" }),
        Object.freeze({ id: "secure_timber_credit", label: "Require Hard Collateral", rival: 0.3, rivalId: "iron_crown", condition: "timber_caution", duration: 4, followUp: { eventId: "timber_settlement", delay: 4 }, result: "The bank limited exposure while Iron Crown financed the mills' riskier seasonal needs.", kind: "neutral" }),
      ]),
    }),
    Object.freeze({
      id: "harbor_bond_issue", category: "Regional Arc", icon: "⚓", title: "Port Mercy Harbor Bonds",
      regions: Object.freeze(["port_mercy"]), minBranches: 3, minPrestige: 3, once: true,
      description: "Port merchants are issuing bonds for new piers and warehouses. Leading the syndicate could define the coast market—and concentrate substantial capital there.",
      choices: Object.freeze([
        Object.freeze({ id: "lead_harbor_syndicate", label: "Lead Syndicate · $400", cost: 400, rep: 4, market: 0.4, rival: -0.25, rivalId: "iron_crown", condition: "harbor_buildout", duration: 5, followUp: { eventId: "harbor_opening", delay: 4 }, result: "The bank led the issue. Construction and enterprise banking will surge while the bonds settle.", kind: "good" }),
        Object.freeze({ id: "protect_port_reserves", label: "Protect Port Reserves", rival: 0.4, rivalId: "iron_crown", condition: "port_caution", duration: 5, followUp: { eventId: "harbor_opening", delay: 4 }, result: "Liquidity remained intact, but Iron Crown Bank took the lead underwriting position.", kind: "neutral" }),
      ]),
    }),
    Object.freeze({
      id: "territorial_charter_bid", category: "Campaign Arc", icon: "🏛️", title: "Territorial Charter Invitation",
      minBranches: 3, minPrestige: 2, minDay: 12, once: true,
      description: "The territorial secretary invites the network to seek a common charter. Examiners demand unified controls; independent branch directors prefer local authority.",
      choices: Object.freeze([
        Object.freeze({ id: "seek_charter", label: "Seek Charter · $300", cost: 300, rep: 5, condition: "charter_review", duration: 3, followUp: { eventId: "charter_hearing", delay: 3 }, result: "Examiners began a network-wide review. Service will slow until the charter hearing.", kind: "good" }),
        Object.freeze({ id: "keep_local_charters", label: "Keep Local Charters", rep: 1, rival: 0.25, rivalId: "pioneer", condition: "local_independence", duration: 3, followUp: { eventId: "branch_compact", delay: 3 }, result: "Branch directors kept local authority while Pioneer Mutual promoted its unified cooperative network.", kind: "neutral" }),
      ]),
    }),
    Object.freeze({
      id: "railway_freight_contract", category: "Follow-up", icon: "📦", title: "Depot Freight Contract",
      description: "The financed depot is operational. Its merchants will consolidate their banking for one committed partner.",
      followUpOnly: true,
      choices: Object.freeze([
        Object.freeze({ id: "finance_warehouses", label: "Finance Warehouses · $180", cost: 180, rep: 2, market: 0.2, condition: "freight_contract", duration: 4, result: "The bank secured merchant payroll, deposits, and warehouse credit.", kind: "good" }),
        Object.freeze({ id: "collect_depot_fees", label: "Collect Existing Fees", condition: "rail_expansion", duration: 2, result: "The bank kept the depot relationship profitable without committing more capital.", kind: "neutral" }),
      ]),
    }),
    Object.freeze({
      id: "drought_recovery", category: "Follow-up", icon: "🌦️", title: "Rains Return to Ranch Country",
      description: "The first storms have broken the drought. The bank must decide how quickly to normalize ranch credit.",
      followUpOnly: true,
      choices: Object.freeze([
        Object.freeze({ id: "seasonal_restructure", label: "Restructure Seasonally · $80", cost: 80, rep: 3, condition: "seasonal_recovery", duration: 4, result: "Seasonal terms restored borrower cash flow and returning deposits.", kind: "good" }),
        Object.freeze({ id: "restore_standard_terms", label: "Restore Standard Terms", condition: "cautious_lending", duration: 2, result: "The bank rebuilt reserves first while ranch credit recovered gradually.", kind: "neutral" }),
      ]),
    }),
    Object.freeze({
      id: "audit_findings", category: "Follow-up", icon: "✅", title: "Audit Findings Delivered",
      description: "The commissioned audit found weak controls but no systemic theft. Its recommendations are ready.",
      followUpOnly: true,
      requiresStaff: true,
      choices: Object.freeze([
        Object.freeze({ id: "publish_controls", label: "Publish Controls · $60", cost: 60, rep: 4, condition: "clean_ledger", duration: 4, result: "Published controls strengthened trust and streamlined routine verification.", kind: "good" }),
        Object.freeze({ id: "file_privately", label: "File Privately", rep: 1, condition: "compliance_review", duration: 1, result: "The bank corrected its records quietly and returned the team to normal work.", kind: "neutral" }),
      ]),
    }),
    Object.freeze({
      id: "rumor_source_found", category: "Follow-up", icon: "🗞️", title: "Handbill Printer Identified",
      description: "The printer admits a rival agent paid for the bank-run handbills. The evidence can now be used.",
      followUpOnly: true,
      choices: Object.freeze([
        Object.freeze({ id: "publish_evidence", label: "Publish Evidence · $90", cost: 90, rep: 3, market: 0.3, condition: "rival_exposed", duration: 4, result: "The exposure reversed the whisper campaign and slowed rival momentum.", kind: "good" }),
        Object.freeze({ id: "secure_retraction", label: "Secure Quiet Retraction · $35", cost: 35, rep: 1, condition: "reassured_depositors", duration: 2, result: "A quiet retraction stabilized depositors without escalating the rivalry.", kind: "neutral" }),
      ]),
    }),
    Object.freeze({
      id: "timber_settlement", category: "Arc Follow-up", icon: "🌲", title: "Winter Timber Settlement",
      followUpOnly: true,
      description: "Winter shipments fell short of forecast. The mills can survive with seasonal terms, or the bank can liquidate pledged lumber and close the exposure.",
      choices: Object.freeze([
        Object.freeze({ id: "restructure_timber", label: "Restructure Mills · $120", cost: 120, rep: 4, market: 0.2, condition: "timber_recovery", duration: 4, result: "Seasonal terms kept the mills open, protected payroll deposits, and reduced repayment pressure.", kind: "good" }),
        Object.freeze({ id: "liquidate_lumber", label: "Liquidate Collateral", income: 220, rep: -3, rival: 0.2, rivalId: "iron_crown", condition: "lumber_liquidation", duration: 4, result: "The bank recovered $220 from lumber collateral, but closures weakened Ironwood and gave Iron Crown an opening.", kind: "warn" }),
      ]),
    }),
    Object.freeze({
      id: "harbor_opening", category: "Arc Follow-up", icon: "🚢", title: "New Harbor Piers Open",
      followUpOnly: true,
      description: "The new piers are operating. Warehouse firms now want a permanent banking partner for trade accounts and inventory finance.",
      choices: Object.freeze([
        Object.freeze({ id: "finance_harbor_trade", label: "Finance Trade · $250", cost: 250, rep: 3, market: 0.3, rival: -0.2, rivalId: "iron_crown", condition: "harbor_trade", duration: 5, result: "Warehouse deposits, trade fees, and working-capital demand moved into your Port Mercy branch.", kind: "good" }),
        Object.freeze({ id: "collect_bond_fees", label: "Collect Bond Fees", income: 180, condition: "underwriting_income", duration: 3, result: "The bank booked $180 in underwriting income and avoided increasing its harbor exposure.", kind: "neutral" }),
      ]),
    }),
    Object.freeze({
      id: "charter_hearing", category: "Arc Follow-up", icon: "⭐", title: "Territorial Charter Hearing",
      followUpOnly: true,
      description: "The examiners approve the network, subject to a final reserve contribution and common operating standards.",
      choices: Object.freeze([
        Object.freeze({ id: "accept_charter", label: "Accept Charter · $150", cost: 150, rep: 5, market: 0.45, rival: -0.2, rivalId: "continental", condition: "territorial_charter", duration: 6, result: "The network received its territorial charter, strengthening confidence and coordinated operations.", kind: "good" }),
        Object.freeze({ id: "decline_charter", label: "Decline Final Terms", rep: -2, condition: "local_independence", duration: 4, result: "The bank retained local discretion after absorbing the cost and scrutiny of the review.", kind: "neutral" }),
      ]),
    }),
    Object.freeze({
      id: "branch_compact", category: "Arc Follow-up", icon: "🤝", title: "Branch Directors Propose a Compact",
      followUpOnly: true,
      description: "Local directors propose a mutual compact: shared reserves and standards without accepting a territorial charter.",
      choices: Object.freeze([
        Object.freeze({ id: "form_mutual_compact", label: "Form Compact · $200", cost: 200, rep: 4, market: 0.25, rival: -0.3, rivalId: "pioneer", condition: "mutual_compact", duration: 5, result: "The branches pooled resources under local governance and checked Pioneer Mutual's community campaign.", kind: "good" }),
        Object.freeze({ id: "preserve_full_autonomy", label: "Preserve Full Autonomy", condition: "local_independence", duration: 5, result: "Every branch kept independent authority, preserving loyalty at the cost of network efficiency.", kind: "neutral" }),
      ]),
    }),
  ]);

  function migrateWorld(bank) {
    const existing = bank.world || {};
    bank.world = {
      location: existing.location || "Silver Creek",
      activeConditions: Array.isArray(existing.activeConditions)
        ? existing.activeConditions.filter(condition => CONDITIONS[condition.id] && condition.remainingDays > 0)
        : [],
      history: Array.isArray(existing.history) ? existing.history.slice(0, 20) : [],
      pendingEvents: Array.isArray(existing.pendingEvents)
        ? existing.pendingEvents.filter(pending => worldEventDefinition(pending.eventId)?.followUpOnly && Number.isFinite(Number(pending.dueDay))).slice(0, 8)
          .map(pending => ({ eventId: pending.eventId, dueDay: Math.max(1, Math.floor(Number(pending.dueDay))), sourceEventId: pending.sourceEventId || null }))
        : [],
      resolvedEventIds: Array.isArray(existing.resolvedEventIds)
        ? [...new Set(existing.resolvedEventIds.filter(id => worldEventDefinition(id)))].slice(-32)
        : [],
      lastQueuedFollowUpId: existing.lastQueuedFollowUpId || null,
      lastQueuedFollowUpDay: Number(existing.lastQueuedFollowUpDay) || 0,
      lastEventDay: Number(existing.lastEventDay) || 0,
      lastEmergencyDay: Number(existing.lastEmergencyDay) || -99,
      emergencyLoansTaken: Number(existing.emergencyLoansTaken) || 0,
    };
    return bank;
  }

  function modifiers(bank) {
    const combined = { ...DEFAULT_MODIFIERS };
    for (const active of bank.world?.activeConditions || []) {
      const definition = CONDITIONS[active.id];
      if (!definition) continue;
      for (const [key, value] of Object.entries(definition.modifiers || {})) {
        if (key === "marketShareDaily") combined[key] += value;
        else combined[key] *= value;
      }
    }
    return combined;
  }

  function activateCondition(bank, id, duration, source) {
    migrateWorld(bank);
    const existing = bank.world.activeConditions.find(condition => condition.id === id);
    if (existing) {
      existing.remainingDays = Math.max(existing.remainingDays, duration);
      existing.source = source || existing.source;
    } else if (CONDITIONS[id]) {
      bank.world.activeConditions.push({ id, remainingDays: duration, source });
    }
  }

  function advanceConditions(bank) {
    migrateWorld(bank);
    const expired = [];
    bank.world.activeConditions = bank.world.activeConditions.filter(condition => {
      condition.remainingDays -= 1;
      if (condition.remainingDays <= 0) {
        expired.push(CONDITIONS[condition.id]?.label || condition.id);
        return false;
      }
      return true;
    });
    return expired;
  }

  function eventEligible(event, bank) {
    if (!event || event.followUpOnly) return false;
    const locationId = bank.locationId || "silver_creek";
    const branchCount = Math.max(1, bank.campaign?.branches?.length || 1);
    if (event.regions && !event.regions.includes(locationId)) return false;
    if (event.minBranches && branchCount < event.minBranches) return false;
    if (event.minPrestige && (Number(bank.prestigeLevel) || 0) < event.minPrestige) return false;
    if (event.minDay && (Number(bank.day) || 1) < event.minDay) return false;
    if (event.once && bank.world.resolvedEventIds.includes(event.id)) return false;
    return true;
  }

  function selectWorldEvent(bank, random = Math.random, excludedIds = []) {
    migrateWorld(bank);
    const excluded = new Set(excludedIds);
    const dueFollowUp = bank.world.pendingEvents
      .filter(pending => pending.dueDay <= bank.day && !excluded.has(pending.eventId))
      .map(pending => ({ pending, event: worldEventDefinition(pending.eventId) }))
      .filter(({ event }) => event && (!event.requiresStaff || (bank.staff || []).length > 0))
      .find(({ event }) => !(bank.world.lastQueuedFollowUpDay === bank.day && bank.world.lastQueuedFollowUpId === event.id));
    if (dueFollowUp) {
      bank.world.lastQueuedFollowUpId = dueFollowUp.event.id;
      bank.world.lastQueuedFollowUpDay = bank.day;
      return dueFollowUp.event;
    }
    const recentIds = new Set(bank.world.history
      .filter(entry => bank.day - entry.day < 5)
      .map(entry => entry.eventId));
    let eligible = WORLD_EVENTS.filter(event =>
      eventEligible(event, bank) &&
      (!event.requiresStaff || (bank.staff || []).length > 0)
      && !recentIds.has(event.id)
      && !excluded.has(event.id)
    );
    if (!eligible.length) eligible = WORLD_EVENTS.filter(event => eventEligible(event, bank) &&
      (!event.requiresStaff || (bank.staff || []).length > 0) && !excluded.has(event.id)
    );
    if (!eligible.length) eligible = WORLD_EVENTS.filter(event => eventEligible(event, bank) && (!event.requiresStaff || (bank.staff || []).length > 0));
    return eligible[Math.min(eligible.length - 1, Math.floor(random() * eligible.length))];
  }

  function worldEventDefinition(id) {
    return WORLD_EVENTS.find(event => event.id === id) || null;
  }

  function recordHistory(bank, entry) {
    migrateWorld(bank);
    bank.world.history.unshift({ day: bank.day, ...entry });
    bank.world.history = bank.world.history.slice(0, 20);
  }

  function scheduleFollowUp(bank, sourceEventId, followUp) {
    migrateWorld(bank);
    const event = worldEventDefinition(followUp?.eventId);
    if (!event?.followUpOnly) return null;
    const dueDay = bank.day + Math.max(1, Math.floor(Number(followUp.delay) || 1));
    const existing = bank.world.pendingEvents.find(pending => pending.eventId === event.id);
    if (existing) {
      existing.dueDay = Math.min(existing.dueDay, dueDay);
      return existing;
    }
    const pending = { eventId: event.id, dueDay, sourceEventId };
    bank.world.pendingEvents.push(pending);
    bank.world.pendingEvents.sort((a, b) => a.dueDay - b.dueDay);
    bank.world.pendingEvents = bank.world.pendingEvents.slice(0, 8);
    return pending;
  }

  function pendingFollowUps(bank) {
    migrateWorld(bank);
    return bank.world.pendingEvents.map(pending => ({ ...pending, event: worldEventDefinition(pending.eventId) })).filter(pending => pending.event);
  }

  function resolveWorldEvent(bank, eventId, choiceId) {
    migrateWorld(bank);
    const event = WORLD_EVENTS.find(entry => entry.id === eventId);
    const choice = event?.choices.find(entry => entry.id === choiceId);
    if (!event || !choice) return { msg: "The opportunity has passed.", kind: "neutral" };
    if (choice.cost && bank.cash < choice.cost) return { msg: `The branch cannot afford the $${choice.cost} response.`, kind: "warn" };
    if (choice.cost) {
      bank.cash -= choice.cost;
      bank.profit -= choice.cost;
      if (bank.dayMetrics) bank.dayMetrics.eventCosts = (bank.dayMetrics.eventCosts || 0) + choice.cost;
    }
    if (choice.income) {
      bank.cash += choice.income;
      bank.profit += choice.income;
      if (bank.dayMetrics) bank.dayMetrics.eventIncome = (bank.dayMetrics.eventIncome || 0) + choice.income;
    }
    if (choice.rep) bank.rep = Math.max(0, Math.min(100, bank.rep + choice.rep));
    if (choice.market) bank.marketShare = Math.max(1, bank.marketShare + choice.market);
    if (choice.rival) {
      const rivalId = choice.rivalId || "continental";
      if (typeof BankCampaign !== "undefined") {
        BankCampaign.adjustRivalShare(bank, rivalId, bank.locationId || "silver_creek", choice.rival);
      } else if (rivalId === "continental") bank.rivalShare = Math.max(1, bank.rivalShare + choice.rival);
    }
    if (choice.condition) activateCondition(bank, choice.condition, choice.duration, event.title);
    if (event.followUpOnly) {
      bank.world.pendingEvents = bank.world.pendingEvents.filter(pending => pending.eventId !== event.id);
      if (bank.world.lastQueuedFollowUpId === event.id) bank.world.lastQueuedFollowUpId = null;
    }
    if (choice.followUp) scheduleFollowUp(bank, event.id, choice.followUp);
    if (event.once && !bank.world.resolvedEventIds.includes(event.id)) bank.world.resolvedEventIds.push(event.id);
    bank.world.lastEventDay = bank.day;
    recordHistory(bank, {
      eventId: event.id,
      eventTitle: event.title,
      choiceId: choice.id,
      choiceLabel: choice.label.replace(/ · \$[\d,]+$/, ""),
      result: choice.result,
    });
    return { msg: choice.result, kind: choice.kind || "neutral" };
  }

  function canUseEmergencyCredit(bank) {
    migrateWorld(bank);
    const reserveRatio = bank.deposits > 0 ? bank.cash / bank.deposits : 1;
    const stressed = bank.cash < 800 || reserveRatio < 0.15;
    return stressed && bank.day - bank.world.lastEmergencyDay >= 7;
  }

  function drawEmergencyCredit(bank) {
    if (!canUseEmergencyCredit(bank)) return { ok: false, message: "Emergency credit is only available during a liquidity shortage and has a seven-day cooldown." };
    bank.cash += 750;
    bank.debt += 900;
    bank.debtPaymentAmount += 25;
    bank.rep = Math.max(0, bank.rep - 2);
    bank.world.lastEmergencyDay = bank.day;
    bank.world.emergencyLoansTaken += 1;
    recordHistory(bank, {
      eventId: "emergency_credit",
      eventTitle: "Emergency Credit Line",
      choiceLabel: "Draw $750",
      result: "$750 cash received; debt increased by $900 and scheduled payments rose by $25.",
    });
    return { ok: true, message: "Emergency credit supplied $750 cash. Debt increased by $900; reputation -2." };
  }

  function canSellParticipation(bank) {
    return bank.cash < 1_000 && (bank.loansOut || 0) >= 200;
  }

  function sellLoanParticipation(bank, share = 0.25) {
    if (!canSellParticipation(bank)) return { ok: false, message: "Loan participation sales require low cash and at least $200 in outstanding loans." };
    const safeShare = Math.max(0.1, Math.min(0.5, share));
    let principalSold = 0;
    for (const loan of bank.loanBook || []) {
      const sold = loan.balance * safeShare;
      principalSold += sold;
      loan.balance *= 1 - safeShare;
      loan.originalPrincipal *= 1 - safeShare;
      loan.scheduledPayment *= 1 - safeShare;
      loan.principalPerPayment *= 1 - safeShare;
      loan.interestPerPayment *= 1 - safeShare;
    }
    const proceeds = principalSold * 0.92;
    const loss = principalSold - proceeds;
    bank.cash += proceeds;
    bank.profit -= loss;
    if (bank.dayMetrics) bank.dayMetrics.eventCosts = (bank.dayMetrics.eventCosts || 0) + loss;
    bank.loansOut = (bank.loanBook || []).reduce((sum, loan) => sum + loan.balance, 0);
    migrateWorld(bank);
    recordHistory(bank, {
      eventId: "participation_sale",
      eventTitle: "Loan Participation Sale",
      choiceLabel: "Sell 25%",
      result: `$${Math.round(proceeds)} cash raised at an $${Math.round(loss)} discount.`,
    });
    return { ok: true, proceeds, loss, principalSold, message: `$${Math.round(proceeds)} cash raised by selling part of the loan book; $${Math.round(loss)} loss recognized.` };
  }

  function activeConditionDetails(bank) {
    migrateWorld(bank);
    return bank.world.activeConditions.map(active => ({ ...active, ...CONDITIONS[active.id] }));
  }

  return Object.freeze({
    DEFAULT_MODIFIERS,
    CONDITIONS,
    WORLD_EVENTS,
    migrateWorld,
    modifiers,
    activateCondition,
    advanceConditions,
    selectWorldEvent,
    eventEligible,
    worldEventDefinition,
    recordHistory,
    scheduleFollowUp,
    pendingFollowUps,
    resolveWorldEvent,
    canUseEmergencyCredit,
    drawEmergencyCredit,
    canSellParticipation,
    sellLoanParticipation,
    activeConditionDetails,
  });
});
