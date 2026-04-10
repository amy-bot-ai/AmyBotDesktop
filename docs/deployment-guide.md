# AmyBot — Deployment Guide

> **Generated:** 2026-04-10

---

## Release Process Overview

AmyBot uses **electron-builder** for packaging and **electron-updater** for distribution. Releases are triggered through GitHub Actions.

```
Code → Check (lint/typecheck/test) → Release workflow
                                          ↓
                                   Build all platforms
                                          ↓
                       Publish to GitHub Releases + Alibaba Cloud OSS
                                          ↓
                              Auto-update notifies users
```

---

## CI/CD Pipelines

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| Check | `check.yml` | Push / PR | Lint, typecheck, unit tests |
| Release | `release.yml` | Tag push | Full multi-platform build + publish |
| E2E Tests | `electron-e2e.yml` | Push / PR | Playwright E2E on macOS |
| Windows Build | `win-build-test.yml` | Push | Verify Windows build succeeds |
| Package Win Manual | `package-win-manual.yml` | Manual dispatch | Manual Windows packaging |
| Comms Regression | `comms-regression.yml` | Push | API communication regression |

---

## Update Distribution

Auto-updates use two providers configured in `electron-builder.yml`:

| Provider | URL | Purpose |
|----------|-----|---------|
| Alibaba Cloud OSS | `https://oss.intelli-spectrum.com/latest` | Primary — fast for Chinese users |
| GitHub Releases | `ValueCell-ai/AmyBot` | Fallback |

Update channels: `stable` (default), `beta`, `dev`

The `electron-updater` checks for updates on startup (if `autoCheckUpdate` setting is enabled) and can download in the background (if `autoDownloadUpdate` is enabled).

---

## Platform Build Requirements

### macOS

- Must build on macOS (native code signing + notarization)
- Requires Apple Developer certificates for `hardenedRuntime: true` + `notarize: true`
- Entitlements file: `entitlements.mac.plist`
- Outputs: `.dmg` and `.zip` for x64 and arm64

### Windows

- Can be cross-compiled on Linux/macOS with limitations; native Windows build recommended
- Prebuilt Windows binaries downloaded via `pnpm prep:win-binaries`
- No code signing certificate (skips update signature verification)
- Output: `.exe` (NSIS installer, x64 only)

### Linux

- Builds on any Linux x64 host
- Outputs: `.AppImage`, `.deb`, `.rpm` for x64 and arm64

---

## Build Artifacts

All outputs go to the `release/` directory:

| Platform | Format | Architecture |
|----------|--------|-------------|
| macOS | `.dmg` | x64, arm64 |
| macOS | `.zip` | x64, arm64 |
| Windows | `.exe` (NSIS) | x64 |
| Linux | `.AppImage` | x64, arm64 |
| Linux | `.deb` | x64, arm64 |
| Linux | `.rpm` | x64 |

Artifact naming: `AmyBot-{version}-{os}-{arch}.{ext}`

---

## Release Steps (Manual)

```bash
# 1. Bump version (pushes tag automatically)
pnpm version:patch    # or :minor or :major

# 2. Build and publish for current platform
pnpm release          # downloads UV, bundles everything, electron-builder --publish always

# Platform-specific publish
pnpm package:mac      # macOS
pnpm package:win      # Windows (requires prep:win-binaries first)
pnpm package:linux    # Linux
```

---

## Bundled Resources

The packaged app includes several bundled resources via `extraResources` in `electron-builder.yml`:

| Resource | Source | Target | Purpose |
|----------|--------|--------|---------|
| OpenClaw runtime | `build/openclaw/` | `openclaw/` | AI agent engine |
| Platform plugins | `build/openclaw/extensions/` | (via afterPack hook) | DingTalk, WeCom, Feishu, WeChat |
| Preinstalled skills | `build/preinstalled-skills/` | `resources/preinstalled-skills/` | Built-in skills |
| Icons | `resources/icons/` | `resources/icons/` | App and tray icons |
| Binaries (UV) | `resources/bin/{platform}-{arch}/` | `bin/` | UV Python env manager |
| CLI wrappers | `resources/cli/` | `cli/` | OpenClaw CLI scripts |

---

## Post-install Lifecycle (macOS/Linux)

After first launch, AmyBot:
1. Auto-installs the OpenClaw CLI to `~/.openclaw/bin/` if not present
2. Installs shell completions to the user's shell profile
3. Deploys built-in skills (Feishu skills) to `~/.openclaw/skills/`
4. Deploys bundled third-party skills (preinstalled)
5. Deploys bundled platform plugins (DingTalk, WeCom, Feishu, WeChat)
6. Injects AmyBot context snippets into OpenClaw workspace bootstrap files

---

## App Storage Locations

| Platform | `userData` Path |
|----------|----------------|
| macOS | `~/Library/Application Support/AmyBot/` |
| Windows | `%APPDATA%\AmyBot\` |
| Linux | `~/.config/AmyBot/` |

OpenClaw workspace: `~/.openclaw/`

---

## Environment Configuration

Key ports (can be overridden via environment variables):

| Service | Default Port | Env Override |
|---------|-------------|-------------|
| OpenClaw Gateway WebSocket | 18789 | `AMYBOT_PORT_OPENCLAW_GATEWAY` |
| Host API HTTP | 13210 | `AMYBOT_PORT_AMYBOT_HOST_API` |

---

## Uninstallation

### macOS
- Drag AmyBot from Applications to Trash
- Remove userData: `rm -rf ~/Library/Application\ Support/AmyBot/`
- Remove OpenClaw workspace (optional): `rm -rf ~/.openclaw/`

### Windows
- Use Add/Remove Programs or the uninstaller (does **not** delete AppData by default — `deleteAppDataOnUninstall: false`)

### Linux (deb)
```bash
sudo apt remove amybot
# userData lives in ~/.config/AmyBot/ — remove manually if desired
```
