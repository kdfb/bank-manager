# Bank Manager

Bank Manager is a playable management game vertical slice. Run a hands-on headquarters, serve distinct local customer segments, manage a patience-driven queue, make lending decisions against forecast losses, hire and train specialists, and improve the branch. As prestige grows, open satellite branches across four differentiated regions, allocate capital, set local policies, and balance consolidated profit against rival market share. Completing the campaign produces a persistent narrative legacy report shaped by the network the player built, then leaves the full economy available for open-ended play.

The same HTML, CSS, Canvas, and JavaScript game runs on the web and inside a secure Electron desktop shell suitable for eventual Steam distribution.

## Prototype controls

- Move: `WASD` or arrow keys
- Enter/leave the teller wicket: `E` or `Enter`
- Build mode: `B`
- Rotate furniture: `R`
- Close the current mode: `Escape`
- Operations: hire, assign, and train a small specialist roster; set lending, deposit-pricing, and fee policies; and review obligations
- Regions: review campaign goals, compare markets, open branches, transfer capital, set local policies, and schedule the next branch for direct control
- Guide: review contextual lessons, controls, and the financial glossary at any time
- Ledger: inspect recent decisions and financial activity

Touch controls are available on narrow screens.

Standard-mapped gamepads are supported throughout branch play and management:

- Left stick or D-pad: move, navigate focused controls, or position the build cursor
- A: interact, select, confirm, or place a furnishing
- B: close the top overlay, ledger, teller wicket, or build mode
- X / Y: build mode / transaction ledger
- LB / RB: Operations / Regions
- View / Menu: Guide / Save menu
- LT / RT: sell mode / rotate while building

Controller prompts take over after gamepad input and switch back after keyboard or pointer input. The Save menu also provides controller-vibration and fullscreen controls. Minimizing or suspending the app pauses the business clock, saves current state, and clears held movement input.

The Save menu includes portable archive export/import, ten persistent campaign achievements, sound-effect and volume controls, and accessibility preferences for contextual guidance, high contrast, reduced motion, and normal/large/extra-large interface text. Dialogs move focus to their close control, contain keyboard focus, replace any other open dialog, and close with `Escape`.

Mechanics are introduced progressively: the opening focuses on teller work; staffing and Build unlock after three completed customers; credit controls appear after the first credit decision; and pricing plus regional strategy arrive with Trusted Institution prestige. Locked HUD controls state their requirement instead of opening an inactive screen.

## Run on the web

Requires Node.js 20 or newer:

```powershell
npm start
```

Open `http://127.0.0.1:4173`. The project is also deployable as static files; no backend is required.

The web build includes an install manifest and complete application-shell service worker. After one successful online load, the game can start offline. Export a save archive before clearing browser data or use Import Archive to move all save slots and preferences to another browser or desktop build.

Development-only URL parameters are available for deterministic QA:

- `?dayDuration=10` runs a ten-second operating day; QA values as low as two seconds are accepted.
- `?debugEvent=rival_rate_campaign` injects a named strategic event as the first decision. Other IDs include `harvest_outlook`, `mine_closure`, `staff_fraud_alert`, `crime_warning`, `cattle_drive_finance`, `drought_response`, `railway_depot`, `counterfeit_notes`, `staff_certification`, `bank_run_rumor`, and `homestead_credit`.
- `?debugStress=1` starts a solvent but cash-constrained recovery scenario.
- `?debugSegment=institutions&debugService=deposit` injects a chosen segment/service combination as the first customer.
- `?debugPrestige=2` previews prestige-gated customers and management presentation.
- `?debugCampaign=1` unlocks all regions with sufficient cash, standing, and prestige for expansion QA.
- `?debugRivals=1` pre-simulates fifteen days of rival campaigns and expansion history for strategy-screen QA.
- `?debugVictory=1` creates a completed four-region network for campaign-conclusion and open-ended-mode QA.
- `?debugNoCustomers=1` suppresses customer spawning so day transitions and branch travel can be tested directly.
- `?debugController=1` enables the controller action hooks used by automated UI QA without requiring attached hardware.

## Test

