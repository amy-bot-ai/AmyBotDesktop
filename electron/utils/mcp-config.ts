/**
 * MCP Server Config Utilities
 * File I/O helpers for MCP server configuration.
 * Used only by IPC handlers as local-stopped gateway fallback.
 * When gateway is running, mutations go via config.patch/config.set RPC instead.
 */
import { readOpenClawConfig, writeOpenClawConfig } from './channel-config';

// Mirror openclaw's actual schema — env/headers allow string|number|boolean.
// Do NOT narrow to string-only or configs with numeric/boolean values will fail to round-trip.
export type McpServerConfig = {
  command?: string;
  args?: string[];
  env?: Record<string, string | number | boolean>;
  cwd?: string;
  url?: string;
  transport?: 'sse' | 'streamable-http';
  headers?: Record<string, string | number | boolean>;
  connectionTimeoutMs?: number;
};

export async function listMcpServersFromFile(): Promise<Record<string, McpServerConfig>> {
  const config = await readOpenClawConfig();
  return (config.mcp?.servers as Record<string, McpServerConfig>) ?? {};
}

export async function setMcpServerToFile(name: string, server: McpServerConfig): Promise<void> {
  const config = await readOpenClawConfig();
  config.mcp = {
    ...config.mcp,
    servers: { ...(config.mcp?.servers as Record<string, unknown> ?? {}), [name]: server },
  };
  await writeOpenClawConfig(config);
}

export async function removeMcpServerFromFile(name: string): Promise<void> {
  const config = await readOpenClawConfig();
  if (config.mcp?.servers) {
    delete (config.mcp.servers as Record<string, unknown>)[name];
  }
  await writeOpenClawConfig(config);
}
