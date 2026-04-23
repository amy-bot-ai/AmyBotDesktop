import type { IncomingMessage, ServerResponse } from 'http';
import {
  ensureWidgetConfig,
  getWidgetConfig,
  regenerateWidgetToken,
  updateWidgetConfig,
  type WidgetAgentConfig,
} from '../../utils/widget-config';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';

export async function handleWidgetRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  // GET /api/widget?agentId=... — fetch (or null if not yet configured)
  if (url.pathname === '/api/widget' && req.method === 'GET') {
    const agentId = url.searchParams.get('agentId');
    if (!agentId) {
      sendJson(res, 400, { success: false, error: 'agentId is required' });
      return true;
    }
    const config = await getWidgetConfig(agentId);
    sendJson(res, 200, { success: true, config });
    return true;
  }

  // POST /api/widget?agentId=... — create config and generate token
  if (url.pathname === '/api/widget' && req.method === 'POST') {
    const agentId = url.searchParams.get('agentId');
    if (!agentId) {
      sendJson(res, 400, { success: false, error: 'agentId is required' });
      return true;
    }
    try {
      const config = await ensureWidgetConfig(agentId);
      sendJson(res, 200, { success: true, config });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // PATCH /api/widget?agentId=... — update settings
  if (url.pathname === '/api/widget' && req.method === 'PATCH') {
    const agentId = url.searchParams.get('agentId');
    if (!agentId) {
      sendJson(res, 400, { success: false, error: 'agentId is required' });
      return true;
    }
    try {
      const body = await parseJsonBody<Partial<Omit<WidgetAgentConfig, 'token'>>>(req);
      const config = await updateWidgetConfig(agentId, body);
      sendJson(res, 200, { success: true, config });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // POST /api/widget/token?agentId=... — regenerate token
  if (url.pathname === '/api/widget/token' && req.method === 'POST') {
    const agentId = url.searchParams.get('agentId');
    if (!agentId) {
      sendJson(res, 400, { success: false, error: 'agentId is required' });
      return true;
    }
    try {
      const config = await regenerateWidgetToken(agentId);
      sendJson(res, 200, { success: true, config });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
