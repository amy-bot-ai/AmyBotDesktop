import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Bot, Check, ChevronDown, ChevronUp, Code, Copy, Globe, GlobeLock, Plus, RefreshCw, Settings2, Trash2, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAgentsStore } from '@/stores/agents';
import { useGatewayStore } from '@/stores/gateway';
import { useProviderStore } from '@/stores/providers';
import { hostApiFetch } from '@/lib/host-api';
import { subscribeHostEvent } from '@/lib/host-events';
import { CHANNEL_ICONS, CHANNEL_NAMES, type ChannelType } from '@/types/channel';
import type { AgentSummary } from '@/types/agent';
import type { ProviderAccount, ProviderVendorInfo, ProviderWithKeyInfo } from '@/lib/providers';
import { useSkillsStore } from '@/stores/skills';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import telegramIcon from '@/assets/channels/telegram.svg';
import discordIcon from '@/assets/channels/discord.svg';
import whatsappIcon from '@/assets/channels/whatsapp.svg';
// import wechatIcon from '@/assets/channels/wechat.svg';
// import dingtalkIcon from '@/assets/channels/dingtalk.svg';
// import feishuIcon from '@/assets/channels/feishu.svg';
// import wecomIcon from '@/assets/channels/wecom.svg';
// import qqIcon from '@/assets/channels/qq.svg';

interface ChannelAccountItem {
  accountId: string;
  name: string;
  configured: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastError?: string;
  isDefault: boolean;
  agentId?: string;
}

interface ChannelGroupItem {
  channelType: string;
  defaultAccountId: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  accounts: ChannelAccountItem[];
}

interface RuntimeProviderOption {
  runtimeProviderKey: string;
  accountId: string;
  label: string;
  modelIdPlaceholder?: string;
  configuredModelId?: string;
}

function resolveRuntimeProviderKey(account: ProviderAccount): string {
  if (account.authMode === 'oauth_browser') {
    if (account.vendorId === 'google') return 'google-gemini-cli';
    if (account.vendorId === 'openai') return 'openai-codex';
  }

  if (account.vendorId === 'custom' || account.vendorId === 'ollama') {
    const suffix = account.id.replace(/-/g, '').slice(0, 8);
    return `${account.vendorId}-${suffix}`;
  }

  if (account.vendorId === 'minimax-portal-cn') {
    return 'minimax-portal';
  }

  return account.vendorId;
}

function splitModelRef(modelRef: string | null | undefined): { providerKey: string; modelId: string } | null {
  const value = (modelRef || '').trim();
  if (!value) return null;
  const separatorIndex = value.indexOf('/');
  if (separatorIndex <= 0 || separatorIndex >= value.length - 1) return null;
  return {
    providerKey: value.slice(0, separatorIndex),
    modelId: value.slice(separatorIndex + 1),
  };
}

function hasConfiguredProviderCredentials(
  account: ProviderAccount,
  statusById: Map<string, ProviderWithKeyInfo>,
): boolean {
  if (account.authMode === 'oauth_device' || account.authMode === 'oauth_browser' || account.authMode === 'local') {
    return true;
  }
  return statusById.get(account.id)?.hasKey ?? false;
}

