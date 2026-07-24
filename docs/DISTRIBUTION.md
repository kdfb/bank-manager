# Windows distribution policy

Bank Manager produces two x64 Windows artifacts from the same tested source:

- `Bank-Manager-<version>-x64.exe` is the no-install portable build for internal QA and direct playtests.
- `Bank-Manager-Setup-<version>-x64.exe` is the public-facing assisted NSIS installer. It installs per user, allows a destination choice, and creates Start menu and desktop shortcuts.

The uninstaller deliberately preserves Bank Manager's per-user application-data directory. Saves can also be moved or backed up with the validated archive export in the Save menu.

## Build procedure

```powershell
npm install
npm run check
npm run package:windows:all
npm run release:manifest
```

`release/release-manifest.json` records each executable's byte size and SHA-256 digest. A release operator should publish that manifest beside any direct download.

There is no automatic updater. Steam builds should use Steam depot delivery; direct-download builds require an explicit new installer. A future updater must never silently change the save location or platform-provider boundary.

## Release gates

- Sign both executables with the production Windows code-signing certificate and timestamp service.
- Verify install, launch, upgrade, repair, and uninstall on a clean standard-user Windows account.
- Confirm uninstall preserves saves and a reinstall restores them.
- Scan final signed artifacts and record the result beside the release manifest.
- Smoke-test portable and installed builds both online and offline.
- Test non-ASCII Windows usernames, OneDrive/Desktop redirection, fullscreen, suspend/resume, and the physical controller matrix.
- Rebuild the checksum manifest after signing, because signing changes executable bytes.

Unsigned development artifacts are suitable for local QA but should not be represented as production-ready downloads.
