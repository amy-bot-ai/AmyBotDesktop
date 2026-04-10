# AmyBot — Component Inventory

> **Generated:** 2026-04-10

---

## Layout Components (`src/components/layout/`)

| Component | File | Purpose |
|-----------|------|---------|
| `MainLayout` | `layout/MainLayout.tsx` | Shell layout — sidebar + `<Outlet>` for page content |
| `Sidebar` | `layout/Sidebar.tsx` | Left navigation sidebar with route links, gateway status indicator |
| `TitleBar` | `layout/TitleBar.tsx` | Custom title bar (used on Windows/Linux with `titleBarStyle: 'hidden'`); exposes minimize/maximize/close via `window:*` IPC |

---

## Page Components (`src/pages/`)

| Page | Directory | Route | Key Features |
|------|-----------|-------|-------------|
| **Chat** | `pages/Chat/` | `/` | Streaming AI chat, session management, tool call visualization, file attachments, thinking mode, sub-agent transcripts |
| **Agents** | `pages/Agents/` | `/agents` | Create/edit/delete named AI agents |
| **Channels** | `pages/Channels/` | `/channels` | Configure and connect messaging channels; QR login for WhatsApp/WeChat |
| **Skills** | `pages/Skills/` | `/skills` | Browse ClawHub marketplace; install/uninstall skills; toggle skill enable/disable |
| **Cron** | `pages/Cron/` | `/cron` | Create/edit/delete cron jobs; manual trigger |
| **Models** | `pages/Models/` | `/models` | View and configure AI providers/models; token usage history |
| **Settings** | `pages/Settings/` | `/settings/*` | Tabbed settings: General, Gateway, Update, Providers, Developer |
| **Setup** | `pages/Setup/` | `/setup/*` | First-run wizard: Welcome → Runtime → Provider → Installing → Complete |

### Chat Sub-Components

| Component | File | Purpose |
|-----------|------|---------|
| `ChatInput` | `Chat/ChatInput.tsx` | Message text input with file attachment, send button, abort button |
| `ChatMessage` | `Chat/ChatMessage.tsx` | Renders a single message (user/assistant/tool); markdown, images, thinking blocks |
| `ChatToolbar` | `Chat/ChatToolbar.tsx` | Session dropdown, new session, thinking toggle, refresh button |
| `ExecutionGraphCard` | `Chat/ExecutionGraphCard.tsx` | Collapsible sub-agent execution graph/transcript card |

---

## Shared/Common Components (`src/components/common/`)

| Component | File | Purpose |
|-----------|------|---------|
| `ErrorBoundary` | `common/ErrorBoundary.tsx` | React class error boundary; shows error message + reload button |
| `FeedbackState` | `common/FeedbackState.tsx` | Reusable empty/error/loading state display with icon and message |
| `LoadingSpinner` | `common/LoadingSpinner.tsx` | Animated spinner for async loading states |
| `StatusBadge` | `common/StatusBadge.tsx` | Colored status indicator (running/stopped/error/connecting) |

---

## Settings Sub-Components (`src/components/settings/`)

| Component | File | Purpose |
|-----------|------|---------|
| `ProvidersSettings` | `settings/ProvidersSettings.tsx` | AI provider list; add/edit/delete providers; API key management; OAuth flows |
| `UpdateSettings` | `settings/UpdateSettings.tsx` | Auto-update preferences; check for updates; channel selection |

---

## Channel Components (`src/components/channels/`)

| Component | File | Purpose |
|-----------|------|---------|
| `ChannelConfigModal` | `channels/ChannelConfigModal.tsx` | Modal for configuring a specific channel's credentials and options |

---

## UI Primitives (`src/components/ui/`)

Built on **Radix UI** with **shadcn/ui** patterns and **Tailwind CSS**:

| Component | File | Radix Primitive |
|-----------|------|----------------|
| `Badge` | `ui/badge.tsx` | — |
| `Button` | `ui/button.tsx` | `@radix-ui/react-slot` |
| `Card` | `ui/card.tsx` | — |
| `ConfirmDialog` | `ui/confirm-dialog.tsx` | `@radix-ui/react-dialog` |
| `Input` | `ui/input.tsx` | — |
| `Label` | `ui/label.tsx` | `@radix-ui/react-label` |
| `Progress` | `ui/progress.tsx` | `@radix-ui/react-progress` |
| `Select` | `ui/select.tsx` | `@radix-ui/react-select` |
| `Separator` | `ui/separator.tsx` | `@radix-ui/react-separator` |
| `Sheet` | `ui/sheet.tsx` | `@radix-ui/react-dialog` (sheet variant) |
| `Switch` | `ui/switch.tsx` | `@radix-ui/react-switch` |
| `Tabs` | `ui/tabs.tsx` | `@radix-ui/react-tabs` |
| `Textarea` | `ui/textarea.tsx` | — |
| `Tooltip` | `ui/tooltip.tsx` | `@radix-ui/react-tooltip` |

Additional external UI components used directly:
- `sonner` — Toast notifications (`<Toaster>`)
- `lucide-react` — Icon library
- `framer-motion` — Animations (`AnimatePresence`, `motion.*`)
- `react-markdown` + `remark-gfm` — Markdown rendering in chat messages
- `use-stick-to-bottom` — Chat scroll behavior

---

## Design System

**Pattern:** shadcn/ui component pattern — headless Radix UI primitives styled with Tailwind utility classes, customized via `class-variance-authority` and `tailwind-merge`.

**Theme support:** Dark / Light / System (applied via `dark` class on `<html>`)

**Tailwind config:** `tailwind.config.js` — extends default with animation plugin (`tailwindcss-animate`)

**Color variables:** CSS custom properties defined in `src/styles/` — component colors reference `hsl(var(--...))` tokens.

---

## Custom Hooks (`src/hooks/`)

| Hook | File | Purpose |
|------|------|---------|
| `useMinLoading` | `hooks/use-min-loading.ts` | Prevents loading state flicker by enforcing a minimum display duration |
| `useStickToBottomInstant` | `hooks/use-stick-to-bottom-instant.ts` | Keeps chat scroll pinned to bottom during streaming; resets on session change |
