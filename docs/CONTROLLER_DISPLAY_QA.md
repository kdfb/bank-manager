# Controller and Display QA

This document separates implemented controller/display behavior from release gates that require physical hardware or platform accounts.

## Implemented input contract

The shared `js/controls.js` adapter reads the browser standard-gamepad mapping and applies a dead zone before exposing movement. Button actions are edge-triggered so holding a button does not repeatedly buy, confirm, or open a menu. Directional navigation repeats only after an initial delay.

| Control | Branch play | Build mode | Management UI |
| --- | --- | --- | --- |
| Left stick / D-pad | Move player | Move cursor or focused shop control | Move focused control; left/right changes selects |
| A | Interact with teller/customer | Select or place | Activate focused control |
| B | Leave wicket / close top mode | Leave build mode | Close top overlay |
| X | Enter build mode | Leave build mode | — |
| Y | Toggle ledger | Toggle ledger | — |
| LB / RB | Operations / Regions | Operations / Regions | — |
| View / Menu | Guide / Save menu | Guide / Save menu | — |
| LT / RT | — | Sell / rotate | — |

Input hints change after controller use and return to keyboard or pointer presentation after those devices are used. Compatible controllers receive optional light vibration feedback. A controller reference is available in the in-game handbook.

## Verified gates

- Pure mapping tests cover dead-zone behavior, every standard button assignment, and edge transitions.
- Real browser UI automation at 1280×720 verifies controller-driven build entry, D-pad shop navigation, A selection with focus returned to the canvas, Save-menu entry, menu focus navigation, and B dismissal.
- The 1280×720 visual pass verifies that the HUD, objective banner, branch-status panel, interaction prompt, and controller hints do not overlap.
- The repeatable hidden runtime audit checks 1920×1080, 1280×720, 760×800, and 390×844 layouts, including extra-large interface text, for modal containment, horizontal overflow, focus ownership, and incompatible Build/Ledger panels.
- The same audit verifies a six-megapixel canvas ceiling, one cached static-room render during steady play, 10 Hz day-clock DOM updates, and low-rate background drawing while a modal is open.
- Build inventory entries are semantic buttons, so controller and keyboard focus use the same accessible controls.
- Fullscreen can be entered or left from Save settings where the browser or desktop shell supports the Fullscreen API.
- Hiding or suspending the page pauses the business clock, persists current state, and resumes without charging the player for elapsed real time. Window focus loss clears held movement.
- The complete controller module remains in the offline application-shell cache.

## Physical release matrix still required

These checks cannot be honestly completed through software emulation and remain release gates:

| Target | Required checks |
| --- | --- |
| Xbox controller on Windows | USB/Bluetooth connect and reconnect, correct labels, vibration, long-session navigation |
| DualSense / DualShock on Windows | Steam Input standard mapping, glyph-language decision, vibration behavior |
| Steam Deck | 1280×800 handheld readability, suspend/resume, software keyboard, dock/undock, 40/60 Hz performance |
| TV / couch display | 1080p and 4K scaling, overscan-safe edges, legibility at distance |
| Narrow touch devices | Portrait/landscape rotation, safe-area insets, touch/controller handoff |

Record device model, connection type, OS/client version, resolution, refresh rate, result, and issue link for every physical run. A release candidate should have no blocking failures across the chosen launch hardware matrix.
