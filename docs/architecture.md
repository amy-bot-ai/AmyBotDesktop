# AmyBot — Architecture Documentation

> **Generated:** 2026-04-10 | **Version:** 0.3.8

---

## Executive Summary

AmyBot is a **desktop AI assistant** built on Electron. It provides a graphical interface for [OpenClaw](https://github.com/OpenClaw), an AI agent orchestration engine. The architecture is organized around three distinct runtime contexts:

1. **Renderer Process** — React 19 SPA providing the entire user interface
2. **Main Process** — Node.js host managing the desktop lifecycle, security, and backend services
3. **OpenClaw Gateway** — Spawned child process running the AI agent engine

Communication between layers is carefully controlled: the renderer uses `contextBridge`-gated IPC and an authenticated local HTTP API to interact with the main process; the main process uses a WebSocket JSON-RPC connection and process IPC to manage the OpenClaw gateway.

---

## Architecture Pattern

**Layered Desktop Architecture** with a sidecar process pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│  Renderer Process (Chromium + React)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React Router SPA                                        │  │
│  │  Pages: Chat | Agents | Channels | Skills | Cron |       │  │
│  │         Models | Settings | Setup                        │  │
│  │  Zustand Stores: gateway | chat | settings | providers   │  │
│  │                  agents | channels | skills | cron |     │  │
│  │                  update                                   │  │
│  │  lib: api-client | host-api | host-events | error-model  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                       │
│              contextBridge (preload/index.ts)                   │
└──────────────────────────┼──────────────────────────────────────┘
                           │  Electron IPC (invoke/on)
                           │  Host API (HTTP + SSE on 127.0.0.1:13210)
┌──────────────────────────▼──────────────────────────────────────┐
│  Main Process (Node.js)                                         │
│  ┌──────────────────┐  ┌────────────────────────────────────┐  │
│  │  IPC Handlers    │  │  Host API HTTP Server (:13210)      │  │
│  │  (ipc-handlers)  │  │  Routes: /api/gateway, /api/app,   │  │
│  │  50+ channels    │  │    /api/settings, /api/providers,  │  │
│  └──────────────────┘  │    /api/agents, /api/channels,     │  │
│  ┌──────────────────┐  │    /api/skills, /api/sessions,     │  │
│  │  GatewayManager  │  │    /api/cron, /api/logs, /api/usage│  │
│  │  (lifecycle,     │  │  Auth: Bearer token (per-session)  │  │
│  │   WebSocket RPC) │  │  Events: SSE (/api/events)         │  │
│  └──────────────────┘  └────────────────────────────────────┘  │
│  ┌──────────────────┐  ┌────────────────────────────────────┐  │
│  │  Provider Service│  │  Utility Services                  │  │
│  │  (store, sync,   │  │  - electron-store (settings/config)│  │
│  │   validation,    │  │  - secure-storage (API keys)       │  │
│  │   runtime sync)  │  │  - channel-config (YAML/JSON)      │  │
│  └──────────────────┘  │  - skill-config, plugin-install    │  │
│                         │  - device/browser OAuth managers  │  │
│                         │  - whatsapp/wechat login managers  │  │
│                         └────────────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────────┘
                           │  UtilityProcess (Electron) + WebSocket
                           │  JSON-RPC (ws://127.0.0.1:18789/ws)
┌──────────────────────────▼──────────────────────────────────────┐
│  OpenClaw Gateway (sidecar child process)                       │
│  - AI agent orchestration                                       │
│  - Tool use, skill execution                                    │
│  - Provider API calls (OpenAI, Anthropic, Gemini, etc.)        │
│  - Channel integrations (chat platforms)                        │
│  - HTTP Control UI (127.0.0.1:18789)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop shell | Electron 40 | Window, tray, IPC, system integration |
| Renderer | React 19 + TypeScript | UI components and pages |
| Build | Vite 7 + vite-plugin-electron | Dev server, HMR, production bundling |
| State | Zustand 5 | Client-side state management |
| UI Primitives | Radix UI | Accessible headless components |
| Styling | Tailwind CSS 3 + tailwind-merge | Utility-first styling |
| Animations | Framer Motion 12 | Page/component transitions |
| Routing | React Router DOM 7 | SPA page routing |
| i18n | i18next 25 + react-i18next | Multi-language support |
| AI Runtime | OpenClaw 2026.4.9 | Bundled agent engine |
| Skills Hub | clawhub | Skill discovery and installation |
| Settings persistence | electron-store | JSON settings file |
| Secrets | keychain / OS credential store | API keys secure storage |
| Telemetry | PostHog Node | Anonymous usage analytics |
| Auto-update | electron-updater | App update lifecycle |
| Package manager | pnpm 10 | Workspace dependency management |

---

## Renderer Architecture

### Entry Points

- `index.html` — Vite HTML entry
- `src/main.tsx` — React 19 bootstrap (`createRoot`)
- `src/App.tsx` — Root component: routing, setup redirect, theme, i18n init

### Routing

```
/setup/*         → Setup wizard (first-run)
/               → Chat
/models          → Models & token usage
/agents          → Agent management
/channels        → Channel configuration
/skills          → Skills marketplace
/cron            → Cron task scheduler
/settings/*      → Application settings
```

### State Management (Zustand)

| Store | File | Responsibilities |
|-------|------|-----------------|
| `useGatewayStore` | `stores/gateway.ts` | Gateway lifecycle (start/stop/restart), SSE event fan-out |
| `useChatStore` | `stores/chat.ts` | Chat sessions, messages, streaming, tool status |
| `useSettingsStore` | `stores/settings.ts` | App settings (theme, language, gateway config, proxy) |
| `useProviderStore` | `stores/providers.ts` | AI provider configs and API key state |
| `useAgentsStore` | `stores/agents.ts` | Agent list and configuration |
| `useChannelsStore` | `stores/channels.ts` | Channel configuration and status |
| `useSkillsStore` | `stores/skills.ts` | Installed skills and configs |
| `useCronStore` | `stores/cron.ts` | Cron job list |
| `useUpdateStore` | `stores/update.ts` | App update state |

### Communication with Main Process

The renderer communicates through two transport mechanisms:

**1. IPC (contextBridge)**
- All IPC calls go through `window.electron.ipcRenderer.invoke/on`
- Channels are whitelist-validated in `electron/preload/index.ts`
- `src/lib/api-client.ts` wraps IPC with multi-transport fallback (IPC → WS → HTTP)

**2. Host API (HTTP + SSE)**
- Local HTTP server at `127.0.0.1:13210`
- Bearer token authenticated (token fetched via IPC on first call)
- `src/lib/host-api.ts` — `hostApiFetch()` proxies requests through IPC to avoid renderer CORS restrictions
- `src/lib/host-events.ts` — `subscribeHostEvent()` uses SSE for real-time events from main process

---

## Main Process Architecture

### Entry Point

`electron/main/index.ts` — Initializes the full application:
1. Acquires single-instance lock (Electron + file-based)
2. Creates `GatewayManager`, `ClawHubService`, `HostEventBus`
3. Creates the main `BrowserWindow`
4. Creates system tray
5. Registers all IPC handlers
6. Starts Host API server
7. Sets up OAuth, WhatsApp, WeCom event bridges
8. Auto-starts OpenClaw gateway (if enabled)

### Gateway Management (`electron/gateway/`)

The `GatewayManager` class is the central control for the OpenClaw sidecar process:

| Component | Purpose |
|-----------|---------|
| `manager.ts` | `GatewayManager`: EventEmitter orchestrating all sub-systems |
| `process-launcher.ts` | Spawns OpenClaw as an Electron UtilityProcess |
| `lifecycle-controller.ts` | Serializes start/stop/restart to prevent race conditions |
| `startup-orchestrator.ts` | Step-by-step startup sequence with retry logic |
| `connection-monitor.ts` | Heartbeat monitoring of the WebSocket connection |
| `restart-controller.ts` + `restart-governor.ts` | Auto-restart with backoff and circuit-breaker |
| `ws-client.ts` | WebSocket connect/wait helpers |
| `state.ts` | `GatewayStateController`: FSM for lifecycle states |
| `supervisor.ts` | Process detection, termination, UV/Python readiness |
| `config-sync.ts` | Syncs app config to OpenClaw config before launch |
| `protocol.ts` | JSON-RPC message type helpers |
| `request-store.ts` | In-flight RPC request tracking |
| `event-dispatch.ts` | Dispatches notifications to renderer via IPC |
| `clawhub.ts` | ClawHub skill marketplace API client |

**Gateway lifecycle states:** `stopped → starting → running → stopping → stopped` (+ `error`)

### Host API Server (`electron/api/`)

Local HTTP server on `127.0.0.1:13210` with:
- Per-session cryptographic Bearer token for authentication
- CORS policy (origin-aware)
- Anti-CSRF: mutation requests require `Content-Type: application/json`
- SSE endpoint `/api/events` for real-time event streaming

| Route Module | Endpoints |
|-------------|-----------|
| `routes/gateway.ts` | `/api/gateway/status`, `/api/gateway/start`, `/api/gateway/stop`, `/api/gateway/restart`, `/api/gateway/health`, `/api/chat/send-with-media` |
| `routes/app.ts` | `/api/app/*` (version, platform, name) |
| `routes/settings.ts` | `/api/settings` (GET/PUT individual settings) |
| `routes/providers.ts` | `/api/providers/*` (CRUD + API key management) |
| `routes/agents.ts` | `/api/agents/*` |
| `routes/channels.ts` | `/api/channels/*` |
| `routes/skills.ts` | `/api/skills/*` |
| `routes/sessions.ts` | `/api/sessions/*` |
| `routes/cron.ts` | `/api/cron/*` |
| `routes/logs.ts` | `/api/logs/*` |
| `routes/usage.ts` | `/api/usage/*` |
| `routes/files.ts` | `/api/files/*` (file staging for media attachments) |
| `event-bus.ts` | `HostEventBus`: SSE event multiplexer |

### IPC Handlers (`electron/main/ipc-handlers.ts`)

50+ IPC channels organized by domain:
- `app:request` — Unified protocol (module.action routing)
- `gateway:*` — Gateway lifecycle and RPC
- `provider:*` — Provider CRUD and API key operations
- `settings:*` — Settings get/set
- `channel:*` — Channel config and credentials
- `cron:*` — Cron job management (proxies to Gateway RPC)
- `clawhub:*` — Skill marketplace
- `skill:*` — Local skill config
- `update:*` — Auto-update
- `log:*`, `usage:*` — Observability
- `file:*`, `media:*` — File operations
- `shell:*`, `dialog:*`, `window:*` — System integration
- `oauth:*` — Device and browser OAuth flows
- `channel:requestWhatsAppQr` — WhatsApp QR login

### Provider System (`electron/services/providers/`)

Multi-store architecture for AI providers:

| Component | Purpose |
|-----------|---------|
| `provider-service.ts` | High-level CRUD façade |
| `provider-store.ts` | Provider metadata persistence (electron-store) |
| `provider-validation.ts` | API key validation against provider endpoints |
| `provider-runtime-sync.ts` | Syncs provider configs to OpenClaw runtime config |
| `provider-migration.ts` | Legacy provider format migration |
| `store-instance.ts` | Singleton store instance |
| `electron/services/secrets/secret-store.ts` | Keychain-backed API key storage |
| `electron/shared/providers/registry.ts` | Provider type registry and metadata |

---

## Preload Script (`electron/preload/index.ts`)

The preload script runs in the renderer's context with Node.js access and exposes a carefully typed API via `contextBridge.exposeInMainWorld('electron', ...)`:

```typescript
window.electron = {
  ipcRenderer: {
    invoke(channel, ...args)  // Whitelisted invoke channels
    on(channel, callback)     // Whitelisted event channels
    once(channel, callback)
    off(channel, callback?)
  },
  openExternal(url),
  platform,    // process.platform
  isDev,       // development check
}
```

Only explicitly whitelisted channels are allowed — all others throw an error.

---

## Data Architecture

AmyBot has no database. Data is stored in several locations:

| Data | Storage | Location |
|------|---------|---------|
| App settings | electron-store (JSON) | `userData/config.json` |
| Provider configs | electron-store (JSON) | `userData/providers.json` |
| API keys | OS keychain / secure storage | OS credential store |
| Channel configs | electron-store (JSON) | `userData/channels.json` |
| Skill configs | electron-store (JSON) | `userData/skill-configs.json` |
| UI state (settings) | localStorage (Zustand persist) | `userData/Local Storage` |
| Chat history | OpenClaw gateway storage | `~/.openclaw/sessions/` |
| Gateway config | YAML/JSON | `~/.openclaw/` |

---

## Security Architecture

| Concern | Mechanism |
|---------|-----------|
| Node integration | Disabled (`nodeIntegration: false`) |
| Context isolation | Enabled (`contextIsolation: true`) |
| IPC whitelist | All channels explicitly whitelisted in preload |
| Host API auth | Per-session cryptographic Bearer token |
| Anti-CSRF | `Content-Type: application/json` required for mutations |
| External URLs | `setWindowOpenHandler` allows only `http:` and `https:` |
| API keys | OS keychain (not stored in plain files) |
| Process isolation | OpenClaw runs in a sandboxed UtilityProcess |
| Single instance | Electron lock + file lock prevents duplicate gateway spawns |

---

## Build and Packaging

```
Vite build (vite build)
├── dist/                     ← Renderer SPA
└── dist-electron/
    ├── main/                 ← Compiled main process
    └── preload/              ← Compiled preload script

bundle-openclaw.mjs           ← Copies openclaw to build/openclaw/
bundle-openclaw-plugins.mjs   ← Bundles platform plugins to build/openclaw/extensions/
bundle-preinstalled-skills.mjs ← Copies skills to build/preinstalled-skills/

electron-builder              ← Packages everything into platform installers
└── release/                  ← Output directory
    ├── AmyBot-*.dmg           ← macOS
    ├── AmyBot-*.exe           ← Windows
    ├── AmyBot-*.AppImage      ← Linux AppImage
    ├── AmyBot-*.deb           ← Debian/Ubuntu
    └── AmyBot-*.rpm           ← RPM
```

---

## Internationalization

Four supported languages managed by i18next:

| Code | Language |
|------|---------|
| `en` | English (default) |
| `zh` | Chinese (Simplified) |
| `ja` | Japanese |
| `ru` | Russian |

Translation namespaces: `common`, `settings`, `dashboard`, `chat`, `channels`, `agents`, `skills`, `cron`, `setup`

Language files live in `src/i18n/locales/{lang}/{namespace}.json`.

---

## Testing Strategy

| Layer | Tool | Location |
|-------|------|---------|
| Unit tests | Vitest 4 | `tests/unit/` |
| E2E tests | Playwright | `tests/e2e/` |
| E2E setup | `tests/setup.ts` | Configures E2E test fixtures |

**Unit test commands:**
```bash
pnpm test          # vitest run
```

**E2E test commands:**
```bash
pnpm test:e2e      # build:vite + playwright test
pnpm test:e2e:headed  # with browser visible
```

E2E mode is activated by `AMYBOT_E2E=1` env var, which:
- Skips gateway auto-start
- Skips telemetry
- Skips plugin installations
- Allows custom `userData` dir via `AMYBOT_USER_DATA_DIR`

---

## Deployment Architecture

Auto-update uses `electron-updater` with two providers:
1. **Alibaba Cloud OSS** — primary, optimized for Chinese users
2. **GitHub Releases** — fallback (`ValueCell-ai/AmyBot`)

Update channels: `stable` (default), `beta`, `dev`

CI/CD pipelines (`.github/workflows/`):
- `check.yml` — Lint + typecheck + unit tests
- `release.yml` — Full release build and publish
- `electron-e2e.yml` — E2E tests on macOS
- `win-build-test.yml` — Windows build verification
- `package-win-manual.yml` — Manual Windows packaging
