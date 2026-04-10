# AmyBot — Development Guide

> **Generated:** 2026-04-10

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 22+ | Required by Electron 40 |
| pnpm | 10.x | Package manager (`npm i -g pnpm`) |
| Git | any | |
| macOS / Windows / Linux | — | Cross-platform |
| UV (Python env manager) | Latest | Downloaded automatically via `pnpm run uv:download` |

---

## Initial Setup

```bash
# 1. Clone the repo
git clone <repo-url> AmyBotDesktop
cd AmyBotDesktop

# 2. Install all dependencies AND download bundled UV binary
pnpm run init

# Equivalent to:
# pnpm install
# pnpm run uv:download
```

---

## Environment Variables

Copy `.env.example` to `.env` and customize as needed:

```bash
cp .env.example .env
```

Key environment variables (see `.env.example` for full list):

| Variable | Purpose |
|----------|---------|
| `VITE_DEV_SERVER_URL` | Set automatically by Vite dev server |
| `AMYBOT_E2E` | Set to `1` to enable E2E test mode |
| `AMYBOT_E2E_SKIP_SETUP` | Set to `1` to bypass setup wizard in E2E |
| `AMYBOT_USER_DATA_DIR` | Override `userData` path (E2E isolation) |
| `AMYBOT_HOST_API` | Override Host API port (default: 13210) |
| `SKIP_PREINSTALLED_SKILLS` | Set to `1` to skip bundling skills (faster local packaging) |

---

## Development Workflow

### Start Development Server

```bash
pnpm dev
```

This runs `vite` which:
1. Starts the Vite dev server at `http://localhost:5173`
2. Compiles the Electron main process and preload script (via `vite-plugin-electron`)
3. Launches the Electron app pointing at the dev server
4. Enables Hot Module Replacement (HMR) for the renderer

**DevTools** open automatically in development mode (disabled in E2E mode).

### Path Aliases

| Alias | Resolves to |
|-------|------------|
| `@/` | `src/` |
| `@electron/` | `electron/` |

---

## Code Structure Conventions

### Renderer (`src/`)

- **Pages** in `src/pages/` — one directory per route
- **Shared components** in `src/components/`
- **State** in `src/stores/` — one Zustand store per domain
- **Communication** via `src/lib/api-client.ts` (IPC) and `src/lib/host-api.ts` (HTTP)
- **Types** in `src/types/` — shared TypeScript interfaces

### Main Process (`electron/`)

- **Gateway management** in `electron/gateway/` — contains ~15 focused modules
- **API server** in `electron/api/` — route handlers in `routes/`
- **IPC registration** in `electron/main/ipc-handlers.ts`
- **Utilities** in `electron/utils/` — thin, single-responsibility modules

### Shared (`shared/`)

- Code that must work identically in both renderer and main process
- Currently: language resolution (`shared/language.ts`)

---

## TypeScript

```bash
# Typecheck without emitting files
pnpm typecheck
```

Two `tsconfig` files:
- `tsconfig.json` — renderer (browser target, `@/` path alias, JSX)
- `tsconfig.node.json` — build tools and main process

---

## Linting

```bash
# Lint and auto-fix
pnpm lint
```

Uses ESLint flat config (`eslint.config.mjs`) with:
- `@typescript-eslint` rules
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`

---

## Testing

### Unit Tests (Vitest)

```bash
# Run all unit tests
pnpm test

# Watch mode (dev)
npx vitest
```

Unit tests live in `tests/unit/`. Test setup in `tests/setup.ts`.

### E2E Tests (Playwright)

```bash
# Run E2E tests (headless)
pnpm test:e2e

