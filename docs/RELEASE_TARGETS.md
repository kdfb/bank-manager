# Web and Steam Release Targets

## Shared game

All simulation, rendering, interface, content, and save-schema code lives in the web project. Platform shells must not fork gameplay logic.

## Web target

The current build is a static site and can be hosted on GitHub Pages or any static host. Browser saves use versioned storage behind the shared platform adapter.

Current readiness: branded install icons, a web manifest, complete application-shell service worker, versioned save migrations, validated all-slot archive export/import, accessibility preferences, and local-only balance-report export are implemented. Production hosting still needs compression and appropriate cache headers.

## Steam desktop target

The Electron wrapper provides a Windows executable using the same static game. Before Steam release:

1. Replace placeholder branding and add a production `.ico`.
2. Add code signing and installer/portable-build policy.
3. Supply and certify a Steamworks provider behind the implemented platform adapter for achievements, cloud saves, and rich presence.
4. Map local save slots to a durable user-data file for Steam Cloud.
5. Complete the physical-hardware matrix for controller support, display scaling, offline startup, suspend/resume, and Steam Deck compatibility.
6. Prepare depots, launch options, store assets, privacy disclosures, and platform QA.

Electron is intentionally isolated to `desktop/`; a future switch to another native shell will not require rewriting the game.

Current readiness: production `.ico` branding, repeatable portable and assisted per-user installer builds, SHA-256 release manifests, a documented save-preserving distribution policy, a complete exact-dimension Steam capsule/library asset package, nine reproducible 1920x1080 gameplay captures, a sandboxed platform adapter, atomic per-user file storage, legacy-save migration, native archive dialogs, ten local achievements, version-6 achievement migration, validated native achievement/rich-presence capability hooks, standard-gamepad input parity, controller-aware focus and prompts, progressive mechanic disclosure, exclusive modal ownership, automated overflow/layout checks from 1920×1080 to 390×844, an enforced canvas/rendering budget, fullscreen control, and visibility-based suspend/resume protection are implemented. Physical Xbox/DualSense/Steam Deck validation, an actual Steamworks provider and partner configuration, store-page entry/review, production signing, and clean-machine installer certification remain.
