# AmyBot — Source Tree Analysis

> **Generated:** 2026-04-10

---

## Directory Tree

```
AmyBotDesktop/                          ← Project root
│
├── src/                                ← React renderer (SPA)
│   ├── main.tsx                        ← React 19 bootstrap entry (createRoot)
│   ├── App.tsx                         ← Root component: routing, setup redirect, theme, i18n init
│   ├── vite-env.d.ts                   ← Vite type declarations
│   │
│   ├── pages/                          ← Route-level page components
│   │   ├── Chat/                       ← Main AI chat interface
│   │   │   ├── index.tsx               ← Chat page container
│   │   │   ├── ChatMessage.tsx         ← Message rendering (markdown, tools, images)
│   │   │   ├── ChatInput.tsx           ← Input bar with file attachment
│   │   │   ├── ChatToolbar.tsx         ← Session selector, thinking toggle, refresh
│   │   │   ├── ExecutionGraphCard.tsx  ← Sub-agent execution tree visualization
│   │   │   ├── message-utils.ts        ← Extract text/thinking/tools/images from messages
│   │   │   └── task-visualization.ts   ← Derive task steps and subagent completions
│   │   ├── Agents/index.tsx            ← Agent management page
│   │   ├── Channels/index.tsx          ← Channel configuration page
│   │   ├── Cron/index.tsx              ← Cron scheduler page
│   │   ├── Models/                     ← Model management + token usage history
│   │   │   ├── index.tsx
│   │   │   └── usage-history.ts
│   │   ├── Settings/index.tsx          ← App settings page (tabs)
│   │   ├── Setup/index.tsx             ← First-run setup wizard (multi-step)
│   │   └── Skills/index.tsx            ← Skills marketplace page
│   │
│   ├── components/                     ← Reusable UI components
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx          ← Shell layout: sidebar + content area
│   │   │   ├── Sidebar.tsx             ← Navigation sidebar
│   │   │   └── TitleBar.tsx            ← Custom title bar (Windows/Linux)
│   │   ├── channels/
│   │   │   └── ChannelConfigModal.tsx  ← Channel configuration modal
│   │   ├── common/
│   │   │   ├── ErrorBoundary.tsx       ← React error boundary
│   │   │   ├── FeedbackState.tsx       ← Empty/error/loading state display
│   │   │   ├── LoadingSpinner.tsx      ← Spinner component
│   │   │   └── StatusBadge.tsx         ← Status indicator badge
│   │   ├── settings/
│   │   │   ├── ProvidersSettings.tsx   ← AI provider config panel
│   │   │   └── UpdateSettings.tsx      ← App update settings panel
│   │   └── ui/                         ← shadcn/ui primitives
│   │       ├── badge.tsx, button.tsx, card.tsx, input.tsx, label.tsx
│   │       ├── progress.tsx, select.tsx, separator.tsx, sheet.tsx
│   │       ├── switch.tsx, tabs.tsx, textarea.tsx, tooltip.tsx
│   │       └── confirm-dialog.tsx
│   │
│   ├── stores/                         ← Zustand state stores
│   │   ├── gateway.ts                  ← Gateway lifecycle + SSE event routing
│   │   ├── settings.ts                 ← App settings (theme, language, proxy, etc.)
│   │   ├── providers.ts                ← AI provider state
│   │   ├── agents.ts                   ← Agent list and configs
│   │   ├── channels.ts                 ← Channel configurations and status
│   │   ├── skills.ts                   ← Skill configs and marketplace state
│   │   ├── cron.ts                     ← Cron job list
│   │   ├── update.ts                   ← App update state
│   │   └── chat/                       ← Chat store (modular)
│   │       ├── store-api.ts            ← Public Zustand store creation
│   │       ├── types.ts                ← ChatState, RawMessage, ContentBlock, etc.
│   │       ├── internal.ts             ← Internal state helpers
│   │       ├── session-actions.ts      ← Session creation/switching/deletion
│   │       ├── session-history-actions.ts ← History load helpers
│   │       ├── history-actions.ts      ← Load chat history from gateway
│   │       ├── runtime-actions.ts      ← Send/abort message actions
│   │       ├── runtime-send-actions.ts ← Message construction and send
│   │       ├── runtime-event-actions.ts ← Handle streaming events
│   │       ├── runtime-event-handlers.ts ← Streaming state updates
│   │       ├── runtime-ui-actions.ts   ← UI-side event handling
│   │       ├── cron-session-utils.ts   ← Cron-related session helpers
│   │       └── helpers.ts              ← Utility functions
│   │
│   ├── lib/                            ← Utility libraries
│   │   ├── api-client.ts               ← Multi-transport IPC/WS/HTTP client
│   │   ├── host-api.ts                 ← Host API HTTP client (hostApiFetch)
│   │   ├── host-events.ts              ← SSE event subscription
│   │   ├── gateway-client.ts           ← Gateway-specific client helpers
│   │   ├── error-model.ts              ← AppError class and error normalization
│   │   ├── providers.ts                ← Provider display helpers
│   │   ├── provider-accounts.ts        ← Provider account helpers
│   │   ├── channel-alias.ts            ← Channel type aliases
│   │   ├── channel-status.ts           ← Channel status utilities
│   │   ├── telemetry.ts                ← Frontend PostHog events
│   │   └── utils.ts                    ← General utilities (cn, etc.)
│   │
│   ├── hooks/                          ← Custom React hooks
│   │   ├── use-min-loading.ts          ← Minimum loading duration
│   │   └── use-stick-to-bottom-instant.ts ← Scroll-to-bottom behavior
│   │
│   ├── types/                          ← TypeScript type definitions
│   │   ├── agent.ts                    ← Agent types
│   │   ├── channel.ts                  ← Channel types
│   │   ├── cron.ts                     ← Cron types
│   │   ├── gateway.ts                  ← Gateway status types
│   │   ├── skill.ts                    ← Skill types
│   │   └── electron.d.ts              ← window.electron type declarations
│   │
│   ├── i18n/                           ← Internationalization
│   │   ├── index.ts                    ← i18next setup and exports
│   │   └── locales/
│   │       ├── en/{namespace}.json     ← English translations
│   │       ├── zh/{namespace}.json     ← Chinese translations
│   │       ├── ja/{namespace}.json     ← Japanese translations
│   │       └── ru/{namespace}.json     ← Russian translations
│   │
│   └── assets/                         ← Static assets
│       ├── logo.svg                    ← App logo
│       └── providers/index.ts          ← Provider icon/asset registry
│
├── electron/                           ← Electron main process
│   ├── main/                           ← Main process bootstrap and lifecycle
│   │   ├── index.ts                    ← Entry: window, tray, initialization
│   │   ├── ipc-handlers.ts             ← All IPC handler registrations (50+ channels)
│   │   ├── app-state.ts                ← Global quit state
│   │   ├── menu.ts                     ← Application menu
│   │   ├── tray.ts                     ← System tray icon and menu
│   │   ├── window.ts                   ← Window state management
│   │   ├── updater.ts                  ← Auto-update (electron-updater)
│   │   ├── proxy.ts                    ← Proxy settings application
│   │   ├── launch-at-startup.ts        ← Login item management
│   │   ├── quit-lifecycle.ts           ← Graceful quit orchestration
│   │   ├── signal-quit.ts              ← SIGINT/SIGTERM handlers
│   │   ├── process-instance-lock.ts    ← File-based instance lock
│   │   ├── main-window-focus.ts        ← Second-instance focus handling
│   │   ├── provider-model-sync.ts      ← Provider/model config sync
│   │   └── ipc/
│   │       ├── host-api-proxy.ts       ← IPC proxy for Host API requests
│   │       └── request-helpers.ts      ← Request/response type helpers
│   │
│   ├── gateway/                        ← OpenClaw Gateway management
│   │   ├── manager.ts                  ← GatewayManager (central orchestrator)
│   │   ├── lifecycle-controller.ts     ← Serialized start/stop/restart
│   │   ├── startup-orchestrator.ts     ← Step-by-step startup with recovery
│   │   ├── startup-recovery.ts         ← Recovery from bad startup state
│   │   ├── startup-stderr.ts           ← stderr classification and logging
│   │   ├── process-launcher.ts         ← UtilityProcess spawn
│   │   ├── process-policy.ts           ← Reconnect config and FSM states
│   │   ├── supervisor.ts               ← Process detection and management
│   │   ├── connection-monitor.ts       ← WebSocket heartbeat monitoring
│   │   ├── restart-controller.ts       ← Auto-restart coordination
│   │   ├── restart-governor.ts         ← Backoff and circuit-breaker
│   │   ├── reload-policy.ts            ← Gateway reload policy config
│   │   ├── ws-client.ts                ← WebSocket connect helpers
│   │   ├── state.ts                    ← GatewayStateController (FSM)
│   │   ├── config-sync.ts              ← Pre-launch config sync
│   │   ├── config-sync-env.ts          ← Env-based config sync
│   │   ├── protocol.ts                 ← JSON-RPC types and validators
│   │   ├── request-store.ts            ← In-flight RPC tracking
│   │   ├── event-dispatch.ts           ← IPC notification dispatch to renderer
│   │   ├── clawhub.ts                  ← ClawHub marketplace client
│   │   └── client.ts                   ← Direct gateway client utilities
│   │
│   ├── api/                            ← Host API HTTP server
│   │   ├── server.ts                   ← HTTP server bootstrap + auth
│   │   ├── context.ts                  ← HostApiContext type
│   │   ├── event-bus.ts                ← HostEventBus (SSE multiplexer)
│   │   ├── route-utils.ts              ← sendJson, setCorsHeaders helpers
│   │   └── routes/
│   │       ├── app.ts                  ← /api/app/*
│   │       ├── gateway.ts              ← /api/gateway/*, /api/chat/send-with-media
│   │       ├── settings.ts             ← /api/settings/*
│   │       ├── providers.ts            ← /api/providers/*
│   │       ├── agents.ts               ← /api/agents/*
│   │       ├── channels.ts             ← /api/channels/*
│   │       ├── skills.ts               ← /api/skills/*
│   │       ├── sessions.ts             ← /api/sessions/*
│   │       ├── cron.ts                 ← /api/cron/*
│   │       ├── logs.ts                 ← /api/logs/*
│   │       ├── usage.ts                ← /api/usage/*
│   │       └── files.ts                ← /api/files/* (file staging)
│   │
│   ├── preload/
│   │   └── index.ts                    ← contextBridge API exposure to renderer
│   │
│   ├── services/
│   │   ├── providers/
│   │   │   ├── provider-service.ts     ← High-level provider CRUD façade
│   │   │   ├── provider-store.ts       ← Provider metadata persistence
│   │   │   ├── provider-validation.ts  ← API key validation
│   │   │   ├── provider-runtime-sync.ts← Sync to OpenClaw runtime
│   │   │   ├── provider-migration.ts   ← Legacy format migration
│   │   │   └── store-instance.ts       ← Singleton instance
│   │   └── secrets/
│   │       └── secret-store.ts         ← Keychain-backed secret storage
│   │
│   ├── shared/
│   │   └── providers/
│   │       ├── registry.ts             ← Provider type registry
│   │       └── types.ts                ← Provider type definitions
│   │
│   └── utils/                          ← Main process utilities
│       ├── store.ts                    ← electron-store wrapper (settings)
│       ├── config.ts                   ← Port config and constants
│       ├── paths.ts                    ← OpenClaw dir paths
│       ├── logger.ts                   ← File + console logger
│       ├── telemetry.ts                ← PostHog Node analytics
│       ├── secure-storage.ts           ← OS credential store abstraction
│       ├── channel-config.ts           ← Channel config CRUD
│       ├── channel-alias.ts            ← Channel type mapping
│       ├── channel-status.ts           ← Channel status utilities
│       ├── skill-config.ts             ← Skill config read/write
│       ├── plugin-install.ts           ← Plugin installation helpers
│       ├── provider-registry.ts        ← Provider registry lookup
│       ├── provider-keys.ts            ← Provider key utilities
│       ├── openclaw-auth.ts            ← Write API keys to OpenClaw config
│       ├── openclaw-cli.ts             ← CLI auto-install and completions
│       ├── openclaw-workspace.ts       ← AmyBot context injection
│       ├── openclaw-proxy.ts           ← Sync proxy to OpenClaw config
│       ├── openclaw-sdk.ts             ← OpenClaw SDK wrapper
│       ├── openclaw-control-ui.ts      ← Control UI URL builder
│       ├── openclaw-doctor.ts          ← Diagnostic/repair utilities
│       ├── uv-setup.ts                 ← UV Python env setup
│       ├── uv-env.ts                   ← UV network warm-up
│       ├── device-identity.ts          ← Persistent device ID
│       ├── device-oauth.ts             ← Device OAuth (Code Plan)
│       ├── browser-oauth.ts            ← Browser OAuth flow
│       ├── gemini-cli-oauth.ts         ← Gemini CLI OAuth
│       ├── minimax-oauth.ts            ← MiniMax OAuth
│       ├── openai-codex-oauth.ts       ← OpenAI Codex OAuth
│       ├── whatsapp-login.ts           ← WhatsApp QR login manager
│       ├── wechat-login.ts             ← WeChat QR login manager
│       ├── win-shell.ts                ← Windows shell utilities
│       ├── proxy-fetch.ts              ← Proxy-aware fetch wrapper
│       ├── proxy.ts                    ← Electron proxy application
│       ├── token-usage.ts              ← Token usage history
│       ├── token-usage-core.ts         ← Token usage core logic
│       ├── config-mutex.ts             ← Config file mutex
│       └── env-path.ts                 ← Env path helpers
│
├── shared/                             ← Code shared between renderer and main
│   ├── language.ts                     ← Language code resolution
│   └── providers/                      ← (mirror of electron/shared/providers)
│
├── resources/                          ← App resources (bundled as extraResources)
│   ├── icons/                          ← App icons (icns, ico, png, svg)
│   ├── bin/                            ← Platform-specific binaries (uv, etc.)
│   ├── cli/                            ← OpenClaw CLI wrappers
│   ├── screenshot/                     ← README screenshots
│   └── dmg-background.png              ← macOS DMG background
│
├── scripts/                            ← Build and utility scripts (zx)
│   ├── bundle-openclaw.mjs             ← Copy OpenClaw to build/
│   ├── bundle-openclaw-plugins.mjs     ← Bundle platform plugins
│   ├── bundle-preinstalled-skills.mjs  ← Bundle skills
│   ├── prepare-preinstalled-skills-dev.mjs ← Dev skill preparation
│   ├── download-bundled-uv.mjs         ← Download UV binary
│   ├── download-bundled-node.mjs       ← Download Node for Windows
│   ├── generate-icons.mjs              ← Icon generation
│   ├── after-pack.cjs                  ← Post-pack hook (patching)
│   ├── installer.nsh                   ← NSIS installer script
│   ├── linux/                          ← Linux post-install scripts
│   └── comms/                          ← Comms regression test scripts
│
├── tests/                              ← Test suites
│   ├── setup.ts                        ← Test setup (vi.mock, etc.)
│   ├── unit/                           ← Vitest unit tests
│   └── e2e/                            ← Playwright E2E tests
│
├── .github/workflows/                  ← CI/CD pipelines
│   ├── check.yml                       ← Lint + typecheck + unit tests
│   ├── release.yml                     ← Full release build
│   ├── electron-e2e.yml                ← E2E on macOS
│   ├── win-build-test.yml              ← Windows build verification
│   ├── package-win-manual.yml          ← Manual Windows packaging
│   └── comms-regression.yml            ← Comms regression tests
│
├── index.html                          ← Vite HTML entry point
├── vite.config.ts                      ← Vite + Electron plugin config
├── tsconfig.json                       ← TypeScript config (renderer)
├── tsconfig.node.json                  ← TypeScript config (build tools)
├── electron-builder.yml                ← electron-builder packaging config
├── tailwind.config.js                  ← Tailwind CSS config
├── postcss.config.js                   ← PostCSS config
├── eslint.config.mjs                   ← ESLint flat config
├── playwright.config.ts                ← Playwright E2E config
├── vitest.config.ts                    ← Vitest unit test config
├── pnpm-workspace.yaml                 ← PNPM workspace config
├── .npmrc                              ← npm/pnpm config
├── .prettierrc                         ← Prettier config
├── .env.example                        ← Example environment variables
└── package.json                        ← Root package manifest
```

