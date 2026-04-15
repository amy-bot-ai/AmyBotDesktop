/**
 * PreviewPanel — Claude Desktop-style artifact panel.
 * Shows HTML (sandboxed iframe) or Markdown (react-markdown) content
 * with navigation between multiple artifacts, copy, and open-in-new-tab.
 */
import { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Code2,
  Download,
  ChevronDown,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { Artifact } from './message-utils';

interface PreviewPanelProps {
  artifacts: Artifact[];
  activeIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

export function PreviewPanel({
  artifacts,
  activeIndex,
  onNavigate,
  onClose,
}: PreviewPanelProps) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const artifact = artifacts[activeIndex];

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  if (!artifact) return null;

  const total = artifacts.length;
  const isHtml = artifact.type === 'html';
  const fileExt = isHtml ? 'html' : 'md';
  const fileName = `${artifact.title.replace(/[^a-z0-9_\-. ]/gi, '_').trim() || 'document'}.${fileExt}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setDropdownOpen(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const mimeType = isHtml ? 'text/html' : 'text/markdown';
    const blob = new Blob([artifact.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setDropdownOpen(false);
  };

  const handleOpenInTab = () => {
    const blob = new Blob([artifact.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  return (
    <div className="flex flex-col w-full h-full bg-background">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-2 h-11 border-b border-black/10 dark:border-white/10 shrink-0">

        {/* Tab toggles — Eye / Code */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setTab('preview')}
            title="Preview"
            className={cn(
              'p-1.5 rounded-md transition-colors',
              tab === 'preview'
                ? 'bg-black/8 dark:bg-white/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5',
            )}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setTab('code')}
            title="Source"
            className={cn(
              'p-1.5 rounded-md transition-colors',
              tab === 'code'
                ? 'bg-black/8 dark:bg-white/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5',
            )}
          >
            <Code2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5 shrink-0" />

        {/* Artifact navigation */}
        {total > 1 && (
          <>
            <button
              onClick={() => onNavigate(activeIndex - 1)}
              disabled={activeIndex === 0}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-muted-foreground hover:text-foreground shrink-0"
              title="Previous"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-muted-foreground tabular-nums select-none shrink-0">
              {activeIndex + 1}/{total}
            </span>
            <button
              onClick={() => onNavigate(activeIndex + 1)}
              disabled={activeIndex === total - 1}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-muted-foreground hover:text-foreground shrink-0"
              title="Next"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5 shrink-0" />
          </>
        )}

        {/* Title · type */}
        <span className="flex-1 min-w-0 text-[13px] font-medium text-foreground/80 truncate">
          {artifact.title}
          <span className="text-muted-foreground font-normal"> · {isHtml ? 'HTML' : 'MD'}</span>
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Copy + dropdown */}
          <div ref={dropdownRef} className="relative">
            <div className="flex items-center rounded-md border border-black/10 dark:border-white/10 overflow-hidden">
              {/* Copy label button */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-[12px] font-medium text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Copy"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
              {/* Caret — opens dropdown */}
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="px-1 py-1 border-l border-black/10 dark:border-white/10 text-foreground/50 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="More options"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] w-max rounded-lg border border-black/10 dark:border-white/10 bg-background shadow-lg py-1 text-[13px]">
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download .{fileExt}
                </button>
                {isHtml && (
                  <button
                    onClick={() => { handleOpenInTab(); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in tab
                  </button>
                )}
              </div>
            )}
          </div>

          {isHtml && (
            <button
              onClick={handleOpenInTab}
              className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {tab === 'preview' ? (
          isHtml ? (
            <HtmlPreview
              key={artifact.id}
              content={artifact.content}
            />
          ) : (
            <div className="h-full overflow-y-auto px-6 py-5">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {artifact.content}
                </ReactMarkdown>
              </div>
            </div>
          )
        ) : (
          <div className="h-full overflow-y-auto p-4 bg-black/[0.02] dark:bg-white/[0.02]">
            <pre className="text-[12px] font-mono text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
              {artifact.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Renders HTML content by writing directly into an iframe's document.
 * This bypasses Electron's CSP entirely — no URL is loaded, so no URL
 * scheme (blob:, data:, srcdoc) gets blocked by the renderer security policy.
 */
function HtmlPreview({ content }: { content: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument ?? frame.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(content);
    doc.close();
  }, [content]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0"
      title="HTML Preview"
    />
  );
}

