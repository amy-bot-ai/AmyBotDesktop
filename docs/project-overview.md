# AmyBot — Project Overview

> **Generated:** 2026-04-10 | **Version:** 0.3.8 | **Type:** Electron Desktop Application

---

## Executive Summary

**AmyBot** is a cross-platform desktop application that provides a graphical user interface for [OpenClaw](https://github.com/OpenClaw) AI agents. It bridges the gap between powerful AI orchestration tooling and everyday users by embedding the OpenClaw runtime ("gateway") and exposing it through a polished, zero-configuration desktop experience.

The application is built on **Electron 40** with a **React 19** renderer and a sophisticated **Node.js main process**. It ships on macOS, Windows, and Linux and supports multi-language UI (English, Chinese, Japanese, Russian).

---

## Purpose and Goals

| Goal | Description |
|------|-------------|
| Zero-configuration | Users set up providers and start chatting through a graphical wizard — no YAML, no terminal |
| Embedded runtime | OpenClaw gateway bundled and auto-managed; no separate install required |
| Multi-provider AI | Supports Anthropic, OpenAI, Gemini, and many other AI providers via OpenClaw |
| Multi-channel | Connect AI agents to messaging platforms (DingTalk, WeChat, WeCom, WhatsApp, etc.) |
| Skills & plugins | Marketplace-style skill installation and built-in skill deployment |
| Scheduled tasks | Cron-based task scheduling for automated AI runs |

---

## Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Desktop framework | Electron | 40.x |
| UI library | React | 19.x |
| Language | TypeScript | 5.9 |
| Build tool | Vite + vite-plugin-electron | 7.x / 0.29.x |
| State management | Zustand | 5.x |
| UI components | Radix UI + shadcn/ui | various |
| Styling | Tailwind CSS | 3.x |
| Animation | Framer Motion | 12.x |
| Internationalization | i18next + react-i18next | 25.x / 16.x |
| Packaging | electron-builder | 26.x |
| Package manager | pnpm | 10.x |
| Testing (unit) | Vitest | 4.x |
| Testing (e2e) | Playwright | 1.56.x |
| AI Core | OpenClaw (bundled) | 2026.4.9 |
| Skills hub | ClawHub | via clawhub npm pkg |

---

## Architecture Summary

AmyBot uses a **dual-process Electron architecture** with a third in-process HTTP server layer:

```
┌─────────────────────────────────────────────┐
│  Renderer Process (React SPA)               │
│  - Pages: Chat, Agents, Channels, Skills,   │
│    Cron, Models, Settings, Setup            │
│  - Zustand stores for all state             │
│  - Communicates via IPC and Host API HTTP   │
└──────────────┬──────────────────────────────┘
               │ Electron IPC / contextBridge
               │ Host API (HTTP/SSE on :13210)
┌──────────────▼──────────────────────────────┐
│  Main Process (Node.js)                     │
│  - GatewayManager: lifecycle of OpenClaw    │
│  - Host API HTTP server (127.0.0.1:13210)   │
│  - IPC handlers (50+ channels)             │
│  - Provider/secret management               │
│  - Channel configuration                    │
│  - Auto-update, tray, menu                  │
└──────────────┬──────────────────────────────┘
               │ WebSocket JSON-RPC / process spawn
┌──────────────▼──────────────────────────────┐
│  OpenClaw Gateway (child process)           │
│  - AI agent orchestration                   │
│  - Provider API calls                       │
│  - Skill execution                          │
│  - Channel integrations                     │
│  - Port: 18789 (configurable)               │
└─────────────────────────────────────────────┘
```

---

## Key Features

- **Setup Wizard**: Multi-step first-run experience (Welcome → Runtime → Provider → Installing → Complete)
- **Chat Interface**: Session-based AI chat with streaming, thinking mode, tool call visualization, file attachments
- **Agent Management**: Create and manage named AI agents with custom configurations
- **Channel Integration**: Connect messaging platforms (WhatsApp, DingTalk, WeChat, WeCom)
- **Skills Marketplace**: Browse and install skills from ClawHub; manage installed skills
- **Cron Scheduler**: Schedule recurring AI tasks with cron expressions
- **Model Management**: Configure and monitor AI provider models and token usage
- **Settings**: Theme (dark/light/system), language, proxy, gateway port, update channel, developer mode

---

## Repository Structure

| Directory | Purpose |
|-----------|---------|
| `src/` | React renderer (SPA) |
| `electron/` | Electron main process |
| `shared/` | Code shared between renderer and main |
| `resources/` | App icons, screenshots, binaries |
| `scripts/` | Build, packaging, and utility scripts |
| `tests/` | Unit and E2E test suites |
| `.github/workflows/` | CI/CD pipelines |

---

## Supported Platforms

| Platform | Formats |
|----------|---------|
| macOS | `.dmg`, `.zip` (x64, arm64) |
| Windows | `.exe` (NSIS installer, x64) |
| Linux | `.AppImage`, `.deb`, `.rpm` (x64, arm64) |

---

## Links

- [Architecture Documentation](./architecture.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Component Inventory](./component-inventory.md)
- [Development Guide](./development-guide.md)
- [Deployment Guide](./deployment-guide.md)
- [Full Documentation Index](./index.md)
- [README](../README.md)
- [Security Policy](../SECURITY.md)
