# Bank Manager — Focused Game Design

## The promise

Run the only bank in a small frontier town. Learn who lives there, decide which plans deserve backing, protect depositors' money, and slowly turn a bare counter into a beloved local institution.

The game should feel warm, readable, and personal. Banking is the theme; people and judgment are the fun.

## Design test

Every mechanic must answer at least one of these questions:

1. Does this make a customer decision more interesting?
2. Does this make the bank feel more personal or visibly improved?
3. Does this create a clear tradeoff between safety, profit, and community trust?

If the answer is no, the mechanic is removed or deferred.

## Core loop

Each day contains a sixty-second public service shift followed by an unhurried management phase.

1. Open the branch and watch the first customers enter.
2. Move to the wicket before patience runs out.
3. Complete a short service sequence by timing two or three clear actions.
4. Build a run of accurate service while keeping a growing line from losing patience.
5. Finish the shift and review customers served, service quality, earnings, and anyone lost.
6. Make one unhurried staffing, improvement, or town-project choice after closing.
7. Return the next day to a busier room, familiar faces, and visible consequences.

The short loop is:

`Notice → Prioritize → Serve → Recover → Improve`

## What makes good daytime service

A customer needs a recognizable person, a readable request, and a service rhythm the player can learn.

- Accounts require checking identity and stamping the ledger.
- Deposits require counting notes and posting the total.
- Withdrawals require verifying the signature and counting the payout.
- Loan consultations require reviewing the purpose, checking the figures, and preparing terms.

The player does not approve or deny ordinary loan applications. The bank serves the customer and structures the best loan its cash and underwriting quality allow. Accurate work improves fees, standing, and loan quality; rushed work lowers rewards and can leave a riskier portfolio. Financial strategy comes from staffing, improvements, liquidity, and larger after-hours town commitments—not a repeated pair of moralized buttons.

## Player resources

The main play screen exposes only four resources:

- **Cash:** money available now.
- **Capital:** the bank's financial cushion.
- **Standing:** the town's trust in the bank.
- **Shift:** time remaining and customers served.

Loans and deposits exist in the simulation but appear in service requests, the ledger, and after-hours planning—not as permanent opening-screen homework.

## Progression

Progression deepens the same loop instead of replacing it with unrelated systems.

### Chapter 1 — The counter

- A sixty-second shift with a readable customer queue.
- Two-step deposits, withdrawals, and account openings.
- Three-step loan consultations whose quality changes the resulting loan.
- A simple recap of throughput, accuracy, and finances.
- One small branch and a handful of recurring townspeople.

### Chapter 2 — A better bank

- A teller can handle routine services.
- The player keeps longer loan files and unusual customer requests.
- A few visible improvements solve specific problems: a second counter, a safer vault, a comfortable waiting area, and a loan desk.
- Improvements change the room and the loop; there are no decorative filler upgrades.

### Chapter 3 — The town grows

- Returning customers reveal consequences and new chapters in their lives.
- Local events change which cases appear.
- The player chooses a simple bank identity such as cautious, community-first, or growth-minded through repeated actions—not a separate policy spreadsheet.
- A final town project asks the player to risk something meaningful and provides a satisfying campaign conclusion.

## Seven-day campaign shape

The focused campaign is one week in Silver Creek, not a march toward regional expansion.

- **Days 1–3 — Belonging:** learn the counter, meet the recurring cast, and see early loan consequences.
- **Day 4 — Proposal:** Elena and Samir ask the bank to help test a cooperative mill plan.
- **Days 5–6 — Commitment:** normal obligations continue while local suppliers ask who should carry the early risk.
- **Day 7 — Decision:** choose between a larger cooperative mill loan and a smaller, safer repair.
- **Conclusion:** the ledger names the bank's identity from its actual lending and town choices, resolves the mill, and allows open-ended continuation.

Early commitments must change the final numbers. Careful preparation makes the cooperative cheaper and less risky; choosing cash-preserving paths leaves the larger plan more dangerous. The final choice is not a morality test: both outcomes keep Silver Creek alive in different ways.

## Features removed from the core game

The following systems are not part of the focused campaign until the service loop proves fun in repeated playtests:

- multiple regions and branch travel;
- rival market-share simulation;
- deposit-rate and fee-pricing matrices;
- broad customer-segment dashboards;
- staff training levels and assignment micromanagement;
- bank-wide lending policy configuration;
- technology trees and prestige ladders;
- random compliance, tax, insurance, and investment systems;
- active stock or securities trading;
- large achievement and telemetry surfaces inside the play menu;
- real-time queue pressure as the primary source of difficulty.

