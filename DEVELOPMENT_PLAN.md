# Bank Manager Development Plan

## 1. Product Vision

**Bank Manager** is a management and strategy game about growing a small, hands-on bank into a prestigious multi-branch institution while outcompeting rival banks.

The player's role changes as the bank grows:

1. **Early game — Operator:** personally serve customers, process transactions, assess loan applications, and make judgment calls.
2. **Mid game — Manager:** hire specialized staff, place functional branch objects, establish policies, and optimize an increasingly autonomous branch.
3. **Late game — Executive:** open branches in new regions, allocate capital, respond to major events, compete for market share, and make institution-wide policy decisions.

The central challenge is deciding where limited time, attention, and capital will create the most leverage. The intended experience is a hybrid management sim and strategy game with narrative choices, not a fast arcade game.

## 2. Design Pillars

### Start hands-on, then scale

The player should understand banking operations by performing them before delegating them. Automation is earned through growth, staffing, infrastructure, and policy rather than being available from the beginning.

### Attention is a strategic resource

The player cannot personally handle everything. Each day creates tradeoffs between serving customers, resolving unusual cases, improving the branch, managing staff, reviewing finances, and planning expansion.

### Growth creates new decisions

Progression should replace repetitive low-level work with higher-level decisions. Individual customer interactions become less prominent as branches mature, while policies, major events, competition, and expansion become more important.

### Banking is a balancing act

Success requires profitability, liquidity, controlled lending risk, sufficient service capacity, and timely debt payments. Growth that is too aggressive should be dangerous.

### The branch is both a place and a system

Play should be approximately evenly split between physical movement in the branch and management interfaces. The player walks to handle work manually while using overlay menus to review information, set policies, hire staff, and place objects.

## 3. Core Gameplay Loop

### Daily loop

1. **Open the branch**
   - Review cash, upcoming obligations, staffing, and notable events.
   - Adjust priorities or policies before customers arrive.
2. **Operate during business hours**
   - Customers enter with deposits, withdrawals, account needs, loan applications, disputes, or unusual requests.
   - The player personally handles selected interactions or allows staff and policies to process them.
   - Background transactions continue as the branch becomes more automated.
   - The player moves through the branch, intervenes at stations, and uses management overlays.
3. **Make tradeoffs under time pressure**
   - Decide which customers, operational problems, staffing needs, events, or improvements deserve direct attention.
   - Balance service quality, fee income, net interest margin, liquidity, credit risk, and growth spending.
4. **Close the branch**
   - Business ends after a fixed number of daylight/business hours.
   - Remaining work is resolved according to defined closing rules.
5. **Review the day**
   - See an end-of-day recap covering financial performance, progress, upcoming obligations, and competitor activity.
   - Prepare staffing, policies, purchases, and priorities for the following day.

### Longer-term loop

`Operate → Earn → Improve capacity → Delegate → Set policy → Expand → Compete`

The player uses earnings and financing to add services, hire staff, improve branches, enter regions, gain prestige, and increase market share. Expansion raises fixed costs and risk, creating pressure to scale sustainably.

## 4. Player Progression

### Early game: one small branch

The player performs a mix of:

- Fast, skill-based transaction processing.
- Slower judgment calls using incomplete information.
- Dialogue and narrative choices.

Likely interactions include deposits, withdrawals, account openings, loan applications, fraud checks, and customer disputes. Good performance should involve tradeoffs among speed, accuracy, satisfaction, profitability, risk, and ethics rather than a single universal score.

### Mid game: an autonomous branch

The player begins delegating routine work by:

- Hiring staff with specialties and expertise.
- Adding desks, offices, vaults, security, and customer amenities.
- Defining lending and operating policies.
- Monitoring throughput, queues, liquidity, and results.
- Intervening personally in exceptions and major customer cases.

Staff should generally be dependable rather than randomly incompetent. Expertise affects what employees can handle and how efficiently they do it. Staff fraud may appear as a rare narrative event instead of a constant simulation.

