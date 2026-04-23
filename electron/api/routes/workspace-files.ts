import type { IncomingMessage, ServerResponse } from 'http';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import { readOpenClawConfig } from '../../utils/channel-config';
import { expandPath } from '../../utils/paths';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';

const MAIN_AGENT_ID = 'main';
const DEFAULT_WORKSPACE_PATH = '~/.openclaw/workspace';

const WORKSPACE_FILES = [
  { key: 'AGENTS',    filename: 'AGENTS.md' },
  { key: 'SOUL',      filename: 'SOUL.md' },
  { key: 'TOOLS',     filename: 'TOOLS.md' },
  { key: 'IDENTITY',  filename: 'IDENTITY.md' },
  { key: 'USER',      filename: 'USER.md' },
  { key: 'HEARTBEAT', filename: 'HEARTBEAT.md' },
  { key: 'BOOTSTRAP', filename: 'BOOTSTRAP.md' },
  { key: 'MEMORY',    filename: 'MEMORY.md' },
];

const ALLOWED_FILENAMES = new Set(WORKSPACE_FILES.map((f) => f.filename));

/** Resolve workspace path for a specific agent.
 *  Logic mirrors agent-config.ts buildSnapshotFromConfig:
 *  - main agent  → ~/.openclaw/workspace  (global default)
 *  - other agents → ~/.openclaw/workspace-{agentId}
 *  Config entry's explicit workspace field always wins if present.
 */
async function getAgentWorkspacePath(agentId?: string | null): Promise<string> {
  try {
    const config = await readOpenClawConfig() as Record<string, unknown>;
    const agentsSection = config.agents as {
      defaults?: { workspace?: string };
      list?: Array<{ id: string; workspace?: string }>;
    } | undefined;

    const defaultsWorkspace = agentsSection?.defaults?.workspace;
    const globalDefault = (typeof defaultsWorkspace === 'string' && defaultsWorkspace.trim())
      ? expandPath(defaultsWorkspace.trim())
      : expandPath(DEFAULT_WORKSPACE_PATH);

    if (agentId) {
      // Check explicit workspace in config entry first
      const entry = agentsSection?.list?.find((a) => a.id === agentId);
      if (entry?.workspace) return expandPath(entry.workspace);

      // main agent uses the global workspace; all others get their own
      if (agentId === MAIN_AGENT_ID) return globalDefault;
      return expandPath(`~/.openclaw/workspace-${agentId}`);
    }

    return globalDefault;
  } catch {
    // fall through
  }
  return expandPath(DEFAULT_WORKSPACE_PATH);
}

export async function handleWorkspaceFileRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/workspace-files' && req.method === 'GET') {
    const agentId = url.searchParams.get('agentId');
    try {
      const workspacePath = await getAgentWorkspacePath(agentId);
      const files = await Promise.all(
        WORKSPACE_FILES.map(async ({ key, filename }) => {
          let exists = false;
          try {
            await access(join(workspacePath, filename), constants.F_OK);
            exists = true;
          } catch {
            exists = false;
          }
          return { key, filename, exists };
        }),
      );
      sendJson(res, 200, { success: true, workspacePath, files });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname.startsWith('/api/workspace-files/') && req.method === 'GET') {
    const filename = decodeURIComponent(url.pathname.slice('/api/workspace-files/'.length));
    if (!ALLOWED_FILENAMES.has(filename)) {
      sendJson(res, 400, { success: false, error: 'File not allowed' });
      return true;
    }
    const agentId = url.searchParams.get('agentId');
    try {
      const workspacePath = await getAgentWorkspacePath(agentId);
      const content = await readFile(join(workspacePath, filename), 'utf8');
      sendJson(res, 200, { success: true, content });
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        sendJson(res, 404, { success: false, error: 'File not found' });
      } else {
        sendJson(res, 500, { success: false, error: String(error) });
      }
    }
    return true;
  }

  if (url.pathname.startsWith('/api/workspace-files/') && req.method === 'PUT') {
    const filename = decodeURIComponent(url.pathname.slice('/api/workspace-files/'.length));
    if (!ALLOWED_FILENAMES.has(filename)) {
      sendJson(res, 400, { success: false, error: 'File not allowed' });
      return true;
    }
    const agentId = url.searchParams.get('agentId');
    try {
      const body = await parseJsonBody<{ content: string }>(req);
      if (typeof body.content !== 'string') {
        sendJson(res, 400, { success: false, error: 'content must be a string' });
        return true;
      }
      const workspacePath = await getAgentWorkspacePath(agentId);
      await mkdir(workspacePath, { recursive: true });
      await writeFile(join(workspacePath, filename), body.content, 'utf8');
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