---

## Critical Directories

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `src/pages/Chat/` | Main user-facing AI chat | `index.tsx`, `ChatMessage.tsx`, `ChatInput.tsx` |
| `src/stores/chat/` | All chat state logic | `store-api.ts`, `types.ts`, `runtime-event-handlers.ts` |
| `electron/gateway/` | OpenClaw process management | `manager.ts`, `startup-orchestrator.ts`, `lifecycle-controller.ts` |
| `electron/main/` | Main process bootstrap | `index.ts`, `ipc-handlers.ts` |
| `electron/api/` | Host API HTTP server | `server.ts`, `event-bus.ts`, `routes/` |
| `electron/services/providers/` | AI provider management | `provider-service.ts`, `provider-runtime-sync.ts` |
| `electron/utils/` | All main-process utilities | various |
| `src/lib/` | Renderer communication layer | `api-client.ts`, `host-api.ts`, `host-events.ts` |

---

## Entry Points

| Entry | Context | File |
|-------|---------|------|
| Main process | Node.js (Electron) | `electron/main/index.ts` |
| Preload script | Renderer bridge | `electron/preload/index.ts` |
| Renderer SPA | Chromium | `src/main.tsx` → `src/App.tsx` |
| Vite dev server | Development | `vite.config.ts` (port 5173) |
| Host API server | Node.js HTTP | `electron/api/server.ts` (port 13210) |
| OpenClaw gateway | Sidecar process | spawned from `electron/gateway/process-launcher.ts` (port 18789) |