### Late game: a banking network

The focus moves to:

- Opening and funding branches.
- Selecting regions based on demographics, rent, crime, and growth.
- Defining bank-wide service and lending policies.
- Allocating capital among branches.
- Responding to large narrative and economic events.
- Tracking competitor expansion and market share.
- Growing prestige, institutional size, and regional reach.

## 5. Economy and Risk

### Revenue

Primary revenue sources:

- Account and service fees.
- Transaction fees.
- Net interest margin: interest earned on loans minus interest paid on deposits and other funding.
- Market-linked fee income where appropriate, without turning the game into an active stock-trading simulator.

### Costs

Primary ongoing costs:

- Staff wages.
- Branch rent.
- Debt payments.
- Equipment and branch operating costs.
- Security.
- Loan defaults.
- Expansion and setup costs.

Taxes and insurance should be omitted or abstracted unless later testing shows they add useful decisions.

### Simplified balance sheet

The simulation should expose enough structure to create authentic banking decisions without requiring accounting expertise:

- **Cash/reserves:** funds available for withdrawals, operations, and obligations.
- **Customer deposits:** a funding source and a liability to customers.
- **Outstanding loans:** earning assets that generate interest but can default.
- **Debt:** external financing with scheduled payments.
- **Equity/net worth:** the bank's financial cushion and long-term value.

Deposits can fund loans and expansion, creating liquidity risk. Clear forecasts and warnings must help the player understand why cash is rising or falling.

### Failure state

The player fails when the bank becomes bankrupt or cannot meet required debt obligations. The game should warn the player in advance and provide recovery options where reasonable, such as slowing expansion, taking expensive emergency financing, or selling assets.

## 6. Core Systems

### Customers and transactions

Each customer should have a purpose, service need, patience level, value, and relevant risk information. Early customer cases should feel distinct through varied circumstances and incomplete information. Later, routine customers can be represented by aggregated background flows while unusual or strategically important cases remain interactive.

Initial transaction types:

- Deposit.
- Withdrawal.
- Account opening.
- Loan application and approval.

Later candidates:

- Fraud review.
- Disputes and complaints.
- Higher-value business customers.
- Special narrative cases.

### Lending

Early in the game, the player reviews individual applicants. A loan decision should present understandable indicators such as requested amount, purpose, income, collateral, credit risk, expected return, and default probability.

Later, the player defines policies that staff apply, such as:

- Minimum applicant quality.
- Maximum loan size.
- Interest rate or pricing bands.
- Preferred customer segments.
- Risk appetite.

Policies should produce visible tradeoffs: aggressive lending increases volume and interest income but raises defaults and liquidity pressure; conservative lending protects the balance sheet but may surrender growth and market share.

### Staff

Staff are primarily a source of capacity and expertise. The system should support:

- Hiring and wages.
- Roles and workstations.
- Specialties or expertise.
- Service speed and case-handling limits.
- Training or advancement.
- Rare narrative events such as fraud, demands, or personal situations.

Routine underperformance should not create excessive micromanagement.

### Branch construction and objects

Objects must have clear mechanical purposes:

| Object | Primary effect |
| --- | --- |
| Teller desk | Adds transaction throughput and a staff workstation |
| Manager/loan office | Enables private meetings and loan processing |
| Vault | Raises cash capacity and supports larger operations |
| Security equipment | Reduces theft and crime-related risk |
| Waiting area | Raises customer patience and satisfaction |
| Service kiosk/technology | Automates routine transactions |

Placement should matter enough to make the physical branch engaging, but path optimization should not overwhelm the management game.

### Locations and regions

Branch locations differ primarily by:

- Customer demographics and service demand.
- Rent and operating cost.
- Crime and security risk.
- Economic and population growth.

These factors should alter which services, staffing model, and risk policies work best.

### Competitors

Rival banks compete mainly through:

- Branch expansion.
- Regional market share.
- Narrative actions and events.

