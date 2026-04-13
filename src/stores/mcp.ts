/**
 * MCP Store
 * Manages MCP server configuration state.
 * - Gateway running (local or remote): reads/writes via config.get / config.patch / config.set RPC
 * - Gateway stopped, LOCAL only: reads/writes via mcp:list / mcp:set / mcp:remove IPC
 * - Gateway stopped, REMOTE: all operations are blocked (config lives on remote machine)
 *
 * IMPORTANT: config.get returns a ConfigFileSnapshot, not the raw config.
 *   - Servers live at snapshot.config.mcp.servers (not snapshot.mcp.servers)
 *   - snapshot.hash MUST be passed as baseHash to all write RPCs (config.patch, config.set)
 */
import { create } from 'zustand';
import { invokeIpc } from '@/lib/api-client';
import { useGatewayStore } from './gateway';
import { useSettingsStore } from './settings';

export interface McpServer {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string | number | boolean>; // mirrors openclaw schema
  cwd?: string;
  url?: string;
  transport?: 'sse' | 'streamable-http';
  headers?: Record<string, string | number | boolean>; // mirrors openclaw schema
  connectionTimeoutMs?: number;
}

interface McpState {
  servers: McpServer[];
  loading: boolean;         // true during fetchServers
  saving: boolean;          // true during addServer/updateServer/removeServer
  error: string | null;     // fetch errors
  saveError: string | null; // write errors
  fetchServers: () => Promise<void>;
  addServer: (server: McpServer) => Promise<void>;
  updateServer: (name: string, updates: Partial<Omit<McpServer, 'name'>>) => Promise<void>;
  removeServer: (name: string) => Promise<void>;
}

// config.get returns a ConfigFileSnapshot — we only care about these fields.
// - config: runtime config (use for reading)
// - resolved: source config WITHOUT runtime defaults (use for config.set writes)
// - hash: pass as baseHash to ALL write RPCs (required by OpenClaw for concurrency safety)
interface ConfigSnapshot {
  hash?: string;
  config?: {
    mcp?: {
      servers?: Record<string, unknown>;
    };
  };
  resolved?: {
    mcp?: {
      servers?: Record<string, unknown>;
    };
  };
}

function toConfig(server: McpServer): Omit<McpServer, 'name'> {
  const { name: _name, ...rest } = server;
  return rest;
}

function mapToArray(raw: Record<string, unknown>): McpServer[] {
  return Object.entries(raw).map(([name, cfg]) => ({ name, ...(cfg as object) }));
}