export function Agents() {
  const { t } = useTranslation('agents');
  const gatewayStatus = useGatewayStore((state) => state.status);
  const refreshProviderSnapshot = useProviderStore((state) => state.refreshProviderSnapshot);
  const lastGatewayStateRef = useRef(gatewayStatus.state);
  const {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    deleteAgent,
  } = useAgentsStore();
  const [channelGroups, setChannelGroups] = useState<ChannelGroupItem[]>([]);
  const [hasCompletedInitialLoad, setHasCompletedInitialLoad] = useState(() => agents.length > 0);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<AgentSummary | null>(null);

  const fetchChannelAccounts = useCallback(async () => {
    try {
      const response = await hostApiFetch<{ success: boolean; channels?: ChannelGroupItem[] }>('/api/channels/accounts');
      setChannelGroups(response.channels || []);
    } catch {
      // Keep the last rendered snapshot when channel account refresh fails.
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void Promise.all([fetchAgents(), fetchChannelAccounts(), refreshProviderSnapshot()]).finally(() => {
      if (mounted) {
        setHasCompletedInitialLoad(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [fetchAgents, fetchChannelAccounts, refreshProviderSnapshot]);

  useEffect(() => {
    const unsubscribe = subscribeHostEvent('gateway:channel-status', () => {
      void fetchChannelAccounts();
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fetchChannelAccounts]);

  useEffect(() => {
    const previousGatewayState = lastGatewayStateRef.current;
    lastGatewayStateRef.current = gatewayStatus.state;

    if (previousGatewayState !== 'running' && gatewayStatus.state === 'running') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchChannelAccounts();
    }
  }, [fetchChannelAccounts, gatewayStatus.state]);

  const activeAgent = useMemo(
    () => agents.find((agent) => agent.id === activeAgentId) ?? null,
    [activeAgentId, agents],
  );

  const visibleAgents = agents;
  const visibleChannelGroups = channelGroups;
  const isUsingStableValue = loading && hasCompletedInitialLoad;
  const handleRefresh = () => {
    void Promise.all([fetchAgents(), fetchChannelAccounts()]);
  };

  if (loading && !hasCompletedInitialLoad) {
    return (
      <div className="flex flex-col -m-6 dark:bg-background min-h-[calc(100vh-2.5rem)] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div data-testid="agents-page" className="flex flex-col -m-6 dark:bg-background h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="w-full max-w-5xl mx-auto flex flex-col h-full p-10 pt-16">
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-12 shrink-0 gap-4">
          <div>
            <h1
              className="text-5xl md:text-6xl font-serif text-foreground mb-3 font-normal tracking-tight"
             
            >
              {t('title')}
            </h1>
            <p className="text-[17px] text-foreground/70 font-medium">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-3 md:mt-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="h-9 text-[13px] font-medium rounded-full px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none text-foreground/80 hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-2', isUsingStableValue && 'animate-spin')} />
              {t('refresh')}
            </Button>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="h-9 text-[13px] font-medium rounded-full px-4 shadow-none"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              {t('addAgent')}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-10 min-h-0 -mr-2">
          {gatewayStatus.state !== 'running' && (
            <div className="mb-8 p-4 rounded-xl border border-yellow-500/50 bg-yellow-500/10 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-yellow-700 dark:text-yellow-400 text-sm font-medium">
                {t('gatewayWarning')}
              </span>
            </div>
          )}

          {error && (
            <div className="mb-8 p-4 rounded-xl border border-destructive/50 bg-destructive/10 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive text-sm font-medium">
                {error}
              </span>
            </div>
          )}

          <div className="space-y-3">
            {visibleAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                channelGroups={visibleChannelGroups}
                onOpenSettings={() => setActiveAgentId(agent.id)}
                onDelete={() => setAgentToDelete(agent)}
              />
            ))}
          </div>
        </div>
      </div>

      {showAddDialog && (
        <AddAgentDialog
          onClose={() => setShowAddDialog(false)}
          onCreate={async (name, options) => {
            await createAgent(name, options);
            setShowAddDialog(false);
            toast.success(t('toast.agentCreated'));
          }}
        />
      )}

      {activeAgent && (
        <AgentSettingsModal
          agent={activeAgent}
          channelGroups={visibleChannelGroups}
          onClose={() => setActiveAgentId(null)}
        />
      )}

      <ConfirmDialog
        open={!!agentToDelete}
        title={t('deleteDialog.title')}
        message={agentToDelete ? t('deleteDialog.message', { name: agentToDelete.name }) : ''}
        confirmLabel={t('common:actions.delete')}
        cancelLabel={t('common:actions.cancel')}
        variant="destructive"
        onConfirm={async () => {
          if (!agentToDelete) return;
          try {
            await deleteAgent(agentToDelete.id);
            const deletedId = agentToDelete.id;
            setAgentToDelete(null);
            if (activeAgentId === deletedId) {
              setActiveAgentId(null);
            }
            toast.success(t('toast.agentDeleted'));
          } catch (error) {
            toast.error(t('toast.agentDeleteFailed', { error: String(error) }));
          }
        }}
        onCancel={() => setAgentToDelete(null)}
      />
    </div>
  );
}

function AgentCard({
  agent,
  channelGroups,
  onOpenSettings,
  onDelete,
}: {
  agent: AgentSummary;
  channelGroups: ChannelGroupItem[];
  onOpenSettings: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('agents');
  const boundChannelAccounts = channelGroups.flatMap((group) =>
    group.accounts
      .filter((account) => account.agentId === agent.id)
      .map((account) => {
        const channelName = CHANNEL_NAMES[group.channelType as ChannelType] || group.channelType;
        const accountLabel =
          account.accountId === 'default'
            ? t('settingsDialog.mainAccount')
            : account.name || account.accountId;
        return `${channelName} · ${accountLabel}`;
      }),
  );
  const channelsText = boundChannelAccounts.length > 0
    ? boundChannelAccounts.join(', ')
    : t('none');

  return (
    <div
      className={cn(
        'group flex items-start gap-4 p-4 rounded-2xl transition-all text-left border relative overflow-hidden bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5',
        agent.isDefault && 'bg-black/[0.04] dark:bg-white/[0.06]'
      )}
    >
      <div className="h-[46px] w-[46px] shrink-0 flex items-center justify-center text-primary bg-primary/10 rounded-full shadow-sm mb-3">
        <Bot className="h-[22px] w-[22px]" />
      </div>
      <div className="flex flex-col flex-1 min-w-0 py-0.5 mt-1">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-[16px] font-semibold text-foreground truncate">{agent.name}</h2>
            {agent.isDefault && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 font-mono text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] border-0 shadow-none text-foreground/70"
              >
                <Check className="h-3 w-3" />
                {t('defaultBadge')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!agent.isDefault && (
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                onClick={onDelete}
                title={t('deleteAgent')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all',
                !agent.isDefault && 'opacity-0 group-hover:opacity-100',
              )}
              onClick={onOpenSettings}
              title={t('settings')}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-[13.5px] text-muted-foreground line-clamp-2 leading-[1.5]">
          {t('modelLine', {
            model: agent.modelDisplay,
            suffix: agent.inheritedModel ? ` (${t('inherited')})` : '',
          })}
        </p>
        <p className="text-[13.5px] text-muted-foreground line-clamp-2 leading-[1.5]">
          {t('channelsLine', { channels: channelsText })}
        </p>
      </div>
    </div>
  );
}

const inputClasses = 'h-[44px] rounded-xl font-mono text-[13px] bg-[#eeece3] dark:bg-muted border-black/10 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 shadow-sm transition-all text-foreground placeholder:text-foreground/40';
const selectClasses = 'h-[44px] w-full rounded-xl font-mono text-[13px] bg-[#eeece3] dark:bg-muted border border-black/10 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 shadow-sm transition-all text-foreground px-3';
const labelClasses = 'text-[14px] text-foreground/80 font-bold';

function ChannelLogo({ type }: { type: ChannelType }) {
  switch (type) {
    case 'telegram':
      return <img src={telegramIcon} alt="Telegram" className="w-[20px] h-[20px] dark:invert" />;
    case 'discord':
      return <img src={discordIcon} alt="Discord" className="w-[20px] h-[20px] dark:invert" />;
    case 'whatsapp':
      return <img src={whatsappIcon} alt="WhatsApp" className="w-[20px] h-[20px] dark:invert" />;
    // case 'wechat':
    //   return <img src={wechatIcon} alt="WeChat" className="w-[20px] h-[20px] dark:invert" />;
    // case 'dingtalk':
    //   return <img src={dingtalkIcon} alt="DingTalk" className="w-[20px] h-[20px] dark:invert" />;
    // case 'feishu':
    //   return <img src={feishuIcon} alt="Feishu" className="w-[20px] h-[20px] dark:invert" />;
    // case 'wecom':
    //   return <img src={wecomIcon} alt="WeCom" className="w-[20px] h-[20px] dark:invert" />;
    // case 'qqbot':
    //   return <img src={qqIcon} alt="QQ" className="w-[20px] h-[20px] dark:invert" />;
    default:
      return <span className="text-[20px] leading-none">{CHANNEL_ICONS[type] || '💬'}</span>;
  }
}

function AddAgentDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, options: { inheritWorkspace: boolean }) => Promise<void>;
}) {
  const { t } = useTranslation('agents');
  const [name, setName] = useState('');
  const [inheritWorkspace, setInheritWorkspace] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate(name.trim(), { inheritWorkspace });
    } catch (error) {
      toast.error(t('toast.agentCreateFailed', { error: String(error) }));
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-3xl border-0 shadow-2xl bg-[#f3f1e9] dark:bg-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-serif font-normal tracking-tight">
            {t('createDialog.title')}
          </CardTitle>
          <CardDescription className="text-[15px] mt-1 text-foreground/70">
            {t('createDialog.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 p-6">
          <div className="space-y-2.5">
            <Label htmlFor="agent-name" className={labelClasses}>{t('createDialog.nameLabel')}</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('createDialog.namePlaceholder')}
              className={inputClasses}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="inherit-workspace" className={labelClasses}>{t('createDialog.inheritWorkspaceLabel')}</Label>
              <p className="text-[13px] text-foreground/60">{t('createDialog.inheritWorkspaceDescription')}</p>
            </div>
            <Switch
              id="inherit-workspace"
              checked={inheritWorkspace}
              onCheckedChange={setInheritWorkspace}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-9 text-[13px] font-medium rounded-full px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none text-foreground/80 hover:text-foreground"
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={saving || !name.trim()}
              className="h-9 text-[13px] font-medium rounded-full px-4 shadow-none"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('creating')}
                </>
              ) : (
                t('common:actions.save')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AgentSettingsModal({
  agent,
  channelGroups,
  onClose,
}: {
  agent: AgentSummary;
  channelGroups: ChannelGroupItem[];
  onClose: () => void;
}) {
  const { t } = useTranslation('agents');
  const { updateAgent, updateAgentSkills, updateAgentIdentity, setAgentDefault, updateAgentSubagents, moveAgent, agents, defaultModelRef } = useAgentsStore();
  const skills = useSkillsStore((state) => state.skills);
  const fetchSkills = useSkillsStore((state) => state.fetchSkills);
  const [name, setName] = useState(agent.name);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  // 'all' = inherit global (empty array in config), 'custom' = explicit allowlist
  const [skillsMode, setSkillsMode] = useState<'all' | 'custom'>(agent.skills.length > 0 ? 'custom' : 'all');
  const [pendingSkills, setPendingSkills] = useState<string[]>(agent.skills);
  const [savingSkills, setSavingSkills] = useState(false);
  // Identity
  const [_identityName, setIdentityName] = useState(agent.identity.name);
  const [identityEmoji, setIdentityEmoji] = useState(agent.identity.emoji);
  const [identityTheme, setIdentityTheme] = useState(agent.identity.theme);
  const [identityAvatar, setIdentityAvatar] = useState(agent.identity.avatar);
  const [savingIdentity, setSavingIdentity] = useState(false);
  // Subagents
  const [pendingSubagents, setPendingSubagents] = useState<string[]>(agent.subagents);
  const [savingSubagents, setSavingSubagents] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [movingAgent, setMovingAgent] = useState(false);
  const otherAgents = agents.filter((a) => a.id !== agent.id);
  const agentIndex = agents.findIndex((a) => a.id === agent.id);
  const canMoveUp = agentIndex > 0;
  const canMoveDown = agentIndex < agents.length - 1;

  useEffect(() => {
    void fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    setPendingSkills(agent.skills);
    setSkillsMode(agent.skills.length > 0 ? 'custom' : 'all');
  }, [agent.skills]);

  useEffect(() => {
    setName(agent.name);
  }, [agent.name]);

  useEffect(() => {
    setIdentityName(agent.identity.name);
    setIdentityEmoji(agent.identity.emoji);
    setIdentityTheme(agent.identity.theme);
    setIdentityAvatar(agent.identity.avatar);
  }, [agent.identity]);

  useEffect(() => {
    setPendingSubagents(agent.subagents);
  }, [agent.subagents]);

  // Name + all identity fields treated as one block
  const identityChanged =
    name.trim() !== agent.name ||
    identityEmoji.trim() !== agent.identity.emoji ||
    identityTheme.trim() !== agent.identity.theme ||
    identityAvatar.trim() !== agent.identity.avatar;

  const subagentsChanged =
    JSON.stringify([...pendingSubagents].sort()) !== JSON.stringify([...agent.subagents].sort());

  const handleSaveIdentity = async () => {
    if (!identityChanged) return;
    setSavingIdentity(true);
    try {
      const saves: Promise<unknown>[] = [];
      if (name.trim() && name.trim() !== agent.name) {
        saves.push(updateAgent(agent.id, name.trim()));
      }
      saves.push(updateAgentIdentity(agent.id, {
        name: name.trim(),
        emoji: identityEmoji.trim(),
        theme: identityTheme.trim(),
        avatar: identityAvatar.trim(),
      }));
      await Promise.all(saves);
      toast.success('Agent updated');
    } catch (error) {
      toast.error(`Failed to update: ${String(error)}`);
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleSetDefault = async () => {
    if (agent.isDefault || settingDefault) return;
    setSettingDefault(true);
    try {
      await setAgentDefault(agent.id);
      toast.success('Agent set as default');
    } catch (error) {
      toast.error(`Failed to set default: ${String(error)}`);
    } finally {
      setSettingDefault(false);
    }
  };

  const handleSaveSubagents = async () => {
    if (!subagentsChanged) return;
    setSavingSubagents(true);
    try {
      await updateAgentSubagents(agent.id, pendingSubagents);
      toast.success('Subagents updated');
    } catch (error) {
      toast.error(`Failed to update subagents: ${String(error)}`);
    } finally {
      setSavingSubagents(false);
    }
  };

  const toggleSubagent = (agentId: string) => {
    setPendingSubagents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId],
    );
  };

  const handleRequestClose = () => {
    if (savingIdentity || identityChanged) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  const handleMove = async (direction: 'up' | 'down') => {
    if (movingAgent) return;
    setMovingAgent(true);
    try {
      await moveAgent(agent.id, direction);
    } catch (error) {
      toast.error(`Failed to move agent: ${String(error)}`);
    } finally {
      setMovingAgent(false);
    }
  };

  const handleSaveSkills = async () => {
    setSavingSkills(true);
    try {
      await updateAgentSkills(agent.id, pendingSkills);
      toast.success('Skills updated');
    } catch (error) {
      toast.error(`Failed to update skills: ${String(error)}`);
    } finally {
      setSavingSkills(false);
    }
  };

  const toggleSkill = (skillKey: string) => {
    setPendingSkills((prev) =>
      prev.includes(skillKey) ? prev.filter((s) => s !== skillKey) : [...prev, skillKey],
    );
  };

  const skillsChanged = JSON.stringify([...pendingSkills].sort()) !== JSON.stringify([...agent.skills].sort());

  const assignedChannels = channelGroups.flatMap((group) =>
    group.accounts
      .filter((account) => account.agentId === agent.id)
      .map((account) => ({
        channelType: group.channelType as ChannelType,
        accountId: account.accountId,
        name:
          account.accountId === 'default'
            ? t('settingsDialog.mainAccount')
            : account.name || account.accountId,
        error: account.lastError,
      })),
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border-0 shadow-2xl bg-[#f3f1e9] dark:bg-card overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between pb-2 shrink-0">
          <div>
            <CardTitle className="text-2xl font-serif font-normal tracking-tight">
              {t('settingsDialog.title', { name: agent.name })}
            </CardTitle>
            <CardDescription className="text-[15px] mt-1 text-foreground/70">
              {t('settingsDialog.description')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 -mr-2 -mt-2">
            <Button variant="ghost" size="icon" onClick={() => void handleMove('up')}
              disabled={movingAgent || !canMoveUp}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5">
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => void handleMove('down')}
              disabled={movingAgent || !canMoveDown}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5">
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRequestClose}
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 overflow-y-auto flex-1 p-6">
          {/* ── Identity (merged with Name) ───────────────────── */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="agent-settings-name" className={labelClasses}>{t('settingsDialog.nameLabel')}</Label>
                <Input id="agent-settings-name" value={name}
                  onChange={(e) => { setName(e.target.value); setIdentityName(e.target.value); }}
                  className={inputClasses} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClasses}>Emoji</Label>
                <Input value={identityEmoji} onChange={(e) => setIdentityEmoji(e.target.value)}
                  placeholder="🤖"
                  className={cn(inputClasses, 'h-[44px] text-[18px] font-sans')} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClasses}>Theme</Label>
                <Input value={identityTheme} onChange={(e) => setIdentityTheme(e.target.value)}
                  placeholder="default" className={cn(inputClasses, 'h-[44px] text-[13px]')} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClasses}>Avatar</Label>
                <Input value={identityAvatar} onChange={(e) => setIdentityAvatar(e.target.value)}
                  placeholder="avatars/agent.png" className={cn(inputClasses, 'h-[44px] text-[13px]')} />
              </div>
            </div>
            {identityChanged && (
              <div className="flex justify-end">
                <Button size="sm" onClick={() => void handleSaveIdentity()} disabled={savingIdentity}
                  className="h-8 text-[12px] rounded-full px-4 shadow-none">
                  {savingIdentity ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : t('common:actions.save')}
                </Button>
              </div>
            )}
          </div>

          {/* ── Default Agent ─────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-2xl bg-black/5 dark:bg-white/5 px-4 py-3">
            <div>
              <p className="text-[14px] font-medium text-foreground">Default Agent</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {agent.isDefault ? 'This is the current default agent.' : 'Set this agent as the system default.'}
              </p>
            </div>
            {agent.isDefault ? (
              <span className="text-[12px] font-medium text-primary px-3 py-1 rounded-full bg-primary/10">Default</span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => void handleSetDefault()} disabled={settingDefault}
                className="h-8 text-[12px] rounded-full px-3 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 shadow-none shrink-0">
                {settingDefault ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Set as default'}
              </Button>
            )}
          </div>

          {/* Agent ID + Model info cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent p-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground/80 font-medium">
                {t('settingsDialog.agentIdLabel')}
              </p>
              <p className="font-mono text-[13px] text-foreground">{agent.id}</p>
            </div>
            <button type="button" onClick={() => setShowModelModal(true)}
              className="space-y-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent p-4 text-left hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground/80 font-medium">
                {t('settingsDialog.modelLabel')}
              </p>
              <p className="text-[13.5px] text-foreground">
                {agent.modelDisplay}{agent.inheritedModel ? ` (${t('inherited')})` : ''}
              </p>
              <p className="font-mono text-[12px] text-foreground/70 break-all">
                {agent.modelRef || defaultModelRef || '-'}
              </p>
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-serif text-foreground font-normal tracking-tight">
                  {t('settingsDialog.channelsTitle')}
                </h3>
                <p className="text-[14px] text-foreground/70 mt-1">{t('settingsDialog.channelsDescription')}</p>
              </div>
            </div>

            {assignedChannels.length === 0 && agent.channelTypes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 text-[13.5px] text-muted-foreground">
                {t('settingsDialog.noChannels')}
              </div>
            ) : (
              <div className="space-y-3">
                {assignedChannels.map((channel) => (
                  <div key={`${channel.channelType}-${channel.accountId}`} className="flex items-center justify-between rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-[40px] w-[40px] shrink-0 flex items-center justify-center text-foreground bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full shadow-sm">
                        <ChannelLogo type={channel.channelType} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-foreground">{channel.name}</p>
                        <p className="text-[13.5px] text-muted-foreground">
                          {CHANNEL_NAMES[channel.channelType]} · {channel.accountId === 'default' ? t('settingsDialog.mainAccount') : channel.accountId}
                        </p>
                        {channel.error && (
                          <p className="text-xs text-destructive mt-1">{channel.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0" />
                  </div>
                ))}
                {assignedChannels.length === 0 && agent.channelTypes.length > 0 && (
                  <div className="rounded-2xl border border-dashed border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 text-[13.5px] text-muted-foreground">
                    {t('settingsDialog.channelsManagedInChannels')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Skills ───────────────────────────────────────── */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xl font-serif text-foreground font-normal tracking-tight flex items-center gap-2">
                <Zap className="h-5 w-5 text-foreground/60" />
                Skills
              </h3>
              <p className="text-[14px] text-foreground/70 mt-1">
                Control which skills this agent can use.
              </p>
            </div>

            {/* Radio options */}
            <div className="space-y-2">
              {(['all', 'custom'] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name={`skills-mode-${agent.id}`}
                    value={mode}
                    checked={skillsMode === mode}
                    onChange={() => {
                      setSkillsMode(mode);
                      if (mode === 'all') setPendingSkills([]);
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-[14px] text-foreground/80">
                    {mode === 'all' ? 'All skills (inherit global)' : 'Custom allowlist'}
                  </span>
                </label>
              ))}
            </div>

            {/* Scrollable skill list — only when Custom is selected */}
            {skillsMode === 'custom' && (
              <div className="space-y-2">
                {skills.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 text-[13px] text-muted-foreground">
                    No skills installed yet.
                  </div>
                ) : (
                  <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                    <div className="overflow-y-auto max-h-48">
                      {skills.map((skill, idx) => {
                        const key = skill.slug || skill.id;
                        const checked = pendingSkills.includes(key);
                        return (
                          <label
                            key={key}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors bg-black/[0.02] dark:bg-white/[0.02]',
                              idx > 0 && 'border-t border-black/5 dark:border-white/5',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSkill(key)}
                              className="h-4 w-4 rounded accent-primary shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-foreground">{skill.name}</p>
                              {skill.description && (
                                <p className="text-[11.5px] text-muted-foreground truncate">{skill.description}</p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <div className="px-3 py-2 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                      <p className="text-[11px] text-muted-foreground">
                        {pendingSkills.length === 0
                          ? 'No skills selected — agent will have no skills loaded'
                          : `${pendingSkills.length} of ${skills.length} selected`}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => void handleSaveSkills()}
                    disabled={savingSkills || !skillsChanged}
                    className="h-8 text-[12px] rounded-full px-3 shadow-none"
                  >
                    {savingSkills ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Save skills'}
                  </Button>
                </div>
              </div>
            )}

            {/* All mode — save if changed */}
            {skillsMode === 'all' && skillsChanged && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => void handleSaveSkills()}
                  disabled={savingSkills}
                  className="h-8 text-[12px] rounded-full px-3 shadow-none"
                >
                  {savingSkills ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                </Button>
              </div>
            )}
          </div>

          {/* ── Subagents ─────────────────────────────────────── */}
          {otherAgents.length > 0 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-xl font-serif text-foreground font-normal tracking-tight">Delegation Targets</h3>
                <p className="text-[14px] text-foreground/70 mt-1">Select agents this one can hand work to. Checked = this agent is allowed to delegate tasks to that agent.</p>
              </div>
              <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
                <div className="max-h-40 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
                  {otherAgents.map((a) => {
                    const checked = pendingSubagents.includes(a.id);
                    return (
                      <label key={a.id} className={cn(
                        'flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none',
                        'hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
                        checked && 'bg-black/[0.03] dark:bg-white/[0.03]',
                      )}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSubagent(a.id)}
                          className="h-3.5 w-3.5 rounded accent-foreground shrink-0" />
                        <span className="text-[13px] flex-1 min-w-0">
                          <span className="font-medium truncate">{a.name}</span>
                          <span className="text-muted-foreground text-[12px] ml-1.5">— {a.id}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              {subagentsChanged && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => void handleSaveSubagents()} disabled={savingSubagents}
                    className="h-8 text-[12px] rounded-full px-4 shadow-none">
                    {savingSubagents ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Save delegation targets'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Web Widget ───────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-serif text-foreground font-normal tracking-tight flex items-center gap-2">
                  <Globe className="h-5 w-5 text-foreground/60" />
                  Web Widget
                </h3>
                <p className="text-[14px] text-foreground/70 mt-1">
                  Embed a chat bubble on any website. Configure settings and copy the embed snippet.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWidgetModal(true)}
                className="shrink-0 h-8 text-[12px] rounded-full px-3 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none mt-1"
              >
                Configure
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {showModelModal && (
        <AgentModelModal
          agent={agent}
          onClose={() => setShowModelModal(false)}
        />
      )}
      {showWidgetModal && (
        <WebWidgetModal
          agent={agent}
          onClose={() => setShowWidgetModal(false)}
        />
      )}
      <ConfirmDialog
        open={showCloseConfirm}
        title={t('settingsDialog.unsavedChangesTitle')}
        message={t('settingsDialog.unsavedChangesMessage')}
        confirmLabel={t('settingsDialog.closeWithoutSaving')}
        cancelLabel={t('common:actions.cancel')}
        onConfirm={() => {
          setShowCloseConfirm(false);
          setName(agent.name);
          onClose();
        }}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </div>
  );
}

function AgentModelModal({
  agent,
  onClose,
}: {
  agent: AgentSummary;
  onClose: () => void;
}) {
  const { t } = useTranslation('agents');
  const providerAccounts = useProviderStore((state) => state.accounts);
  const providerStatuses = useProviderStore((state) => state.statuses);
  const providerVendors = useProviderStore((state) => state.vendors);
  const providerDefaultAccountId = useProviderStore((state) => state.defaultAccountId);
  const { updateAgentModel, defaultModelRef } = useAgentsStore();
  const [selectedRuntimeProviderKey, setSelectedRuntimeProviderKey] = useState('');
  const [modelIdInput, setModelIdInput] = useState('');
  const [fallbackSelectedKeys, setFallbackSelectedKeys] = useState<string[]>(agent.fallbackModels ?? []);
  const [savingModel, setSavingModel] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const runtimeProviderOptions = useMemo<RuntimeProviderOption[]>(() => {
    const vendorMap = new Map<string, ProviderVendorInfo>(providerVendors.map((vendor) => [vendor.id, vendor]));
    const statusById = new Map<string, ProviderWithKeyInfo>(providerStatuses.map((status) => [status.id, status]));
    const entries = providerAccounts
      .filter((account) => account.enabled && hasConfiguredProviderCredentials(account, statusById))
      .sort((left, right) => {
        if (left.id === providerDefaultAccountId) return -1;
        if (right.id === providerDefaultAccountId) return 1;
        return right.updatedAt.localeCompare(left.updatedAt);
      });

    const deduped = new Map<string, RuntimeProviderOption>();
    for (const account of entries) {
      const runtimeProviderKey = resolveRuntimeProviderKey(account);
      if (!runtimeProviderKey || deduped.has(runtimeProviderKey)) continue;
      const vendor = vendorMap.get(account.vendorId);
      const label = `${account.label} (${vendor?.name || account.vendorId})`;
      const configuredModelId = account.model
        ? (account.model.startsWith(`${runtimeProviderKey}/`)
          ? account.model.slice(runtimeProviderKey.length + 1)
          : account.model)
        : undefined;
      deduped.set(runtimeProviderKey, {
        runtimeProviderKey, accountId: account.id, label,
        modelIdPlaceholder: vendor?.modelIdPlaceholder, configuredModelId,
      });
    }
    return [...deduped.values()];
  }, [providerAccounts, providerDefaultAccountId, providerStatuses, providerVendors]);

  useEffect(() => {
    const override = splitModelRef(agent.overrideModelRef);
    if (override) {
      setSelectedRuntimeProviderKey(override.providerKey);
      setModelIdInput(override.modelId);
      return;
    }

    const effective = splitModelRef(agent.modelRef || defaultModelRef);
    if (effective) {
      setSelectedRuntimeProviderKey(effective.providerKey);
      setModelIdInput(effective.modelId);
      return;
    }

    setSelectedRuntimeProviderKey(runtimeProviderOptions[0]?.runtimeProviderKey || '');
    setModelIdInput('');
  }, [agent.modelRef, agent.overrideModelRef, defaultModelRef, runtimeProviderOptions]);

  const selectedProvider = runtimeProviderOptions.find((option) => option.runtimeProviderKey === selectedRuntimeProviderKey) || null;
  const trimmedModelId = modelIdInput.trim();
  const nextModelRef = selectedRuntimeProviderKey && trimmedModelId
    ? `${selectedRuntimeProviderKey}/${trimmedModelId}`
    : '';
  const normalizedDefaultModelRef = (defaultModelRef || '').trim();
  const isUsingDefaultModelInForm = Boolean(normalizedDefaultModelRef) && nextModelRef === normalizedDefaultModelRef;
  const currentOverrideModelRef = (agent.overrideModelRef || '').trim();
  const desiredOverrideModelRef = nextModelRef && nextModelRef !== normalizedDefaultModelRef
    ? nextModelRef
    : null;
  const modelChanged = (desiredOverrideModelRef || '') !== currentOverrideModelRef;
  // Fallback refs derived from selected keys in provider list order
  const validFallbacks = runtimeProviderOptions
    .filter((opt) => fallbackSelectedKeys.includes(opt.runtimeProviderKey) && opt.configuredModelId)
    .map((opt) => `${opt.runtimeProviderKey}/${opt.configuredModelId}`);
  const fallbacksChanged = JSON.stringify(validFallbacks) !== JSON.stringify(agent.fallbackModels ?? []);
  const anythingChanged = modelChanged || fallbacksChanged;

  const toggleFallback = (providerKey: string) => {
    setFallbackSelectedKeys((prev) =>
      prev.includes(providerKey) ? prev.filter((k) => k !== providerKey) : [...prev, providerKey],
    );
  };

  const handleRequestClose = () => {
    if (savingModel || anythingChanged) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  const handleSaveModel = async () => {
    if (!selectedRuntimeProviderKey) {
      toast.error(t('toast.agentModelProviderRequired'));
      return;
    }
    if (!trimmedModelId) {
      toast.error(t('toast.agentModelIdRequired'));
      return;
    }
    if (!anythingChanged) return;
    if (!nextModelRef.includes('/')) {
      toast.error(t('toast.agentModelInvalid'));
      return;
    }

    setSavingModel(true);
    try {
      await updateAgentModel(agent.id, desiredOverrideModelRef, validFallbacks);
      toast.success(desiredOverrideModelRef ? t('toast.agentModelUpdated') : t('toast.agentModelReset'));
      onClose();
    } catch (error) {
      toast.error(t('toast.agentModelUpdateFailed', { error: String(error) }));
    } finally {
      setSavingModel(false);
    }
  };

  const handleUseDefaultModel = () => {
    const parsedDefault = splitModelRef(normalizedDefaultModelRef);
    if (!parsedDefault) {
      setSelectedRuntimeProviderKey('');
      setModelIdInput('');
      setFallbackSelectedKeys([]);
      return;
    }
    setSelectedRuntimeProviderKey(parsedDefault.providerKey);
    setModelIdInput(parsedDefault.modelId);
    setFallbackSelectedKeys([]);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl rounded-3xl border-0 shadow-2xl bg-[#f3f1e9] dark:bg-card overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="text-2xl font-serif font-normal tracking-tight">
              {t('settingsDialog.modelLabel')}
            </CardTitle>
            <CardDescription className="text-[15px] mt-1 text-foreground/70">
              {t('settingsDialog.modelOverrideDescription', { defaultModel: defaultModelRef || '-' })}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRequestClose}
            className="rounded-full h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="agent-model-provider" className="text-[12px] text-foreground/70">{t('settingsDialog.modelProviderLabel')}</Label>
            <select
              id="agent-model-provider"
              value={selectedRuntimeProviderKey}
              onChange={(event) => {
                const nextProvider = event.target.value;
                setSelectedRuntimeProviderKey(nextProvider);
                if (!modelIdInput.trim()) {
                  const option = runtimeProviderOptions.find((candidate) => candidate.runtimeProviderKey === nextProvider);
                  setModelIdInput(option?.configuredModelId || '');
                }
              }}
              className={selectClasses}
            >
              <option value="">{t('settingsDialog.modelProviderPlaceholder')}</option>
              {runtimeProviderOptions.map((option) => (
                <option key={option.runtimeProviderKey} value={option.runtimeProviderKey}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-model-id" className="text-[12px] text-foreground/70">{t('settingsDialog.modelIdLabel')}</Label>
            <Input
              id="agent-model-id"
              value={modelIdInput}
              onChange={(event) => setModelIdInput(event.target.value)}
              placeholder={selectedProvider?.modelIdPlaceholder || selectedProvider?.configuredModelId || t('settingsDialog.modelIdPlaceholder')}
              className={inputClasses}
            />
          </div>
          {!!nextModelRef && (
            <p className="text-[12px] font-mono text-foreground/70 break-all">
              {t('settingsDialog.modelPreview')}: {nextModelRef}
            </p>
          )}
          {runtimeProviderOptions.length === 0 && (
            <p className="text-[12px] text-amber-600 dark:text-amber-400">
              {t('settingsDialog.modelProviderEmpty')}
            </p>
          )}

          {/* ── Fallback Models ── only when a primary provider is selected */}
          {!!selectedRuntimeProviderKey && runtimeProviderOptions.filter((opt) => opt.configuredModelId && opt.runtimeProviderKey !== selectedRuntimeProviderKey).length > 0 && (
            <div className="space-y-2">
              <Label className="text-[12px] text-foreground/70">Fallback Models</Label>
              <p className="text-[11px] text-muted-foreground -mt-1">Used when the primary model is unavailable.</p>
              <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
                <div className="max-h-36 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
                  {runtimeProviderOptions
                    .filter((opt) => opt.configuredModelId && opt.runtimeProviderKey !== selectedRuntimeProviderKey)
                    .map((opt) => {
                      const checked = fallbackSelectedKeys.includes(opt.runtimeProviderKey);
                      return (
                        <label
                          key={opt.runtimeProviderKey}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none',
                            'hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
                            checked && 'bg-black/[0.03] dark:bg-white/[0.03]',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFallback(opt.runtimeProviderKey)}
                            className="h-3.5 w-3.5 rounded accent-foreground shrink-0"
                          />
                          <span className="text-[13px] flex-1 truncate">
                            <span className="font-medium">{opt.configuredModelId}</span>
                            <span className="text-muted-foreground text-[12px]"> — {opt.runtimeProviderKey}</span>
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleUseDefaultModel}
              disabled={savingModel || !normalizedDefaultModelRef || isUsingDefaultModelInForm}
              className="h-9 text-[13px] font-medium rounded-full px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none text-foreground/80 hover:text-foreground"
            >
              {t('settingsDialog.useDefaultModel')}
            </Button>
            <Button
              variant="outline"
              onClick={handleRequestClose}
              className="h-9 text-[13px] font-medium rounded-full px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none text-foreground/80 hover:text-foreground"
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSaveModel()}
              disabled={savingModel || !selectedRuntimeProviderKey || !trimmedModelId || !anythingChanged}
              className="h-9 text-[13px] font-medium rounded-full px-4 shadow-none"
            >
              {savingModel ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                t('common:actions.save')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog open={showCloseConfirm}
        title={t('settingsDialog.unsavedChangesTitle')}
        message={t('settingsDialog.unsavedChangesMessage')}
        confirmLabel={t('settingsDialog.closeWithoutSaving')}
        cancelLabel={t('common:actions.cancel')}
        onConfirm={() => { setShowCloseConfirm(false); onClose(); }}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </div>
  );
}

interface WidgetConfig {
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

/** Lightweight simulated preview of the chat widget — no iframe needed */
function WidgetPreview({
  config,
  agentName,
}: {
  config: WidgetConfig;
  agentName: string;
}) {
  const color = config.primaryColor ?? '#6366f1';
  const isDark = config.theme === 'dark';
  const isLeft = config.position === 'bottom-left';
  const radius = config.cornerRadius ?? 12;
  const botName = config.botName || agentName;
  const isColored = (config.headerStyle ?? 'colored') === 'colored';

  const bg = isDark ? '#1a1a2e' : '#f0f4f8';
  const chatBg = isDark ? '#16213e' : '#ffffff';
  const msgBg = isDark ? '#0f3460' : '#f3f4f6';
  const textColor = isDark ? '#e2e8f0' : '#1a202c';
  const subText = isDark ? '#94a3b8' : '#64748b';

  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden select-none"
      style={{ background: bg, minHeight: 340 }}
    >
      {/* fake page content lines */}
      <div className="absolute inset-0 p-5 space-y-2 opacity-30">
        {[80, 60, 90, 50, 70].map((w, i) => (
          <div key={i} className="h-2 rounded-full" style={{ width: `${w}%`, background: isDark ? '#334155' : '#cbd5e1' }} />
        ))}
      </div>

      {/* chat window */}
      <div
        className="absolute bottom-16 flex flex-col shadow-2xl overflow-hidden"
        style={{
          [isLeft ? 'left' : 'right']: 16,
          width: 240,
          borderRadius: radius + 4,
          background: chatBg,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        {/* header */}
        <div
          className="px-3 py-2.5 flex items-center gap-2"
          style={{
            background: isColored ? color : chatBg,
            borderBottom: isColored ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: isColored ? 'rgba(255,255,255,0.25)' : color }}
          >
            <Bot size={13} color="white" />
          </div>
          <span className="text-[11px] font-semibold truncate" style={{ color: isColored ? '#fff' : textColor }}>
            {botName}
          </span>
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
            <span className="text-[9px]" style={{ color: isColored ? 'rgba(255,255,255,0.7)' : subText }}>Online</span>
          </div>
        </div>

        {/* messages */}
        <div className="p-2.5 space-y-2 flex-1" style={{ background: chatBg }}>
          {/* bot welcome */}
          <div className="flex items-end gap-1.5">
            <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: color }}>
              <Bot size={10} color="white" />
            </div>
            <div className="rounded-[10px] rounded-bl-sm px-2.5 py-1.5 max-w-[160px]"
              style={{ background: msgBg, borderRadius: `${radius}px ${radius}px ${radius}px 4px` }}>
              <p className="text-[10px] leading-relaxed" style={{ color: textColor }}>
                {config.welcomeMessage || 'Hi! How can I help you?'}
              </p>
            </div>
          </div>
          {/* user message */}
          <div className="flex justify-end">
            <div className="px-2.5 py-1.5 max-w-[140px]"
              style={{ background: color, borderRadius: `${radius}px ${radius}px 4px ${radius}px` }}>
              <p className="text-[10px] text-white leading-relaxed">Hello!</p>
            </div>
          </div>
        </div>

        {/* input bar */}
        <div className="px-2.5 py-2 flex items-center gap-1.5"
          style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, background: chatBg }}>
          <div className="flex-1 h-6 rounded-full text-[9px] flex items-center px-2"
            style={{ background: msgBg, color: subText }}>
            Type a message…
          </div>
          <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ background: color }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
        </div>
      </div>

      {/* bubble button */}
      <div
        className="absolute bottom-4 flex items-center justify-center shadow-lg cursor-pointer"
        style={{
          [isLeft ? 'left' : 'right']: 16,
          height: 44,
          width: 44,
          borderRadius: '50%',
          background: color,
        }}
      >
        <Bot size={20} color="white" />
      </div>

      {/* label */}
      <div className="absolute top-2 left-0 right-0 flex justify-center">
        <span className="text-[9px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: subText }}>
          Preview
        </span>
      </div>
    </div>
  );
}

function WebWidgetModal({
  agent,
  onClose,
}: {
  agent: AgentSummary;
  onClose: () => void;
}) {
  // savedConfig = what's persisted on disk; draft = local edits not yet saved
  const [savedConfig, setSavedConfig] = useState<WidgetConfig | null>(null);
  const [draft, setDraft] = useState<WidgetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalUrl, setPortalUrl] = useState('https://your-portal-url.example.com');
  const [copied, setCopied] = useState(false);
  const [domainInput, setDomainInput] = useState('');

  // draft tracks all unsaved local edits; preview uses draft
  const config = draft;
  const hasChanges = draft !== null && savedConfig !== null &&
    JSON.stringify({ ...draft, token: '' }) !== JSON.stringify({ ...savedConfig, token: '' });

  useEffect(() => {
    setLoading(true);
    hostApiFetch<{ success: boolean; config: WidgetConfig | null }>(`/api/widget?agentId=${encodeURIComponent(agent.id)}`)
      .then(({ config: cfg }) => { setSavedConfig(cfg); setDraft(cfg); })
      .catch(() => { setSavedConfig(null); setDraft(null); })
      .finally(() => setLoading(false));
  }, [agent.id]);

  const patch = (fields: Partial<Omit<WidgetConfig, 'token'>>) => {
    setDraft((d) => d ? { ...d, ...fields } : d);
  };

  const handleActivate = async () => {
    // First time: create config on server
    if (!savedConfig) {
      setSaving(true);
      try {
        const result = await hostApiFetch<{ success: boolean; config: WidgetConfig }>(
          `/api/widget?agentId=${encodeURIComponent(agent.id)}`,
          { method: 'POST' },
        );
        setSavedConfig(result.config);
        setDraft(result.config);
        toast.success('Widget enabled');
      } catch (error) {
        toast.error(`Failed to enable: ${String(error)}`);
      } finally {
        setSaving(false);
      }
      return;
    }
    // Toggle enabled without waiting for Save
    const next = { ...draft!, enabled: !draft!.enabled };
    setDraft(next);
    setSaving(true);
    try {
      const result = await hostApiFetch<{ success: boolean; config: WidgetConfig }>(
        `/api/widget?agentId=${encodeURIComponent(agent.id)}`,
        { method: 'PATCH', body: JSON.stringify({ enabled: next.enabled }) },
      );
      setSavedConfig(result.config);
      setDraft((d) => d ? { ...d, enabled: result.config.enabled } : d);
    } catch (error) {
      toast.error(`Failed: ${String(error)}`);
      setDraft((d) => d ? { ...d, enabled: !next.enabled } : d);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { token: _token, ...fields } = draft;
      const result = await hostApiFetch<{ success: boolean; config: WidgetConfig }>(
        `/api/widget?agentId=${encodeURIComponent(agent.id)}`,
        { method: 'PATCH', body: JSON.stringify(fields) },
      );
      setSavedConfig(result.config);
      setDraft(result.config);
      toast.success('Widget settings saved');
      onClose();
    } catch (error) {
      toast.error(`Failed to save: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateToken = async () => {
    setSaving(true);
    try {
      const result = await hostApiFetch<{ success: boolean; config: WidgetConfig }>(
        `/api/widget/token?agentId=${encodeURIComponent(agent.id)}`,
        { method: 'POST' },
      );
      setSavedConfig(result.config);
      setDraft(result.config);
      toast.success('Token regenerated — update your embed snippet');
    } catch (error) {
      toast.error(`Failed to regenerate: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const embedSnippet = savedConfig
    ? `<script\n  src="${portalUrl}/widget.js"\n  data-token="${savedConfig.token}"\n  data-portal-url="${portalUrl}"\n  data-position="${savedConfig.position}"\n></script>`
    : '';

  const handleCopySnippet = () => {
    void navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addDomain = () => {
    const trimmed = domainInput.trim();
    if (!trimmed || !draft) return;
    const next = [...(draft.allowedDomains ?? [])];
    if (!next.includes(trimmed)) next.push(trimmed);
    setDomainInput('');
    patch({ allowedDomains: next });
  };

  const removeDomain = (domain: string) => {
    if (!draft) return;
    patch({ allowedDomains: draft.allowedDomains.filter((d) => d !== domain) });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border-0 shadow-2xl bg-[#f3f1e9] dark:bg-card overflow-hidden">

        {/* Header */}
        <CardHeader className="flex flex-row items-start justify-between pb-2 shrink-0">
          <div>
            <CardTitle className="text-2xl font-serif font-normal tracking-tight flex items-center gap-2">
              <Globe className="h-5 w-5 text-foreground/60" />
              Web Widget
            </CardTitle>
            <CardDescription className="text-[15px] mt-1 text-foreground/70">
              Embed a chat bubble for <span className="font-medium text-foreground">{agent.name}</span> on any website.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}
            className="rounded-full h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Body — two columns */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── LEFT: Settings ──────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-5 border-r border-black/10 dark:border-white/10">
            {loading ? (
              <div className="flex justify-center py-8"><LoadingSpinner size="sm" /></div>
            ) : (
              <>
                {/* Enable / disable */}
                <div className="flex items-center justify-between rounded-2xl bg-black/5 dark:bg-white/5 p-4">
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">
                      {config ? (config.enabled ? 'Widget enabled' : 'Widget disabled') : 'Not configured yet'}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {config ? 'Toggle to enable or disable the embed.' : 'Click Enable to create a token and configure.'}
                    </p>
                  </div>
                  <Button size="sm" variant={config?.enabled ? 'outline' : 'default'}
                    onClick={() => void handleActivate()} disabled={saving}
                    className="h-8 text-[12px] rounded-full px-3 shadow-none shrink-0">
                    {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : config ? (config.enabled ? 'Disable' : 'Enable') : 'Enable'}
                  </Button>
                </div>

                {config && (
                  <>
                    {/* Bot name + welcome */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className={labelClasses}>Bot Name</Label>
                        <Input value={config.botName ?? ''} onChange={(e) => patch({ botName: e.target.value })}
                          placeholder={agent.name} className={inputClasses} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className={labelClasses}>Welcome Message</Label>
                        <Input value={config.welcomeMessage} onChange={(e) => patch({ welcomeMessage: e.target.value })}
                          placeholder="Hi! How can I help you today?" className={inputClasses} />
                      </div>
                    </div>

                    {/* Appearance */}
                    <div className="space-y-3">
                      <p className={labelClasses}>Appearance</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[12px] text-foreground/60">Theme</Label>
                          <select value={config.theme}
                            onChange={(e) => patch({ theme: e.target.value as 'dark' | 'light' })}
                            className={selectClasses}>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[12px] text-foreground/60">Position</Label>
                          <select value={config.position}
                            onChange={(e) => patch({ position: e.target.value as 'bottom-right' | 'bottom-left' })}
                            className={selectClasses}>
                            <option value="bottom-right">Bottom Right</option>
                            <option value="bottom-left">Bottom Left</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[12px] text-foreground/60">Header Style</Label>
                          <select value={config.headerStyle ?? 'colored'}
                            onChange={(e) => patch({ headerStyle: e.target.value as 'flat' | 'colored' })}
                            className={selectClasses}>
                            <option value="colored">Colored</option>
                            <option value="flat">Flat</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[12px] text-foreground/60">Corner Radius</Label>
                          <div className="flex items-center gap-2">
                            <input type="range" min={0} max={24} value={config.cornerRadius ?? 12}
                              onChange={(e) => patch({ cornerRadius: Number(e.target.value) })}
                              className="flex-1 h-2 accent-primary" />
                            <span className="text-[11px] font-mono text-muted-foreground w-6 text-right">
                              {config.cornerRadius ?? 12}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-foreground/60">Primary Color</Label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={config.primaryColor ?? '#6366f1'}
                            onChange={(e) => patch({ primaryColor: e.target.value })}
                            className="h-[44px] w-[44px] rounded-xl border border-black/10 dark:border-white/10 bg-transparent cursor-pointer p-1" />
                          <Input value={config.primaryColor ?? '#6366f1'}
                            onChange={(e) => patch({ primaryColor: e.target.value })}
                            placeholder="#6366f1" className={cn(inputClasses, 'flex-1')} />
                        </div>
                      </div>
                    </div>

                    {/* Allowed domains */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <GlobeLock className="h-4 w-4 text-foreground/50" />
                        <Label className={labelClasses}>Allowed Domains</Label>
                      </div>
                      <p className="text-[12px] text-foreground/50">Leave empty to allow all. Add domains to restrict embedding.</p>
                      {(config.allowedDomains ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {config.allowedDomains.map((d) => (
                            <span key={d} className="flex items-center gap-1 text-[12px] font-mono bg-black/10 dark:bg-white/10 rounded-full px-2.5 py-1">
                              {d}
                              <button type="button" onClick={() => removeDomain(d)} className="text-muted-foreground hover:text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input value={domainInput} onChange={(e) => setDomainInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDomain(); } }}
                          placeholder="example.com" className={cn(inputClasses, 'flex-1')} />
                        <Button variant="outline" size="sm" onClick={addDomain} disabled={!domainInput.trim()}
                          className="h-[44px] text-[13px] rounded-xl px-4 border-black/10 dark:border-white/10 bg-[#eeece3] dark:bg-muted hover:bg-black/5 shadow-none shrink-0">
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Embed snippet */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4 text-foreground/50" />
                        <Label className={labelClasses}>Embed Snippet</Label>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] text-foreground/60">Portal URL</Label>
                        <Input value={portalUrl} onChange={(e) => setPortalUrl(e.target.value)}
                          placeholder="https://your-portal-url.example.com" className={inputClasses} />
                      </div>
                      <div className="relative rounded-xl bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 overflow-hidden">
                        <pre className="text-[11px] font-mono text-foreground/80 p-4 overflow-x-auto whitespace-pre">{embedSnippet}</pre>
                        <button type="button" onClick={handleCopySnippet}
                          className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-foreground/60 hover:text-foreground transition-colors"
                          title="Copy snippet">
                          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-foreground/50">Paste into the <code className="font-mono">&lt;body&gt;</code> of any page.</p>
                    </div>

                    {/* Token */}
                    <div className="pt-1 border-t border-black/10 dark:border-white/10">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[13px] font-semibold text-foreground">Token</p>
                          <p className="font-mono text-[11px] text-muted-foreground break-all mt-0.5">{savedConfig?.token}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => void handleRegenerateToken()} disabled={saving}
                          className="shrink-0 h-8 text-[12px] rounded-full px-3 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none text-destructive hover:text-destructive">
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* ── RIGHT: Live Preview ──────────────────────────── */}
          <div className="w-72 shrink-0 flex flex-col p-4 gap-3 bg-black/[0.02] dark:bg-white/[0.02]">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground/70 font-medium shrink-0">Live Preview</p>
            <div className="flex-1 min-h-0">
              {config ? (
                <WidgetPreview config={config} agentName={agent.name} />
              ) : (
                <div className="h-full flex items-center justify-center text-[12px] text-muted-foreground text-center px-4">
                  Enable the widget to see a preview
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer — Save button */}
        {config && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-black/10 dark:border-white/10">
            <p className="text-[12px] text-muted-foreground">
              {hasChanges ? 'You have unsaved changes.' : 'All changes saved.'}
            </p>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Button variant="outline" size="sm"
                  onClick={() => setDraft(savedConfig)}
                  className="h-8 text-[12px] rounded-full px-3 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none">
                  Discard
                </Button>
              )}
              <Button size="sm" onClick={() => void handleSave()} disabled={saving || !hasChanges}
                className="h-8 text-[12px] rounded-full px-4 shadow-none">
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Save changes
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default Agents;
