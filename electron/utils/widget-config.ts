import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { getOpenClawConfigDir } from './paths';
import * as logger from './logger';
import { withConfigLock } from './config-mutex';

export interface WidgetAgentConfig {
  token: string;
  enabled: boolean;
  theme: 'dark' | 'light';
  position: 'bottom-right' | 'bottom-left';
  welcomeMessage: string;
  allowedDomains: string[];
  primaryColor?: string;
  font?: string;
  cornerRadius?: number;
  headerStyle?: 'flat' | 'colored';
  messageStyle?: 'default' | 'compact';
  botName?: string;
}

interface WidgetConfigFile {
  agents?: Record<string, WidgetAgentConfig>;
}

const WIDGET_CONFIG_DEFAULTS: Omit<WidgetAgentConfig, 'token'> = {
  enabled: false,
  theme: 'light',
  position: 'bottom-right',
  welcomeMessage: 'Hi! How can I help you today?',
  allowedDomains: [],
  primaryColor: '#6366f1',
  font: 'inter',
  cornerRadius: 12,
  headerStyle: 'colored',
  messageStyle: 'default',
  botName: '',
};

function getWidgetConfigPath(): string {
  return join(getOpenClawConfigDir(), 'web-widget.json');
}

async function readWidgetConfigFile(): Promise<WidgetConfigFile> {
  try {
    const raw = await readFile(getWidgetConfigPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as WidgetConfigFile;
    }
  } catch {
    // file missing or malformed — start fresh
  }
  return {};
}

async function writeWidgetConfigFile(data: WidgetConfigFile): Promise<void> {
  await writeFile(getWidgetConfigPath(), JSON.stringify(data, null, 2), 'utf-8');
}

function generateWidgetToken(agentId: string): string {
  const slug = agentId.slice(0, 8).replace(/[^a-z0-9]/g, '') || 'agent';
  const hex = randomBytes(8).toString('hex');
  return `wgt_${slug}_${hex}`;
}

export async function getWidgetConfig(agentId: string): Promise<WidgetAgentConfig | null> {
  const file = await readWidgetConfigFile();
  return file.agents?.[agentId] ?? null;
}

export async function ensureWidgetConfig(agentId: string): Promise<WidgetAgentConfig> {
  return withConfigLock(async () => {
    const file = await readWidgetConfigFile();
    if (file.agents?.[agentId]) {
      return file.agents[agentId];
    }
    const newConfig: WidgetAgentConfig = {
      ...WIDGET_CONFIG_DEFAULTS,
      token: generateWidgetToken(agentId),
    };
    file.agents = { ...(file.agents ?? {}), [agentId]: newConfig };
    await writeWidgetConfigFile(file);
    logger.info('Created widget config for agent', { agentId });
    return newConfig;
  });
}

export async function updateWidgetConfig(
  agentId: string,
  patch: Partial<Omit<WidgetAgentConfig, 'token'>>,
): Promise<WidgetAgentConfig> {
  return withConfigLock(async () => {
    const file = await readWidgetConfigFile();
    const existing = file.agents?.[agentId];
    if (!existing) {
      throw new Error(`No widget config for agent "${agentId}". Call ensureWidgetConfig first.`);
    }
    const updated: WidgetAgentConfig = { ...existing, ...patch };
    file.agents = { ...(file.agents ?? {}), [agentId]: updated };
    await writeWidgetConfigFile(file);
    logger.info('Updated widget config for agent', { agentId });
    return updated;
  });
}

export async function regenerateWidgetToken(agentId: string): Promise<WidgetAgentConfig> {
  return withConfigLock(async () => {
    const file = await readWidgetConfigFile();
    const existing = file.agents?.[agentId];
    if (!existing) {
      throw new Error(`No widget config for agent "${agentId}".`);
    }
    const updated: WidgetAgentConfig = { ...existing, token: generateWidgetToken(agentId) };
    file.agents = { ...(file.agents ?? {}), [agentId]: updated };
    await writeWidgetConfigFile(file);
    logger.info('Regenerated widget token for agent', { agentId });
    return updated;
  });
}
