# Plan: Agent Files Tab Feature

## Mục tiêu

Thêm tab **Files** vào trang Agents để người dùng có thể xem và chỉnh sửa các file `.md` trong workspace của agent, tương tự giao diện tại `http://localhost:18789/agents`.

---

## UI Sketch

### Page-level tabs (top of Agents page)

```
┌────────────────────────────────────────────────────────────────────┐
│  Agents                                                            │
│  ┌──────────┬──────────┐                                          │
│  │ Overview │  Files   │                                          │
│  └──────────┴──────────┘                                          │
└────────────────────────────────────────────────────────────────────┘
```

---

### Tab: Overview (unchanged)

```
┌────────────────────────────────────────────────────────────────────┐
│  Overview │  Files                              [+ Add Agent]      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────┐  ┌──────────────────────────┐       │
│  │  🤖  Default Agent       │  │  🤖  Amy Sales Bot       │       │
│  │  gpt-4o (inherited)      │  │  claude-3-5-sonnet        │       │
│  │  Channels: telegram      │  │  Channels: web, slack     │       │
│  │                   ⚙️ 🗑  │  │                   ⚙️ 🗑  │       │
│  └──────────────────────────┘  └──────────────────────────┘       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

### Tab: Files — default state (no file selected / blurred)

```
┌────────────────────────────────────────────────────────────────────┐
│  Overview │ [Files]                                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Core Files                                          [Refresh]     │
│  Bootstrap persona, identity, and tool guidance.                   │
│  Workspace: /Users/lephuockhai/.openclaw/workspace                 │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ [AGENTS]  SOUL  TOOLS  IDENTITY  USER  HEARTBEAT  BOOTSTRAP  MEMORY · missing │
│  ├────────────────────────────────────────────────────────────┤   │
│  │                                                            │   │
│  │  /Users/lephuockhai/.openclaw/workspace/AGENTS.md          │   │
│  │                              [👁 Preview]  [Reset]  [Save] │   │
│  │  Content                                                   │   │
│  │  ╔══════════════════════════════════════════════════════╗  │   │
│  │  ║ ░▒▓ ████████ ██ ████████████████                    ║  │   │
│  │  ║ ░▒▓ ████████████ ██ ███████ ██████████████████      ║  │   │
│  │  ║ ░▒▓ █████ ██████████ ████ ██                        ║  │   │
│  │  ║      (blurred — click anywhere to unlock)           ║  │   │
│  │  ╚══════════════════════════════════════════════════════╝  │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

### Tab: Files — after click (edit mode)

```
┌────────────────────────────────────────────────────────────────────┐
│  Overview │ [Files]                                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Core Files                                          [Refresh]     │
│  Bootstrap persona, identity, and tool guidance.                   │
│  Workspace: /Users/lephuockhai/.openclaw/workspace                 │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ [AGENTS]  SOUL  TOOLS  IDENTITY  USER  HEARTBEAT  BOOTSTRAP  MEMORY · missing │
│  ├────────────────────────────────────────────────────────────┤   │
│  │                                                            │   │
│  │  /Users/lephuockhai/.openclaw/workspace/AGENTS.md          │   │
│  │                              [👁 Preview]  [Reset]  [Save●]│   │  ← ● = unsaved
│  │  Content                                                   │   │
│  │  ╔══════════════════════════════════════════════════════╗  │   │
│  │  ║ # Amy Workspace                                      ║  │   │
│  │  ║                                                      ║  │   │
│  │  ║ This folder is open. There is one app.               ║  │   │
│  │  ║                                                      ║  │   │
│  │  ║ ## Amy Rules                                         ║  │   │
│  │  ║ ...                                                  ║  │   │
│  │  ║                                          [scrollbar] ║  │   │
│  │  ╚══════════════════════════════════════════════════════╝  │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

### Tab: Files — Preview mode (toggle)

```
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ [AGENTS]  SOUL  TOOLS  ...                                 │   │
│  ├────────────────────────────────────────────────────────────┤   │
│  │  /Users/.../AGENTS.md               [✏ Edit]  [Reset] [Save] │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────────┐ │   │
│  │  │  # Amy Workspace                                     │ │   │
│  │  │                                                      │ │   │
│  │  │  This folder is open. There is one app.              │ │   │
│  │  │                                                      │ │   │
│  │  │  ## Amy Rules                                        │ │   │
│  │  │  - Rule 1: ...                                       │ │   │
│  │  └──────────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────┘   │
```

---

### Tab: Files — MISSING file selected

```
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  AGENTS  SOUL  TOOLS  IDENTITY  USER  HEARTBEAT  BOOTSTRAP  [MEMORY · missing] │
│  ├────────────────────────────────────────────────────────────┤   │
│  │                                                            │   │
│  │  ⚠  This file does not exist yet.                         │   │
│  │     /Users/lephuockhai/.openclaw/workspace/MEMORY.md      │   │
│  │                                                            │   │
│  │  ╔══════════════════════════════════════════════════════╗  │   │
│  │  ║  (empty — type here to create)                      ║  │   │
│  │  ╚══════════════════════════════════════════════════════╝  │   │
│  │                                              [Save]        │   │
│  └────────────────────────────────────────────────────────────┘   │
```

---

## Danh sách files cần quản lý

| Tab label | File name     | Ghi chú            |
|-----------|---------------|--------------------|
| AGENTS    | AGENTS.md     | Luôn có            |
| SOUL      | SOUL.md       | Luôn có            |
| TOOLS     | TOOLS.md      | Luôn có            |
| IDENTITY  | IDENTITY.md   | Luôn có            |
| USER      | USER.md       | Luôn có            |
| HEARTBEAT | HEARTBEAT.md  | Luôn có            |
| BOOTSTRAP | BOOT.md       | Luôn có            |
| MEMORY    | MEMORY.md     | Có thể MISSING     |

Workspace path lấy từ default agent config (`agents.defaults.workspace` → `~/.openclaw/workspace`).

---

## Các thay đổi cần làm

### 1. Backend — Thêm API routes cho workspace files

**File:** `electron/api/routes/agents.ts` (hoặc file riêng `workspace-files.ts`)

```
GET  /api/workspace-files             → list tất cả files + trạng thái (exists/missing)
GET  /api/workspace-files/:filename   → đọc nội dung file
PUT  /api/workspace-files/:filename   → lưu nội dung file
```

Response mẫu cho GET list:
```json
{
  "workspacePath": "/Users/.../.openclaw/workspace",
  "files": [
    { "key": "AGENTS",    "filename": "AGENTS.md",   "exists": true },
    { "key": "MEMORY",    "filename": "MEMORY.md",   "exists": false }
  ]
}
```

**Implementation notes:**
- Đọc workspace path từ `getAgentConfig().agents.defaults.workspace`
- Dùng `fs.readFile` / `fs.writeFile` với path join
- Trả về 404 nếu file không tồn tại (GET content)
- PUT tự động tạo file nếu chưa có (mkdir -p workspace trước)

---

### 2. Frontend — Tái cấu trúc Agents page thành tabbed layout

**File:** `src/pages/Agents/index.tsx`

Bọc nội dung hiện tại trong Radix `<Tabs>`:

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="files">Files</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    {/* existing agent list UI */}
  </TabsContent>
  <TabsContent value="files">
    <AgentFilesTab />
  </TabsContent>
</Tabs>
```