export const useMcpStore = create<McpState>((set, get) => ({
  servers: [],
  loading: false,
  saving: false,
  error: null,
  saveError: null,

  fetchServers: async () => {
    set({ loading: true, error: null });
    try {
      const isRunning = useGatewayStore.getState().status.state === 'running';
      const isRemote = !!useSettingsStore.getState().gatewayRemoteUrl;
      let raw: Record<string, unknown>;
      if (isRunning) {
        // config.get returns a ConfigFileSnapshot — servers are under snapshot.config.mcp.servers
        const snapshot = await useGatewayStore.getState().rpc<ConfigSnapshot>('config.get', {});
        raw = snapshot.config?.mcp?.servers ?? {};
      } else if (isRemote) {
        // Remote gateway is offline — can't read its config. Show empty, not local files.
        set({ servers: [], loading: false });
        return;
      } else {
        raw = await invokeIpc<Record<string, unknown>>('mcp:list');
      }
      set({ servers: mapToArray(raw), loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  addServer: async (server) => {
    // Validate: reject if name already exists
    if (get().servers.some((s) => s.name === server.name)) {
      set({ saveError: `A server named "${server.name}" already exists.` });
      return;
    }
    set({ saving: true, saveError: null });
    try {
      const isRunning = useGatewayStore.getState().status.state === 'running';
      const isRemote = !!useSettingsStore.getState().gatewayRemoteUrl;
      if (isRunning) {
        // Must fetch current snapshot first to get baseHash — required by config.patch
        const snapshot = await useGatewayStore.getState().rpc<ConfigSnapshot>('config.get', {});
        await useGatewayStore.getState().rpc('config.patch', {
          raw: JSON.stringify({ mcp: { servers: { [server.name]: toConfig(server) } } }),
          baseHash: snapshot.hash,
          restartDelayMs: 2000,
        });
        // Optimistic update — config.patch has a 2s restart delay before
        // config.get would reflect the change. Apply locally immediately.
        set((state) => ({ servers: [...state.servers, server] }));
      } else if (isRemote) {
        set({ saving: false, saveError: 'Remote gateway is offline. Connect to the gateway to manage MCP servers.' });
        return;
      } else {
        await invokeIpc('mcp:set', server.name, toConfig(server));
        await useMcpStore.getState().fetchServers();
      }
      set({ saving: false });
    } catch (err) {
      set({ saving: false, saveError: String(err) });
    }
  },

  updateServer: async (name, updates) => {
    const existing = get().servers.find((s) => s.name === name);
    if (!existing) return;
    const merged = { ...existing, ...updates, name };
    set({ saving: true, saveError: null });
    try {
      const isRunning = useGatewayStore.getState().status.state === 'running';
      const isRemote = !!useSettingsStore.getState().gatewayRemoteUrl;
      if (isRunning) {
        // Must fetch current snapshot first to get baseHash — required by config.patch
        const snapshot = await useGatewayStore.getState().rpc<ConfigSnapshot>('config.get', {});
        await useGatewayStore.getState().rpc('config.patch', {
          raw: JSON.stringify({ mcp: { servers: { [name]: toConfig(merged) } } }),
          baseHash: snapshot.hash,
          restartDelayMs: 2000,
        });
        // Optimistic update
        set((state) => ({
          servers: state.servers.map((s) => (s.name === name ? merged : s)),
        }));
      } else if (isRemote) {
        set({ saving: false, saveError: 'Remote gateway is offline. Connect to the gateway to manage MCP servers.' });
        return;
      } else {
        await invokeIpc('mcp:set', name, toConfig(merged));
        await useMcpStore.getState().fetchServers();
      }
      set({ saving: false });
    } catch (err) {
      set({ saving: false, saveError: String(err) });
    }
  },

  removeServer: async (name) => {
    set({ saving: true, saveError: null });
    try {
      const isRunning = useGatewayStore.getState().status.state === 'running';
      const isRemote = !!useSettingsStore.getState().gatewayRemoteUrl;
      if (isRunning) {
        // Safe delete: get full config + hash → remove key → config.set with baseHash.
        // Do NOT use null-key config.patch — RFC 7396 null-removal is unverified in OpenClaw.
        // Use snapshot.resolved (not snapshot.config) to avoid leaking runtime defaults into the file.
        const snapshot = await useGatewayStore.getState().rpc<ConfigSnapshot>('config.get', {});
        const current = snapshot.resolved ?? {};
        if ((current as { mcp?: { servers?: Record<string, unknown> } }).mcp?.servers) {
          delete (current as { mcp: { servers: Record<string, unknown> } }).mcp.servers[name];
        }
        await useGatewayStore.getState().rpc('config.set', {
          raw: JSON.stringify(current),
          baseHash: snapshot.hash,
        });
        // Optimistic update — do NOT re-fetch (stale for 2s due to restart delay)
        set((state) => ({ servers: state.servers.filter((s) => s.name !== name) }));
      } else if (isRemote) {
        set({ saving: false, saveError: 'Remote gateway is offline. Connect to the gateway to manage MCP servers.' });
        return;
      } else {
        await invokeIpc('mcp:remove', name);
        await useMcpStore.getState().fetchServers();
      }
      set({ saving: false });
    } catch (err) {
      set({ saving: false, saveError: String(err) });
    }
  },
}));
