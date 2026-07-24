# Steam Integration Handoff

Bank Manager does not currently bundle a Steamworks SDK or claim an active Steam connection. The game is ready for one through a narrow provider boundary, allowing web builds and non-Steam desktop builds to continue using identical gameplay code.

## Current architecture

- `js/achievements.js` owns local achievement rules, migration, unlock state, and rich-presence summaries.
- `js/platform.js` exposes capability-aware `unlockAchievement` and `setRichPresence` calls. Both are safe no-ops on the web or when a native provider is absent.
- `desktop/preload.cjs` exposes only three additional validated IPC channels: capabilities, achievement unlock, and rich presence.
- `desktop/integrations.cjs` owns the native allowlist and sanitization boundary. The default provider has every external capability disabled.
- Existing unlocked achievements are reported once per desktop session, so installing a provider later can reconcile an established save with Steam.

No Steam library belongs in `js/`, and renderer code must never receive a raw Steam API object.

## Provider contract

The desktop bootstrap passes a provider to `createPlatformServices(provider)` with this shape:

```js
{
  cloudSaves: true,
  unlockAchievement(id) {},
  setRichPresence({ state, details, day, branchCount, campaignComplete }) {}
}
```

The native boundary rejects unknown achievement identifiers, strips control characters, limits presence strings to 96 characters, clamps numeric values, catches provider exceptions, and returns capability flags to the renderer. Provider initialization failure must fall back to the disabled default instead of preventing the game from starting.

## Achievement dashboard identifiers

Steam achievement API names must match these case-sensitive identifiers:

| API identifier | Player-facing title | Requirement |
| --- | --- | --- |
| `FIRST_DAY` | First Day's Ledger | Complete the first business day |
| `FIRST_CUSTOMER` | Open for Business | Serve the first customer |
| `FIRST_LOAN` | Capital at Work | Approve the first loan |
| `FIRST_HIRE` | No Longer Alone | Hire the first employee |
| `DELEGATION` | Trust the Team | Staff serve ten customers |
| `FURNISHED_BRANCH` | Built to Serve | Place three functional upgrades |
| `COUNTY_BANK` | County Institution | Reach County Bank prestige |
| `BRANCH_NETWORK` | Regional Ambition | Operate two branches |
| `DEBT_FREE` | Clear of Creditors | Repay all external debt |
| `BANKING_LEGACY` | Frontier Banking Legacy | Complete the campaign |

Steam should treat unlocks as permanent. Local progress remains save-specific so a new campaign can still present its own progression inside the game.

## Rich presence

The shared game sends a short state and detail line plus structured day, branch-count, and campaign-complete values. A Steam provider should map these to localized rich-presence tokens rather than publishing arbitrary renderer strings directly. Update calls are deduplicated by the shared adapter.

## Cloud saves

The authoritative desktop file is `bank-manager-saves.json` inside Electron's `app.getPath("userData")` directory. It contains the autosave, three manual slots, and preferences as serialized entries and is written atomically. Configure Steam Auto-Cloud only after confirming the exact packaged `userData` directory on a clean Windows account.

Cloud verification must cover:

1. Upload after a clean exit and restore on a second machine.
2. Offline progress followed by a conflict.
3. Version-5 to version-6 migration after download.
4. Save deletion and intentional new-game behavior.
5. Archive export/import while cloud synchronization is enabled.

Portable JSON archives remain the user-controlled recovery path even after cloud saves ship.

## Release gates

- Obtain the Steam App ID and partner access.
- Select and pin a maintained Steamworks provider compatible with the packaged Electron version.
- Initialize and shut down the provider only in the main process.
- Configure the ten identifiers and localized rich-presence tokens in Steamworks.
- Configure Auto-Cloud against the observed packaged save path.
- Test achievements, presence, overlay, offline mode, cloud conflicts, and multiple Steam accounts.
- Re-run the packaged Windows smoke test with Steam both running and unavailable.