Competition should be legible and consequential without requiring every rival branch to run the player's full simulation. Rivals may capture customers, enter attractive regions, trigger pricing or reputation events, and force strategic responses.

### Events and narrative choices

Events create variation and connect the bank to its world. They may arise from customers, staff, crime, economic changes, or competitors. Choices should affect finances, risk, reputation, customer segments, or future opportunities rather than existing as isolated flavor text.

## 7. Information and Interface

### In-world play

- Move through a branch.
- Approach customers and workstations.
- Perform selected transactions or decisions.
- Observe queues, staffed stations, and branch activity.

### Management overlay

- Review finances and liquidity.
- Hire and assign staff.
- Place and purchase objects.
- Set lending and operating policies.
- Review branches and regions.
- Track goals, prestige, and competition.

### End-of-day recap

The recap is primarily informational and should highlight:

- Revenue, costs, and daily profit/loss.
- Cash position and change in liquidity.
- Deposits, loans issued, repayments, and defaults.
- Operational progress and major events.
- Upcoming wages, rent, debt payments, and other obligations.
- Competitor activity and market-share changes.

Every important result should link or drill down to its cause so the recap teaches the player how the simulation works.

## 8. Development Strategy

Build the game as a sequence of playable vertical slices. Validate the moment-to-moment branch experience and the economy before investing in multi-region strategy.

### Milestone 0 — Preproduction and technical foundation

**Goal:** establish the smallest technical framework needed to iterate on the game.

Deliverables:

- Select engine, target platform, camera perspective, and input model.
- Define a fixed-step game clock and save/load approach.
- Create data definitions for customers, transactions, loans, staff, objects, branches, and daily financial entries.
- Establish debug tools for money, time, spawning customers, and inspecting simulation state.
- Produce low-fidelity branch and UI wireframes.
- Define baseline tuning units: day length, currency scale, service time, and customer volume.

Exit criteria:

- A player can enter a placeholder branch, move, interact with a station, advance time, and save/load without losing core state.

### Milestone 1 — Hands-on branch prototype

**Goal:** prove that manually running a small bank is understandable and enjoyable.

Deliverables:

- One small branch layout.
- Business-hours clock and day open/close flow.
- Customer spawning, queues, patience, and departures.
- Deposits, withdrawals, account openings, and simple loan applications.
- Mixed interaction model: quick processing, judgment decisions, and short dialogue choices.
- Basic cash, deposits, loans, fee income, interest, costs, and daily P&L.
- End-of-day recap.
- Bankruptcy/debt-payment failure check.

Exit criteria:

- A new player can complete several days, explain how the bank earns money, identify an impending cash problem, and make meaningful choices about which work to handle.

### Milestone 2 — Staffing, objects, and delegation

**Goal:** prove the transition from operator to manager.

Deliverables:

- Hiring, wages, roles, specialties, and staff assignment.
- Functional teller desks, offices, vaults, waiting areas, security, and automation equipment.
- Placement/build mode.
- Staff processing for routine customer work.
- Lending policy controls used by staff.
- Background deposits and withdrawals.
- Capacity, queue, and service-quality reporting.

Exit criteria:

- The player can transform a manually operated branch into a mostly autonomous one, and policy/staffing choices visibly change profit, risk, and throughput.

### Milestone 3 — Full branch economy and events

**Goal:** create a sustainable medium-term management game.

Deliverables:

- Loan repayment schedules, defaults, and risk forecasting.
- Liquidity management using customer deposits.
- Debt and scheduled obligations.
- Expanded services and customer segments.
- Location demographics, rent, crime, and growth modifiers.
- Customer, staff, economic, crime, and competitor events.
- Reputation/prestige progression.
- Balance and usability pass on financial reporting.

Exit criteria:

- A campaign across many in-game days supports multiple viable strategies and creates recoverable financial pressure without unexplained failures.

### Milestone 4 — Multi-branch strategy layer