---

### 3. Frontend — Component `AgentFilesTab`

**File mới:** `src/pages/Agents/AgentFilesTab.tsx`

**State:**
```ts
activeFile: keyof FileKey           // tab con đang chọn
contents: Record<FileKey, string>   // nội dung đã load
originals: Record<FileKey, string>  // để Reset
filesMeta: FileMeta[]               // exists/missing
isLoading: boolean
isDirty: boolean                    // có thay đổi chưa save
isPreview: boolean                  // toggle preview mode
```

**Behavior:**
- Load `filesMeta` lúc mount (GET /api/workspace-files)
- Khi click sub-tab: nếu chưa load content thì fetch (GET /api/workspace-files/:filename)
- Content ban đầu **blur** (`filter: blur(3px)`) → click vào để unlock (set `isUnlocked = true`)
- **Preview**: render markdown bằng component hiện có trong codebase
- **Reset**: restore `contents[active]` = `originals[active]`
- **Save**: PUT /api/workspace-files/:filename với content mới, toast success/error
- Sub-tab MISSING: label có badge `MISSING` màu muted, vẫn click được (tạo file mới)

**Layout chi tiết:**
```
┌─────────────────────────────────────────────────────┐
│ Core Files                           [Refresh]       │
│ Bootstrap persona, identity...                       │
│ Workspace: /Users/.../.openclaw/workspace            │
├─────────────────────────────────────────────────────┤
│ [AGENTS] SOUL  TOOLS  IDENTITY  USER  HEARTBEAT  BOOTSTRAP  MEMORY(missing) │
├─────────────────────────────────────────────────────┤
│ /Users/.../.openclaw/workspace/AGENTS.md            │
│                              [Preview] [Reset] [Save]│
│ Content                                              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ (blurred until clicked, then editable textarea) │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

### 4. Frontend — API client functions

**File:** `src/api/workspaceFiles.ts` (mới)

```ts
export const listWorkspaceFiles = () => GET('/api/workspace-files')
export const getWorkspaceFile = (filename: string) => GET(`/api/workspace-files/${filename}`)
export const saveWorkspaceFile = (filename: string, content: string) => PUT(`/api/workspace-files/${filename}`, { content })
```

---

## Thứ tự implement

```
Phase 1: Backend API
  [x] Thêm GET /api/workspace-files
  [x] Thêm GET /api/workspace-files/:filename
  [x] Thêm PUT /api/workspace-files/:filename

Phase 2: API client
  [x] src/api/workspaceFiles.ts

Phase 3: UI component
  [x] AgentFilesTab.tsx (sub-tabs, blur effect, editor, preview)
  [x] Tích hợp vào Agents page với Tabs wrapper

Phase 4: Polish
  [x] Toast notifications khi save/error
  [x] Dirty state indicator (disable close if unsaved)
  [x] MISSING badge style
  [x] Responsive/scroll behavior
```

---

## Câu hỏi cần thảo luận trước khi làm

1. **Workspace nào hiển thị?** Default workspace (`~/.openclaw/workspace`) hay workspace của từng agent? Hay dropdown chọn agent?
2. **Blur behavior**: Blur cả panel rồi click để mở? Hay load xong thì tự hiện luôn (không blur)?
3. **Preview**: Dùng markdown renderer nào? (Đã có component nào trong codebase chưa?)
4. **MEMORY tab**: Nếu MISSING thì click vào có tạo file mới không, hay chỉ hiển thị empty editor?
5. **Unsaved changes**: Có cần warning khi chuyển tab con nếu chưa save không?
