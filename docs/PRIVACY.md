# Privacy and Local Data

Bank Manager currently has no account system, advertising SDK, analytics service, or gameplay-data transmission.

The game stores these items locally:

- Autosave and three manual save slots.
- Audio, accessibility, controller, and guidance preferences.
- Achievement progress.
- A bounded balance-playtest history containing game economy and service metrics only.

The Balance Lab is local-only. Its report leaves the device only when the player explicitly downloads and shares the JSON file. Portable save archives likewise require an explicit export or import action.

If Steam integration is enabled in a future release, Steam may receive only configured achievement identifiers, rich-presence state, and the save file selected for Steam Cloud. That release must update the store privacy disclosure and this document to describe the active provider and Valve's role. No raw customer simulation records, personal identity, device fingerprint, or Balance Lab history should be sent as telemetry.

Deleting browser site data removes browser saves. Desktop saves reside in Electron's per-user application-data directory, and the assisted Windows uninstaller is configured to preserve that directory. Players should still export a portable archive before clearing application data or troubleshooting an installation; Steam Cloud retention behavior remains unconfigured.