**Current vertical-slice status:** implemented with four regions, branch-opening and capital-transfer flows, scheduled next-day branch visits with per-branch financial books, staff, upgrades and floor layouts, branch-level lending, customer-focus, deposit-pricing, and fee policies, deterministic off-screen simulation that applies those tradeoffs, three persistent rival institutions with strategy-specific campaigns and expansion behavior, consolidated reporting, and campaign goals. Additional rival and event content remain later refinements.

**Goal:** prove the shift from branch manager to banking executive.

Deliverables:

- Regional map and branch acquisition/opening flow.
- Per-region demand, costs, crime, and growth.
- Capital allocation between branches.
- Branch-level and bank-wide policies.
- Aggregated simulation for branches not currently visited.
- Rival banks, expansion behavior, and market share.
- Major strategic and narrative events.

Exit criteria:

- The player can operate multiple differentiated branches, make bank-wide tradeoffs, and understand how decisions affect regional competition and overall solvency.

### Milestone 5 — Progression, content, and release preparation

**Current vertical-slice status:** campaign goals and victory conditions are playable; the first campaign completion now presents a persistent, accessible narrative legacy report derived from the player's dominant branch focus, lending posture, strongest institution, financial results, and leading rival, with a replay entry in Regions and an explicit transition into open-ended play; ten persistent achievements cover the operator-to-executive arc; contextual guidance and a financial handbook explain branch pricing and core finance; mechanic exposure is staged from teller work through staffing/building and credit management to pricing and regional strategy; high contrast, reduced motion, scalable interface text, exclusive dialog ownership, focus containment, keyboard dismissal, safe-area sizing, and collision-free Build/Ledger behavior are implemented; the canvas enforces a six-megapixel ceiling, caches static scenery, throttles clock DOM work, and drops to low-rate drawing behind modals; a repeatable runtime audit verifies performance and overflow-free UI at four viewports plus extra-large text; synthesized game feedback has persistent sound and volume controls; branded web/Windows icon assets are packaged; twenty-three strategic events span regional, economic, competitor, staff, crime, and delayed follow-up pressures, including one-time Ironwood timber, Port Mercy harbor, and territorial-charter arcs gated by location and campaign stage with named-rival and visible income consequences; bounded local-only telemetry exposes balance signals and a JSON playtest report; a deterministic 240-day matrix verifies conservative, balanced, and growth campaign viability across distinct pricing postures; validated all-slot archives move saves between platforms; desktop saves use atomic per-user storage; the installable web build caches its complete application shell for offline startup; standard gamepads cover movement, decisions, management, and build placement; validated platform capability hooks isolate future native achievements and rich presence from gameplay; original key art now drives an exact-dimension Steam capsule/library package and nine reproducible gameplay screenshots; and both portable and assisted Windows installer targets have a documented, checksum-based distribution policy. Further authored arcs are content expansion rather than a missing narrative system. Physical controller/Steam Deck QA, the actual Steamworks provider/partner configuration, store-page review, clean-machine installer certification, and production signing remain.

**Goal:** turn the validated systems into a complete, replayable game.

Deliverables:

- Service, staff, technology, branch, region, prestige, and size unlocks.
- Campaign goals and victory conditions.
- Rival and event content sufficient for replayability.
- Tutorial and contextual explanations.
- Accessibility, controls, performance, audio, and visual polish.
- Economy balancing, telemetry, QA, and platform packaging.

Exit criteria:

- The full campaign delivers a clear operator-to-executive arc, stable saves, understandable financial outcomes, and a satisfying conclusion.

## 9. Recommended MVP Scope

The first public or internal MVP should stop at a strong version of Milestone 2. It should contain:

- One branch and one location profile.
- Four core customer interaction types.
- A small staff roster with a few specialties.
- Six functional branch objects.
- A simplified but internally consistent balance sheet.
- Manual loan approval plus one staff lending-policy screen.
- Several event templates.
- A complete day loop and clear recap.
- Bankruptcy as the loss state.

