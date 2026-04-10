# AmyBot — Project Documentation Index

> **Generated:** 2026-04-10 | **Scan:** Exhaustive | **Version:** 0.3.8

---

## Project Overview

- **Type:** Monolith Desktop Application (Electron)
- **Primary Language:** TypeScript
- **Architecture:** Layered desktop (Renderer + Main process + OpenClaw sidecar)
- **Platforms:** macOS, Windows, Linux

## Quick Reference

- **Tech Stack:** Electron 40, React 19, TypeScript 5.9, Vite 7, Zustand 5, Tailwind CSS 3, Radix UI
- **Entry Point (Main):** `electron/main/index.ts`
- **Entry Point (Renderer):** `src/main.tsx`
- **Architecture Pattern:** Dual-process Electron + sidecar gateway
- **Package Manager:** pnpm 10

### Key Ports

| Service | Port |
|---------|------|
| OpenClaw Gateway | 18789 |
| Host API HTTP | 13210 |
| Vite Dev Server | 5173 |

---

## Generated Documentation

- [Project Overview](./project-overview.md)
- [Architecture](./architecture.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Component Inventory](./component-inventory.md)
- [Development Guide](./development-guide.md)
- [Deployment Guide](./deployment-guide.md)

---

## Existing Documentation

- [README (English)](../README.md) — Feature overview, screenshots, getting started
- [README (中文)](../README.zh-CN.md) — Chinese README
- [README (日本語)](../README.ja-JP.md) — Japanese README
- [README (Русский)](../README.ru-RU.md) — Russian README
- [Security Policy](../SECURITY.md) — Security vulnerability reporting
- [Code of Conduct](../CODE_OF_CONDUCT.md) — Community standards
- [Agents Guide](../AGENTS.md) — AI agent usage guide

---

## Getting Started

### Development

```bash
# Install dependencies + download UV
pnpm run init

# Start development server (Electron + Vite HMR)
pnpm dev
```

### Build

```bash
# Full production build
pnpm build

# Platform-specific packaging
pnpm package:mac
pnpm package:win     # requires: pnpm prep:win-binaries
pnpm package:linux
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

---

## Architecture at a Glance

```
┌─────────────────────────────────┐
│  Renderer (React 19 SPA)        │  ← src/
│  Zustand stores + Radix UI      │
└────────────┬────────────────────┘
             │ IPC / Host API (HTTP)
┌────────────▼────────────────────┐
│  Main Process (Node.js)         │  ← electron/main/ + electron/api/
│  GatewayManager + Host API      │
└────────────┬────────────────────┘
             │ WebSocket JSON-RPC
┌────────────▼────────────────────┐
│  OpenClaw Gateway (sidecar)     │  ← port 18789
│  AI agents + skills + channels  │
└─────────────────────────────────┘
```

For AI-assisted development, start with:
1. **[Architecture](./architecture.md)** — understand the three-process model
2. **[Source Tree](./source-tree-analysis.md)** — find any file quickly
3. **[Development Guide](./development-guide.md)** — run and build the project