```powershell
npm test
npm run check
npm run balance
npm run audit:runtime
```

`npm run balance` executes a deterministic 120-day strategy matrix. Pass `-- --days=240` for the campaign-completion horizon used by the regression suite. `npm run audit:runtime` launches a hidden desktop session to enforce the canvas pixel budget, cached static scenery, throttled modal rendering, exclusive dialog ownership, focus containment, panel compatibility, and overflow-free layouts from 1920×1080 down to 390×844, including extra-large interface text.

## Run and package the desktop build

```powershell
npm install
npm run desktop
npm run package:windows:all
npm run release:manifest
```

The Windows portable build and assisted per-user installer are written to `release/`, with a SHA-256 release manifest. Use `npm run assets:store` to regenerate exact-size store capsules from the original key-art master and `npm run capture:store` to refresh the nine genuine 1920x1080 gameplay screenshots. Steam partner setup, the native Steamworks provider, cloud configuration, physical-hardware certification, and production code signing remain release gates; the gameplay and save format remain platform-neutral.

Desktop saves are stored atomically in Electron's per-user application-data directory and mirrored from legacy local storage on first use. The same validated archive format moves saves between web and desktop builds. See [docs/CONTROLLER_DISPLAY_QA.md](docs/CONTROLLER_DISPLAY_QA.md) for the current controller and display verification matrix.

## Architecture

- `js/economy.js` contains pure, testable financial and policy rules.
- `js/portfolio.js` contains loan schedules, delinquency/default processing, legacy migration, and risk forecasts.
- `js/world.js` contains persistent regional conditions, campaign-stage and location-aware event eligibility, one-time multi-step story arcs, named-competitor effects, incident history, and liquidity recovery actions.
- `js/market.js` contains customer segments, Silver Creek demographics, location economics, prestige tiers, unlock rules, and segment-performance reporting.
- `js/campaign.js` contains regions, campaign goals and victory state, branch opening, travel and network-capital rules, named rival strategies, regional market share, deterministic off-screen simulation, and the endgame legacy profile derived from player outcomes.
- `js/operations.js` contains data-defined staff candidates plus pure queue, patience, workstation, capacity, training, objective, and progressive feature-exposure rules.
- `js/guidance.js` contains data-driven, save-aware contextual tutorial progression.
- `js/telemetry.js` records bounded, local-only day metrics and derives balance signals for playtest reports.
- `tools/balance.mjs` runs the real regional simulation through conservative, balanced, and growth strategies plus explicit-cost liquidity recovery scenarios.
- `js/audio.js` contains a lazy, synthesized sound system for decisions, menus, purchases, day transitions, and campaign outcomes.
- `js/platform.js` provides validated portable archives, browser storage, desktop bridge storage, platform capabilities, achievement/presence hooks, and web service-worker registration.
- `js/achievements.js` contains persistent achievement rules and platform-neutral rich-presence summaries.
- `js/bank.js` owns versioned persistent bank state.
- `js/events.js` defines customer and narrative event factories.
- `js/branch.js` owns movement, queues, delegation, cached canvas drawing, and build placement.
- `js/management.js` owns staffing and policy UI.
- `js/strategy.js` owns the regional map, expansion, travel scheduling, capital-allocation, and branch-policy UI.
- `js/help.js` owns the handbook, contextual tip card, exclusive modal/focus containment, and accessibility settings UI.
- `js/game.js` coordinates the day lifecycle and failure states.
- `desktop/main.cjs` is a minimal, sandboxed desktop host.
- `desktop/preload.cjs` and `desktop/storage.cjs` expose the narrow archive/storage bridge and atomic durable-save implementation.
- `desktop/integrations.cjs` validates the optional native achievement, presence, and cloud-save provider boundary; it is disabled safely until a provider is supplied.

See [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) for the longer product plan, [docs/RELEASE_TARGETS.md](docs/RELEASE_TARGETS.md) for delivery boundaries, [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md) for Windows packaging policy, [assets/store/README.md](assets/store/README.md) for store-art provenance and specifications, and [docs/STEAM_INTEGRATION.md](docs/STEAM_INTEGRATION.md) for the native-provider handoff.