# Run E2E tests (headed — see browser)
pnpm test:e2e:headed
```

E2E tests live in `tests/e2e/`. E2E mode (`AMYBOT_E2E=1`) minimizes startup side effects.

---

## Build

### Full Production Build

```bash
pnpm build
```

Steps executed:
1. `vite build` — compiles renderer to `dist/` and Electron main/preload to `dist-electron/`
2. `bundle-openclaw.mjs` — copies OpenClaw package to `build/openclaw/`
3. `bundle-openclaw-plugins.mjs` — bundles DingTalk, WeCom, Feishu, WeChat plugins
4. `bundle-preinstalled-skills.mjs` — copies preinstalled skills to `build/preinstalled-skills/`
5. `electron-builder` — creates platform installer in `release/`

### Vite Only (faster iteration)

```bash
pnpm build:vite
```

### Platform-specific Packaging

```bash
# macOS (requires macOS)
pnpm package:mac

# macOS (skip preinstalled skills — faster)
pnpm package:mac:local

# Windows (downloads Windows binaries first)
pnpm package:win

# Linux
pnpm package:linux
```

Output goes to `release/`.

---

## Working with the OpenClaw Gateway

The gateway is automatically started when the app launches (if `gatewayAutoStart` is enabled in settings).

In development, you can control it via the gateway status indicator in the UI or through Settings → Gateway.

**Gateway ports:**

| Service | Default Port | Env Override |
|---------|-------------|-------------|
| OpenClaw Gateway | 18789 | `AMYBOT_PORT_OPENCLAW_GATEWAY` |
| Host API server | 13210 | `AMYBOT_PORT_AMYBOT_HOST_API` |

**Gateway logs:** Accessible via Settings → Advanced → Logs (developer mode) or at `~/.openclaw/logs/`.

---

## Debugging

### Renderer DevTools

DevTools open automatically in `dev` mode. You can also open them via the application menu → View → Toggle DevTools.

### Main Process Logs

Logs are written to:
- `stdout/stderr` in terminal when running `pnpm dev`
- Log files managed by `electron/utils/logger.ts`

Enable verbose API logging in the renderer by setting in DevTools console:
```javascript
localStorage.setItem('amybot:api-log', '1')
```

Enable Gateway WebSocket diagnostic transport:
```javascript
localStorage.setItem('amybot:gateway-ws-diagnostic', '1')
```

Enable localhost fallback for Host API (non-Electron testing):
```javascript
localStorage.setItem('amybot:allow-localhost-fallback', '1')
```

### E2E Test Debugging

```bash
# With Playwright UI mode
npx playwright test --ui
```

---

## Common Development Tasks

### Adding a New Settings Field

1. Add the field to the `SettingsState` interface in `src/stores/settings.ts`
2. Add a setter method and add to `defaultSettings`
3. Add the corresponding `hostApiFetch` call to persist via Host API
4. Add the route handler in `electron/api/routes/settings.ts`
5. Add to `getAllSettings()` in `electron/utils/store.ts`

### Adding a New IPC Channel

1. Add the channel to `electron/preload/index.ts` whitelist
2. Register the handler in `electron/main/ipc-handlers.ts`
3. Call via `invokeIpc('channel:name', ...)` in the renderer

### Adding a New Page

1. Create `src/pages/NewPage/index.tsx`
2. Add the route in `src/App.tsx`
3. Add nav item to `src/components/layout/Sidebar.tsx`
4. Add i18n keys to all language files in `src/i18n/locales/`

### Adding i18n Translations

1. Add keys to `src/i18n/locales/en/{namespace}.json`
2. Mirror to `zh/`, `ja/`, `ru/` files
3. Use `useTranslation('{namespace}')` hook in components

---

## Version Management

```bash
# Patch version bump (x.x.PATCH)
pnpm version:patch

# Minor version bump (x.MINOR.x)
pnpm version:minor

# Major version bump (MAJOR.x.x)
pnpm version:major
```

`postversion` hook auto-runs `git push && git push --tags`.

---

## Communications Regression Testing

The `comms/` scripts compare API communication logs between versions:

```bash
pnpm comms:baseline   # Record baseline
pnpm comms:replay     # Replay recorded session
pnpm comms:compare    # Compare against baseline
```
