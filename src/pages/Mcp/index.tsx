/**
 * MCP Servers Settings Page
 * Two-panel layout: server list (left) + add/edit form (right)
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Server,
  Plus,
  Trash2,
  Pencil,
  AlertCircle,
  Info,
  Loader2,
  Wrench,
  RefreshCw,
} from 'lucide-react';
import { invokeIpc } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { useMcpStore, type McpServer } from '@/stores/mcp';
import { useGatewayStore } from '@/stores/gateway';
import { useSettingsStore } from '@/stores/settings';

// ─── Types ──────────────────────────────────────────────────────────────────

type TransportType = 'stdio' | 'http';
type EditTarget = McpServer | 'new' | null;

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

interface ProbeState {
  loading: boolean;
  tools?: McpTool[];
  error?: string;
}

interface FormState {
  name: string;
  transport: TransportType;
  // stdio fields
  command: string;
  args: string;
  env: string;
  cwd: string;
  // http fields
  url: string;
  httpTransport: 'sse' | 'streamable-http';
  headers: string;
}

const defaultForm = (): FormState => ({
  name: '',
  transport: 'stdio',
  command: '',
  args: '',
  env: '',
  cwd: '',
  url: '',
  httpTransport: 'sse',
  headers: '',
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseEnv(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    result[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return result;
}

function parseHeaders(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    result[trimmed.slice(0, colon).trim()] = trimmed.slice(colon + 1).trim();
  }
  return result;
}

function serverToForm(server: McpServer): FormState {
  const isHttp = !!(server.url || server.transport);
  return {
    name: server.name,
    transport: isHttp ? 'http' : 'stdio',
    command: server.command ?? '',
    args: server.args?.join('\n') ?? '',
    env: server.env ? Object.entries(server.env).map(([k, v]) => `${k}=${v}`).join('\n') : '',
    cwd: server.cwd ?? '',
    url: server.url ?? '',
    httpTransport: server.transport ?? 'sse',
    headers: server.headers ? Object.entries(server.headers).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
  };
}

function formToServer(form: FormState): McpServer {
  if (form.transport === 'stdio') {
    const server: McpServer = { name: form.name, command: form.command };
    const args = form.args.split('\n').map((s) => s.trim()).filter(Boolean);
    if (args.length) server.args = args;
    const env = parseEnv(form.env);
    if (Object.keys(env).length) server.env = env;
    if (form.cwd.trim()) server.cwd = form.cwd.trim();
    return server;
  } else {
    const server: McpServer = { name: form.name, url: form.url, transport: form.httpTransport };
    const headers = parseHeaders(form.headers);
    if (Object.keys(headers).length) server.headers = headers;
    return server;
  }
}

function validateName(name: string): string | null {
  if (!name) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return 'Use only letters, numbers, hyphens, and underscores';
  }
  return null;
}

// ─── Transport Badge ──────────────────────────────────────────────────────────

function TransportBadge({ server }: { server: McpServer }) {
  const isHttp = !!(server.url || server.transport);
  return (
    <Badge
      variant="secondary"
      className="text-[11px] px-1.5 py-0"
      title={isHttp ? 'Connects to a URL' : 'Runs a local command'}
    >
      {isHttp ? 'Remote' : 'Local'}
    </Badge>
  );
}

// ─── Tools Panel ──────────────────────────────────────────────────────────────

function ToolsPanel({ server }: { server: McpServer }) {
  const isHttp = !!(server.url || server.transport);
  const [probe, setProbe] = useState<ProbeState>({ loading: false });

  const run = useCallback(async () => {
    setProbe({ loading: true });
    const result = await invokeIpc<{ tools?: McpTool[]; error?: string }>('mcp:probe', server.name, {
      url: server.url,
      transport: server.transport,
      headers: server.headers,
      command: server.command,
    });
    setProbe({ loading: false, tools: result.tools, error: result.error });
  }, [server]);

  useEffect(() => { void run(); }, [run]);

  if (!isHttp) {
    return (
      <div className="flex items-start gap-1.5 px-3 py-2 text-[12px] text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>stdio tools are discovered when the gateway starts a session.</span>
      </div>
    );
  }

  return (
    <div className="px-3 pb-2">
      {probe.loading && (
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground py-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Connecting…
        </div>
      )}
      {!probe.loading && probe.error && (
        <div className="flex items-start gap-1.5 text-[12px] text-destructive py-1">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{probe.error}</span>
        </div>
      )}
      {!probe.loading && probe.tools && probe.tools.length === 0 && !probe.error && (
        <p className="text-[12px] text-muted-foreground py-1">No tools found.</p>
      )}
      {!probe.loading && probe.tools && probe.tools.length > 0 && (
        <ul className="space-y-1">
          {probe.tools.map((tool) => (
            <li key={tool.name} className="flex flex-col gap-0.5">
              <span className="text-[12px] font-mono font-medium">{tool.name}</span>
              {tool.description && (
                <span className="text-[11px] text-muted-foreground leading-snug">{tool.description}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <button
        className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => void run()}
        disabled={probe.loading}
      >
        <RefreshCw className={cn('h-3 w-3', probe.loading && 'animate-spin')} />
        Refresh
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Mcp() {
  const { servers, loading, saving, fetchServers, addServer, updateServer, removeServer } = useMcpStore();
  const status = useGatewayStore((s) => s.status.state);
  const isRunning = status === 'running';
  const isConnecting = status === 'starting' || status === 'reconnecting';
  const isRemote = !!useSettingsStore((s) => s.gatewayRemoteUrl);
  // Block writes only when remote AND actively failed — NOT on initial load (state starts 'stopped')
  const isRemoteDown = isRemote && (status === 'stopped' || status === 'error');

  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [nameError, setNameError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<McpServer | null>(null);
  // Track which server rows have their tools panel expanded
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  // Gateway re-fetch effect — mirrors Channels page pattern
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prev !== 'running' && status === 'running') {
      void useMcpStore.getState().fetchServers();
    }
  }, [status]);
  useEffect(() => { void fetchServers(); }, []);

  // ── Form helpers ──────────────────────────────────────────────────────────

  function openAdd() {
    setEditTarget('new');
    setForm(defaultForm());
    setNameError(null);
  }

  function openEdit(server: McpServer) {
    setEditTarget(server);
    setForm(serverToForm(server));
    setNameError(null);
  }

  function closePanel() {
    setEditTarget(null);
    setForm(defaultForm());
    setNameError(null);
  }

  function setTransport(t: TransportType) {
    // Switching transport resets the other type's fields to avoid sending mixed configs
    if (t === 'stdio') {
      setForm((f) => ({ ...f, transport: 'stdio', url: '', httpTransport: 'sse', headers: '' }));
    } else {
      setForm((f) => ({ ...f, transport: 'http', command: '', args: '', env: '', cwd: '' }));
    }
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    const nameWarn = validateName(form.name);
    if (nameWarn) { setNameError(nameWarn); return; }

    const server = formToServer(form);

    if (editTarget === 'new') {
      // Duplicate check — store also validates, but check here for inline error
      if (servers.some((s) => s.name === server.name)) {
        setNameError('A server with this name already exists');
        return;
      }
      await addServer(server);
      const { saveError } = useMcpStore.getState();
      if (saveError) {
        toast.error(saveError);
      } else {
        toast.success('MCP server added.');
        closePanel();
      }
    } else if (editTarget) {
      const { name, ...updates } = server;
      await updateServer(name, updates);
      const { saveError } = useMcpStore.getState();
      if (saveError) {
        toast.error(saveError);
      } else {
        toast.success('Changes saved.');
        closePanel();
      }
    }
  }

  async function handleDelete(server: McpServer) {
    await removeServer(server.name);
    const { saveError } = useMcpStore.getState();
    if (saveError) {
      toast.error(saveError);
    } else {
      toast.success('MCP server removed.');
    }
    setDeleteTarget(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Banners */}
      {isRemoteDown && (
        <div className="flex items-center gap-2 border-b bg-destructive/10 px-6 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Remote gateway is unreachable. Connect to manage MCP servers.
        </div>
      )}
      {isConnecting && isRemote && !isRemoteDown && (
        <div className="flex items-center gap-2 border-b bg-muted px-6 py-2.5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          Connecting to gateway…
        </div>
      )}
      {!isRunning && !isRemote && (
        <div className="flex items-center gap-2 border-b bg-muted px-6 py-2.5 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          Gateway is stopped. Changes are saved to disk and applied when the gateway starts.
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: server list */}
        <div className="flex w-72 shrink-0 flex-col border-r">
          {/* List header */}
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h2 className="text-[15px] font-semibold">MCP Servers</h2>
              <p className="text-[12px] text-muted-foreground">Model Context Protocol</p>
            </div>
            {!isRemoteDown && (
              <Button size="sm" onClick={openAdd} disabled={saving}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            )}
          </div>

          <Separator />

          {/* Server list / empty state */}
          <div className="flex-1 overflow-y-auto">
            {loading && servers.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {!loading && servers.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                <Server className="h-10 w-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium">No MCP servers configured</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    MCP servers let your agents use external tools like
                    file access, databases, and custom APIs.
                  </p>
                </div>
                {!isRemoteDown && (
                  <Button size="sm" variant="outline" onClick={openAdd}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Server
                  </Button>
                )}
              </div>
            )}

            {servers.map((server) => {
              const toolsExpanded = expandedTools.has(server.name);
              return (
                <div key={server.name} className={cn(
                  'border-b last:border-b-0',
                  editTarget !== 'new' && editTarget?.name === server.name && 'bg-muted/60',
                )}>
                  {/* Row */}
                  <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{server.name}</span>
                        <TransportBadge server={server} />
                      </div>
                    </div>
                    {/* Tools toggle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      title="Show available tools"
                      onClick={() => setExpandedTools((prev) => {
                        const next = new Set(prev);
                        if (next.has(server.name)) next.delete(server.name);
                        else next.add(server.name);
                        return next;
                      })}
                    >
                      <Wrench className="h-3.5 w-3.5" />
                    </Button>
                    {!isRemoteDown && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={saving}
                          onClick={() => openEdit(server)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={saving}
                          onClick={() => setDeleteTarget(server)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* Tools expand panel */}
                  {toolsExpanded && (
                    <div className="border-t bg-muted/30 px-2 py-1.5">
                      <div className="mb-1 flex items-center gap-1 px-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        <Wrench className="h-3 w-3" />
                        Available Tools
                      </div>
                      <ToolsPanel server={server} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Add/Edit form panel */}
        {editTarget !== null && (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-3">
              <h3 className="text-[14px] font-semibold">
                {editTarget === 'new' ? 'Add MCP Server' : `Edit: ${editTarget.name}`}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex max-w-lg flex-col gap-5">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mcp-name">Name</Label>
                  <Input
                    id="mcp-name"
                    value={form.name}
                    disabled={editTarget !== 'new'}
                    className={editTarget !== 'new' ? 'opacity-60' : ''}
                    placeholder="my-mcp-server"
                    onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setNameError(null); }}
                    onBlur={() => {
                      const warn = validateName(form.name);
                      if (warn) { setNameError(warn); return; }
                      if (editTarget === 'new' && servers.some((s) => s.name === form.name)) {
                        setNameError('A server with this name already exists');
                      }
                    }}
                  />
                  {nameError && (
                    <p className="text-[12px] text-destructive">{nameError}</p>
                  )}
                  <p className="text-[12px] text-muted-foreground">
                    Permanent identifier used by OpenClaw. Cannot be changed after creation.
                  </p>
                </div>

                {/* Transport type toggle */}
                <div className="flex flex-col gap-1.5">
                  <Label>Transport Type</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={form.transport === 'stdio' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTransport('stdio')}
                    >
                      Local (stdio)
                    </Button>
                    <Button
                      variant={form.transport === 'http' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTransport('http')}
                    >
                      Remote (HTTP)
                    </Button>
                  </div>
                </div>

                {/* stdio fields */}
                {form.transport === 'stdio' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mcp-command">Command <span className="text-destructive">*</span></Label>
                      <Input
                        id="mcp-command"
                        value={form.command}
                        placeholder="npx my-mcp-server"
                        onChange={(e) => setForm((f) => ({ ...f, command: e.target.value }))}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mcp-args">Arguments (one per line)</Label>
                      <Textarea
                        id="mcp-args"
                        value={form.args}
                        placeholder={`--config\n/path/to/config.json`}
                        className="font-mono text-[12px]"
                        rows={4}
                        onChange={(e) => setForm((f) => ({ ...f, args: e.target.value }))}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mcp-env">Environment Variables (KEY=value, one per line)</Label>
                      <Textarea
                        id="mcp-env"
                        value={form.env}
                        placeholder="API_KEY=your-key-here"
                        className="font-mono text-[12px]"
                        rows={4}
                        onChange={(e) => setForm((f) => ({ ...f, env: e.target.value }))}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mcp-cwd">Working Directory</Label>
                      <Input
                        id="mcp-cwd"
                        value={form.cwd}
                        placeholder="/path/to/working/dir"
                        onChange={(e) => setForm((f) => ({ ...f, cwd: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                {/* http fields */}
                {form.transport === 'http' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mcp-url">URL <span className="text-destructive">*</span></Label>
                      <Input
                        id="mcp-url"
                        value={form.url}
                        placeholder="https://my-mcp-server.example.com/mcp"
                        onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mcp-transport">Transport <span className="text-destructive">*</span></Label>
                      <Select
                        id="mcp-transport"
                        value={form.httpTransport}
                        onChange={(e) => setForm((f) => ({ ...f, httpTransport: e.target.value as 'sse' | 'streamable-http' }))}
                      >
                        <option value="sse">SSE</option>
                        <option value="streamable-http">Streamable HTTP</option>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mcp-headers">Headers (Key: Value, one per line)</Label>
                      <Textarea
                        id="mcp-headers"
                        value={form.headers}
                        placeholder="Authorization: Bearer your-token"
                        className="font-mono text-[12px]"
                        rows={4}
                        onChange={(e) => setForm((f) => ({ ...f, headers: e.target.value }))}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Form footer */}
            <div className="flex items-center gap-2 border-t px-6 py-3">
              <Button
                onClick={() => void handleSave()}
                disabled={saving || !form.name.trim() || (form.transport === 'stdio' ? !form.command.trim() : !form.url.trim())}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save'
                )}
              </Button>
              <Button variant="ghost" onClick={closePanel} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete MCP Server"
        message={deleteTarget ? `Delete '${deleteTarget.name}'? Agents using this server will lose access to its tools.` : ''}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTarget ? handleDelete(deleteTarget) : Promise.resolve()}
        onCancel={() => setDeleteTarget(null)}
        onError={(err) => toast.error(String(err))}
      />
    </div>
  );
}