Existing prototype code for these systems may remain temporarily for save compatibility and evaluation, but it is not authoritative game design and should stay hidden from the opening experience.

## Time and pressure

The public shift is timed; all reading and strategic decisions are not. Customer requests use large icons and short labels during the shift. Longer stories, loan details, improvements, and town commitments appear after closing or in optional records where the clock is paused.

The service challenge rewards rhythm rather than twitch speed. Timing zones are generous, a miss still completes the step, and failure reduces quality instead of stopping progress. Difficulty comes from reading queue pressure, recovering from rushed work, and building a branch that can handle more customers.

## Economy rules

The economy uses only the detail needed to support decisions:

- deposits raise cash but remain money owed to customers;
- loans spend cash now and return principal plus interest over time;
- defaults reduce capital;
- rent and wages are predictable daily costs;
- the ledger explains every change in plain language.

The player should be able to answer “why did my bank gain or lose money today?” without knowing accounting terminology.

## Daily recap

The recap leads with:

- today's profit or loss;
- closing cash and capital;
- customers served, service accuracy, and customers lost;
- one sentence explaining the most important cause;
- the next known obligation.

A full ledger remains available for players who want it, but it is collapsed by default.

## Tone and presentation

- Frontier-town warmth rather than corporate dashboards.
- Named customers with grounded needs.
- Short sentences and plain-language financial effects.
- Calm animation, tactile sound, and visible room improvements.
- No pop-up streaks, daily rewards, currencies, energy timers, or manipulative retention mechanics.

## Current build sequence

### Slice A — Timed service shift

- Begin at the open teller counter.
- Spawn a steady, bounded customer queue for sixty seconds.
- Give each service a two- or three-step timing sequence.
- Convert timing quality into satisfaction, fees, and underwriting quality.
- Keep misses recoverable and all strategic reading outside the clock.
- End with a concise service-and-finance recap.

Exit test: a new player can serve a complete shift without a guide, understands why accuracy matters, and immediately wants to improve their next run.

### Slice B — Consequences and familiarity

- Add a small cast of recurring Silver Creek customers.
- Record prior service and loan outcomes per customer.
- Return at least two early loans as later customer consequences.
- Give each day a small authored theme.

Exit test: players remember at least two customers and are curious about what happens next.

Implementation status: the recurring cast, saved visit history, day themes, and two-day loan consequences are built. Loan follow-ups now reflect the quality-based service result rather than a repeated approve/deny choice. Blind-player memory and curiosity testing is still required before this slice is considered proven.

### Slice C — Meaningful improvements

- Reduce upgrades to four visible, mechanically distinct choices.
- Unlock the first teller only after routine work has become familiar.
- Let the teller remove repetition while preserving judgment cases.
- Present one improvement choice at day end instead of a large management dashboard.

Exit test: earning the first teller changes the rhythm and feels like a reward.

Implementation status: the catalog exposes only four purpose-built improvements. Mara clears routine services while loan files remain interactive, hiring and the first improvement appear after closing, and the former policy, training, pricing, prestige, achievement, and telemetry walls stay out of the opening flow. Delegated service uses a small receipt instead of another modal. The revised timed rhythm still requires phone and blind playtesting before this slice is proven.

### Slice D — Focused campaign

- Build a sequence of local projects and customer stories.
- Infer the bank's identity from play.
- Add a final town-defining decision and authored conclusion.
- Balance for several viable styles.

Exit test: the campaign has a beginning, escalation, climax, and memorable ending without requiring regional expansion.

Implementation status: a seven-day Silver Creek mill arc presents authored after-hours choices on days 4, 6, and 7, never while the service clock runs. Early choices alter the final loan amount and risk; the conclusion resolves either the cooperative or repair plan and identifies the bank from accumulated play. Regional simulation stays out of the focused week. The relocated after-hours flow requires a new end-to-end playthrough before this slice is proven.

## Playtest questions

- Was the next action obvious without reading a manual?
- Did routine service feel quick rather than fake-strategic?
- Did at least one loan require thought?
- Could the player predict the immediate effect of each choice?
- Could the player explain the daily result?
- Did the branch feel calmer and more personal than a dashboard?
- Did the player want to meet the next customer?

## Definition of done

The game is complete when repeated blind playtests show that players understand the loop, care about customers, debate lending choices, enjoy improving the branch, and finish a focused local campaign with a satisfying conclusion. Feature count is not a completion metric.
