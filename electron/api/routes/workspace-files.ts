import type { IncomingMessage, ServerResponse } from 'http';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import { readOpenClawConfig } from '../../utils/channel-config';
import { expandPath } from '../../utils/paths';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';

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

async function getWorkspacePath(): Promise<string> {
  try {
    const config = await readOpenClawConfig();
    const raw = (config as Record<string, unknown> & { agents?: { defaults?: { workspace?: string } } })
      .agents?.defaults?.workspace;
    if (typeof raw === 'string' && raw.trim()) {
      return expandPath(raw.trim());
    }
  } catch {
    // fall through to default
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
    try {
      const workspacePath = await getWorkspacePath();
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
    try {
      const workspacePath = await getWorkspacePath();
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
    try {
      const body = await parseJsonBody<{ content: string }>(req);
      if (typeof body.content !== 'string') {
        sendJson(res, 400, { success: false, error: 'content must be a string' });
        return true;
      }
      const workspacePath = await getWorkspacePath();
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
