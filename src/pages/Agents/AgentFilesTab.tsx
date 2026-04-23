import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Eye, EyeOff, RotateCcw, Save, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { hostApiFetch } from '@/lib/host-api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorkspaceFileMeta {
  key: string;
  filename: string;
  exists: boolean;
}

interface WorkspaceFilesResponse {
  success: boolean;
  workspacePath: string;
  files: WorkspaceFileMeta[];
}

interface FileContentResponse {
  success: boolean;
  content: string;
}

const FILE_DISPLAY_NAMES: Record<string, string> = {
  AGENTS: 'AGENTS',
  SOUL: 'SOUL',
  TOOLS: 'TOOLS',
  IDENTITY: 'IDENTITY',
  USER: 'USER',
  HEARTBEAT: 'HEARTBEAT',
  BOOTSTRAP: 'BOOTSTRAP',
  MEMORY: 'MEMORY',
};

interface AgentFilesTabProps {
  agentId: string;
  workspace: string;
}

export function AgentFilesTab({ agentId, workspace }: AgentFilesTabProps) {
  const [workspacePath, setWorkspacePath] = useState(workspace);
  const [filesMeta, setFilesMeta] = useState<WorkspaceFileMeta[]>([]);
  const [activeKey, setActiveKey] = useState('AGENTS');
  const [contents, setContents] = useState<Record<string, string>>({});
  const [originals, setOriginals] = useState<Record<string, string>>({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const activeFile = filesMeta.find((f) => f.key === activeKey);
  const currentContent = contents[activeKey] ?? '';
  const originalContent = originals[activeKey] ?? '';
  const isDirty = currentContent !== originalContent;
  const contentLoaded = activeKey in contents;

  const fetchMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const data = await hostApiFetch<WorkspaceFilesResponse>(
        `/api/workspace-files?agentId=${encodeURIComponent(agentId)}`,
      );
      setWorkspacePath(data.workspacePath);
      setFilesMeta(data.files);
    } catch (error) {
      toast.error(`Failed to load workspace files: ${String(error)}`);
    } finally {
      setLoadingMeta(false);
    }
  }, [agentId]);

  useEffect(() => {
    void fetchMeta();
  }, [fetchMeta]);

  const fetchContent = useCallback(async (key: string, filename: string) => {
    if (key in contents) return;
    setLoadingContent(true);
    try {
      const data = await hostApiFetch<FileContentResponse>(
        `/api/workspace-files/${encodeURIComponent(filename)}?agentId=${encodeURIComponent(agentId)}`,
      );
      setContents((prev) => ({ ...prev, [key]: data.content }));
      setOriginals((prev) => ({ ...prev, [key]: data.content }));
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 404 || String(error).includes('404')) {
        setContents((prev) => ({ ...prev, [key]: '' }));
        setOriginals((prev) => ({ ...prev, [key]: '' }));
      } else {
        toast.error(`Failed to load file: ${String(error)}`);
      }
    } finally {
      setLoadingContent(false);
    }
  }, [agentId, contents]);

  const handleTabClick = (key: string) => {
    setActiveKey(key);
    setIsUnlocked(false);
    setIsPreview(false);
    const meta = filesMeta.find((f) => f.key === key);
    if (meta && !(key in contents)) {
      void fetchContent(key, meta.filename);
    }
  };

  useEffect(() => {
    if (filesMeta.length > 0 && !contentLoaded) {
      const meta = filesMeta.find((f) => f.key === activeKey);
      if (meta) void fetchContent(activeKey, meta.filename);
    }
  }, [filesMeta, activeKey, contentLoaded, fetchContent]);

  // Reset content cache when switching agents
  useEffect(() => {
    setContents({});
    setOriginals({});
    setActiveKey('AGENTS');
    setIsUnlocked(false);
    setIsPreview(false);
  }, [agentId]);

  const handleSave = async () => {
    if (!activeFile) return;
    setSaving(true);
    try {
      await hostApiFetch(
        `/api/workspace-files/${encodeURIComponent(activeFile.filename)}?agentId=${encodeURIComponent(agentId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ content: currentContent }),
        },
      );
      setOriginals((prev) => ({ ...prev, [activeKey]: currentContent }));
      // Update exists status if it was missing
      setFilesMeta((prev) =>
        prev.map((f) => (f.key === activeKey ? { ...f, exists: true } : f)),
      );
      toast.success('File saved');
    } catch (error) {
      toast.error(`Failed to save: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setContents((prev) => ({ ...prev, [activeKey]: originalContent }));
  };

  const handleRefresh = () => {
    setContents({});
    setOriginals({});
    setIsUnlocked(false);
    setIsPreview(false);
    void fetchMeta();
  };

  const filePath = activeFile
    ? `${workspacePath}/${activeFile.filename}`
    : '';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Core Files</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Bootstrap persona, identity, and tool guidance.</p>
          {workspacePath && (
            <p className="text-xs font-mono text-muted-foreground/70 mt-1">{workspacePath}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loadingMeta}
          className="h-8 text-[13px] rounded-full px-3 border-black/10 dark:border-white/10 bg-transparent shadow-none"
        >
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loadingMeta && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Panel */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden bg-black/[0.02] dark:bg-white/[0.02]">
        {/* Sub-tabs */}
        <div className="flex items-center gap-0 border-b border-black/10 dark:border-white/10 overflow-x-auto px-1 pt-1">
          {filesMeta.map((file) => (
            <button
              key={file.key}
              type="button"
              onClick={() => handleTabClick(file.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold tracking-wider whitespace-nowrap rounded-t transition-colors',
                activeKey === file.key
                  ? 'text-foreground border-b-2 border-primary bg-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5',
              )}
            >
              {FILE_DISPLAY_NAMES[file.key] ?? file.key}
              {!file.exists && (
                <span className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                  missing
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Editor area */}
        <div className="p-4">
          {/* File path + actions */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-xs font-mono text-muted-foreground/70 truncate">{filePath}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreview((v) => !v)}
                disabled={!contentLoaded || loadingContent}
                className="h-7 text-[12px] rounded-full px-3 border-black/10 dark:border-white/10 bg-transparent shadow-none gap-1"
              >
                {isPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {isPreview ? 'Edit' : 'Preview'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!isDirty || saving}
                className="h-7 text-[12px] rounded-full px-3 border-black/10 dark:border-white/10 bg-transparent shadow-none"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSave()}
                disabled={!isDirty || saving}
                className={cn(
                  'h-7 text-[12px] rounded-full px-3 shadow-none transition-colors',
                  isDirty && 'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
              >
                {saving ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>

          {/* Content area */}
          {activeFile && !activeFile.exists && !contentLoaded ? (
            <MissingFileState filename={activeFile.filename} onCreateClick={() => {
              setIsUnlocked(true);
              setContents((prev) => ({ ...prev, [activeKey]: '' }));
              setOriginals((prev) => ({ ...prev, [activeKey]: '' }));
            }} />
          ) : loadingContent ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </div>
          ) : isPreview ? (
            <div className="prose prose-sm dark:prose-invert max-w-none min-h-[300px] p-4 rounded-xl bg-background border border-black/10 dark:border-white/10">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentContent.replace(/\n/g, '  \n')}</ReactMarkdown>
            </div>
          ) : (
            <div className="relative">
              <textarea
                value={currentContent}
                onChange={(e) => {
                  if (!isUnlocked) return;
                  setContents((prev) => ({ ...prev, [activeKey]: e.target.value }));
                }}
                onClick={() => setIsUnlocked(true)}
                onBlur={() => setIsUnlocked(false)}
                readOnly={!isUnlocked}
                placeholder={isUnlocked ? 'Start typing...' : 'Click to edit'}
                className={cn(
                  'w-full min-h-[300px] resize-y font-mono text-[13px] leading-relaxed p-4 rounded-xl border border-black/10 dark:border-white/10 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all',
                  !isUnlocked && 'cursor-pointer select-none',
                )}
                style={!isUnlocked ? { filter: 'blur(3px)', userSelect: 'none' } : undefined}
                spellCheck={false}
              />
              {!isUnlocked && (
                <div
                  className="absolute inset-0 flex items-center justify-center cursor-pointer rounded-xl"
                  onClick={() => setIsUnlocked(true)}
                >
                  <span className="px-3 py-1.5 rounded-full bg-background/90 border border-black/10 dark:border-white/10 text-[12px] text-muted-foreground font-medium shadow-sm">
                    Click to unlock
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Missing file notice when content loaded but file was missing */}
          {activeFile && !activeFile.exists && contentLoaded && (
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              This file does not exist yet. Save to create it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MissingFileState({ filename, onCreateClick }: { filename: string; onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-48 rounded-xl border border-dashed border-black/15 dark:border-white/15">
      <AlertTriangle className="h-8 w-8 text-amber-500/70" />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/80">{filename} does not exist</p>
        <p className="text-xs text-muted-foreground mt-0.5">This file has not been created in the workspace yet.</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onCreateClick}
        className="h-7 text-[12px] rounded-full px-3 border-black/10 dark:border-white/10 bg-transparent shadow-none"
      >
        Create file
      </Button>
    </div>
  );
}
