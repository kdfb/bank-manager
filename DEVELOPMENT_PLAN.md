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

Each day is a short, self-contained set of five appointments.

1. Open at the teller counter.
2. Meet a customer and understand what they need.
3. Process routine work quickly or make a consequential lending choice.
4. See the result immediately in cash, capital, and standing.
5. Finish five appointments and review one clear daily result.
6. Spend earnings on one useful improvement when it solves a felt problem.
7. Return the next day to new people, new stories, and the consequences of prior loans.

The short loop is:

`Meet → Understand → Decide → See consequence → Improve`

## What makes a good customer case

A case needs a person, a concrete goal, and a real tradeoff.

Routine services—opening an account, making a deposit, or collecting an affordable withdrawal—use one clear action. The game must not pretend that an obviously correct service is a strategic choice.

Loan cases are the heart of the game. A loan decision shows:

- who is asking and what the money enables;
- cash committed today;
- likely earnings if repaid;
- understandable risk and expected loss;
- the standing consequence of turning the customer away.

Neither approval nor refusal should be universally correct. A safe applicant may arrive when the vault is low. A risky project may be important to the town. A profitable loan may delay a needed bank improvement.

## Player resources

The main play screen exposes only four resources:

- **Cash:** money available now.
- **Capital:** the bank's financial cushion.
- **Standing:** the town's trust in the bank.
- **Appointments:** progress through today's five customers.

Loans and deposits exist in the simulation but appear in the ledger and relevant decisions, not as permanent opening-screen homework.

## Progression

Progression deepens the same loop instead of replacing it with unrelated systems.

### Chapter 1 — The counter

- Five appointments per day.
- Routine deposits, withdrawals, and account openings.
- Personal loan decisions with visible forecasts.
- A simple daily recap.
- One small branch and a handful of recurring townspeople.

### Chapter 2 — A better bank

- A teller can handle routine appointments.
- The player keeps unusual customers and lending decisions.
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

Early commitments must change the final numbers. Careful preparation makes the cooperative cheaper and less risky; declining early commitments preserves cash but leaves the larger plan more dangerous. The final choice is not a morality test: both outcomes keep Silver Creek alive in different ways.

## Features removed from the core game

The following systems are not part of the focused campaign until the appointment loop proves fun in repeated playtests:

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

The game is turn-led, not reflex-led. A day ends after its appointments, while the clock is a generous fallback rather than the main challenge. Time should encourage a pleasant rhythm, never punish a player for reading a customer story.

Difficulty comes from limited cash and imperfect choices, not fast clicking.

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
- appointments completed and customers lost;
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

### Slice A — Five-appointment day

- Begin at the open teller counter.
- Curate the first five services.
- Remove false choices from routine transactions.
- Preview both sides of every loan decision.
- End the day when five appointments are complete.
- Replace the accounting wall with a concise recap and optional detail.

Exit test: a new player can finish day one without opening a guide and can explain why they approved or refused each loan.

### Slice B — Consequences and familiarity

- Add a small cast of recurring Silver Creek customers.
- Record prior service and loan outcomes per customer.
- Return at least two early decisions as later consequences.
- Give each day a small authored theme.

Exit test: players remember at least two customers and are curious about what happens next.

Implementation status: the recurring cast, saved visit history, day themes, and two-day loan consequences are built. Blind-player memory and curiosity testing is still required before this slice is considered proven.

### Slice C — Meaningful improvements

- Reduce upgrades to four visible, mechanically distinct choices.
- Unlock the first teller only after routine work has become familiar.
- Let the teller remove repetition while preserving judgment cases.
- Present one improvement choice at day end instead of a large management dashboard.

Exit test: earning the first teller changes the rhythm and feels like a reward.

Implementation status: the catalog now exposes only four purpose-built improvements; Mara delegates routine services while loans and relationship follow-ups stay manual; hiring and the first improvement are offered as day-end rewards; and the former policy, training, pricing, prestige, achievement, and telemetry walls are absent from the normal opening flow. A phone-sized playthrough verified the compact management screen and one-tap placement. Blind playtesting is still required to prove that the rhythm change feels rewarding.

### Slice D — Focused campaign

- Build a sequence of local projects and customer stories.
- Infer the bank's identity from play.
- Add a final town-defining decision and authored conclusion.
- Balance for several viable styles.

Exit test: the campaign has a beginning, escalation, climax, and memorable ending without requiring regional expansion.

Implementation status: a seven-day Silver Creek mill arc now places authored decisions inside the normal five-appointment loop on days 4, 6, and 7. Early choices alter the final loan amount and risk; the conclusion resolves either the cooperative or repair plan and identifies the bank as a careful steward, practical builder, or neighbors' bank from accumulated play. Regional simulation stays out of the focused week. Both finale paths and the mobile conclusion were exercised in-browser. Blind playtesting and broader balance tuning remain required before the campaign is considered proven.

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