Do not include multiple regions, detailed rival simulation, active investments, taxes, insurance, or a large narrative campaign until the branch loop and delegation transition are proven.

## 10. Technical Architecture Priorities

- **Data-driven content:** define services, objects, staff specialties, events, and locations outside gameplay code.
- **Layered simulation:** keep customer behavior, branch operations, finance, and campaign strategy separate but connected through explicit events and financial entries.
- **Inspectable accounting:** every balance change needs a category and source so the recap can explain it.
- **Scalable fidelity:** simulate the active branch at individual-customer level and inactive branches in aggregate while keeping outcomes comparable.
- **Policy reuse:** staff and off-screen branches should use the same policy definitions.
- **Deterministic testing:** allow seeded days and events so economic bugs can be reproduced.
- **Save migrations:** use versioned save data because the economy and content schema will change throughout development.

## 11. Testing and Validation

Each playtest should answer specific questions:

- Is manual customer processing clear, varied, and satisfying?
- Does time pressure create prioritization without feeling frantic?
- Can players explain profit, cash, deposits, loans, and debt in their own words?
- Do players understand that deposits are funding but also obligations?
- Is hiring the first employee a meaningful change in play?
- Does delegation reduce repetition without removing interesting decisions?
- Can players trace recap numbers to events from the day?
- Are aggressive and conservative lending both viable in different circumstances?
- Does opening a new branch feel like a strategic commitment rather than a linear upgrade?
- Do bankruptcy warnings arrive early enough to support informed recovery attempts?

## 12. Major Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Manual transactions become repetitive | Keep the transaction set small initially, add meaningful exceptions, and introduce delegation before mastery becomes grind |
| Finance is confusing | Use plain-language forecasts, consistent accounting, drill-down explanations, and progressive disclosure |
| Automation removes the fun | Shift attention toward policies, exceptions, events, capital allocation, and expansion as routine work disappears |
| Physical movement feels like wasted time | Keep the branch compact, make travel readable, and ensure movement reveals useful operational information |
| Detailed branches do not scale | Use individual simulation only for the active branch and an aggregate model elsewhere |
| Random events feel arbitrary | Telegraph risks, connect event probability to player state, and offer decisions with understandable consequences |
| One optimal growth strategy dominates | Differentiate locations and customer segments, create liquidity constraints, and test multiple lending/staffing approaches |

## 13. Open Design Decisions

Resolve these during preproduction or the relevant milestone:

Decisions 7 and 8 are now resolved for the vertical slice: there is no player-facing central rate, each branch chooses a simplified deposit-pricing posture and fee strategy, lending policy supplies the loan-pricing/risk posture, and every option exposes its demand, income, funding-cost, and market-share effects.

1. Engine, platforms, camera perspective, and control scheme.
2. Exact duration and pace of an in-game day.
3. How transactions are mechanically performed: forms, timed inputs, dialogue, spatial actions, or a combination.
4. Which performance dimensions are surfaced to the player and how ethics affects the game.
5. Whether reputation is global, regional, customer-segment-specific, or a combination.
6. Victory conditions beyond growth and competitive dominance.
7. How interest rates are set and whether a simplified central/economic rate exists.
8. How much control the player has over account fees, deposit rates, and loan pricing.
9. Rules for unresolved queues and work at closing time.
10. Whether the player can revisit and physically operate any branch or has one active headquarters.
11. How competitors affect pricing and customer demand without becoming opaque or overly complex.
12. Desired visual tone, setting, and level of realism.

## 14. Immediate Next Steps

1. Decide the engine, target platform, camera, and interaction model.
2. Write a one-page specification for a single customer visit from arrival through departure.
3. Define the first four transactions and the information each presents.
4. Draft the minimum balance-sheet and daily-ledger rules with example numbers.
5. Wireframe the in-world interaction, management overlay, loan decision, and end-of-day recap.
6. Build Milestone 0, then test a gray-box version of one complete day before adding content.
