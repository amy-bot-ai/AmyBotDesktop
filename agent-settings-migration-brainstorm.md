# Agent Settings Migration: Portal → AmyBotDesktop

> **Scope (trimmed to truly necessary):** Three features that affect agent behavior or are functionally missing in Desktop.

---

## What We're Implementing

### 1. Fallback Models

**Why necessary:** If the primary model is rate-limited or unavailable, the agent silently fails. The backend already supports `model: { primary, fallbacks[] }` in `openclaw.json` — but Desktop has no UI to configure fallbacks.

**What changes:**
- `src/types/agent.ts` — add `fallbackModels: string[]` to `AgentSummary`
- `electron/utils/agent-config.ts` — read/write fallbacks from config; update `updateAgentModel`
- `electron/api/routes/agents.ts` — `PUT /api/agents/{id}/model` accepts `{ modelRef, fallbacks }`
- `src/stores/agents.ts` — `updateAgentModel(agentId, modelRef, fallbacks)`
- `src/pages/Agents/index.tsx` — "Fallback Models" section in `AgentModelModal`

---

### 2. Skills Allowlist

**Why necessary:** `config.agents.list[].skills[]` controls which skills the agent is allowed to use. Without this UI, users must hand-edit `openclaw.json` to restrict or grant skills per-agent.

**What changes:**
- `src/types/agent.ts` — add `skills: string[]` to `AgentSummary`
- `electron/utils/agent-config.ts` — read/write skills; add `updateAgentSkills`
- `electron/api/routes/agents.ts` — `PUT /api/agents/{id}/skills`
- `src/stores/agents.ts` — `updateAgentSkills(agentId, skills)`
- `src/pages/Agents/index.tsx` — Skills checkbox list in `AgentSettingsModal` (uses existing `useSkillsStore`)

---

### 3. Web Widget Config UI

**Why necessary:** The portal manages `~/.openclaw/web-widget.json` (token, theme, bot name, etc.). Desktop shares the same home dir but has zero UI to configure the widget. Users who rely on the web widget but prefer Desktop have no way to manage it without opening the portal.

**Scope:** Config management only. The widget is still *served* by the Portal — Desktop generates the settings and the embed snippet.

**What changes:**
- `electron/utils/widget-config.ts` — new: read/write `~/.openclaw/web-widget.json`; token generation
- `electron/api/routes/widget.ts` — new: `GET/PATCH /api/widget`, `POST /api/widget/token`
- `electron/api/server.ts` — register widget route handler
- `src/pages/Agents/index.tsx` — "Web Widget" section in `AgentSettingsModal` with `WebWidgetModal`

---

## Not Implementing

| Skipped | Reason |
|---|---|
| Avatar / emoji | Cosmetic |
| Last active / token usage | Monitoring, not settings |
| Subagent allowlist | Edge case |
| Identity theme / snippet | Presentation only |
| Default workspace editing | Config file is fine |

---

*Implementation order: fallback models → skills allowlist → web widget config*
