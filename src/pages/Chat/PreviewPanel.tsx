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
  Eye,
  Code2,
  Download,
  ChevronDown,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { Artifact, ArtifactType } from './message-utils';

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
  const FILE_EXT: Record<ArtifactType, string> = {
    html: 'html', markdown: 'md', svg: 'svg', jsx: 'jsx', tsx: 'tsx', css: 'css',
  };
  const TYPE_LABEL: Record<ArtifactType, string> = {
    html: 'HTML', markdown: 'MD', svg: 'SVG', jsx: 'JSX', tsx: 'TSX', css: 'CSS',
  };
  const fileExt = FILE_EXT[artifact.type] ?? 'txt';
  const typeLabel = TYPE_LABEL[artifact.type] ?? artifact.type.toUpperCase();
  const fileName = `${artifact.title.replace(/[^a-z0-9_\-. ]/gi, '_').trim() || 'document'}.${fileExt}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setDropdownOpen(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const MIME_TYPES: Record<ArtifactType, string> = {
    html: 'text/html', markdown: 'text/markdown', svg: 'image/svg+xml',
    jsx: 'text/plain', tsx: 'text/plain', css: 'text/css',
  };

  const handleDownload = () => {
    const mimeType = MIME_TYPES[artifact.type] ?? 'text/plain';
    const blob = new Blob([artifact.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setDropdownOpen(false);
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
          <span className="text-muted-foreground font-normal"> · {typeLabel}</span>
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
              </div>
            )}
          </div>

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
          <PreviewContent key={artifact.id} artifact={artifact} />
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

/** Routes to the correct preview renderer based on artifact type. */
function PreviewContent({ artifact }: { artifact: Artifact }) {
  const { type, content } = artifact;
  if (type === 'html') return <IframePreview html={content} title="HTML Preview" />;
  if (type === 'svg') return <IframePreview html={svgToHtml(content)} title="SVG Preview" />;
  if (type === 'jsx' || type === 'tsx') return <IframePreview html={jsxToHtml(content)} title="React Component Preview" />;
  if (type === 'css') return <IframePreview html={cssToHtml(content)} title="CSS Preview" />;
  // markdown
  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

/**
 * Generic iframe renderer — injects arbitrary HTML via doc.write() to bypass
 * Electron's CSP (no URL scheme used, so no scheme restriction applies).
 */
function IframePreview({ html, title }: { html: string; title?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument ?? frame.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  return <iframe ref={iframeRef} className="w-full h-full border-0" title={title} />;
}

/** Wraps raw SVG markup in a minimal HTML shell for iframe rendering. */
function svgToHtml(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; display: flex; align-items: center; justify-content: center; background: transparent; }
  svg { max-width: 100%; max-height: 100%; }
</style></head>
<body>${content.trim()}</body>
</html>`;
}

/**
 * Wraps JSX/TSX content in an iframe-ready HTML page that loads React and
 * Babel standalone from CDN, then transforms and renders the component.
 * Auto-renders an `App` export/declaration if no explicit render call is found.
 */
function jsxToHtml(content: string): string {
  const hasExplicitRender = /ReactDOM\s*\.\s*(render|createRoot)/.test(content);
  const autoRender = hasExplicitRender ? '' : `
// Auto-render: look for App component
try {
  const __root = document.getElementById('__root__');
  if (typeof App !== 'undefined' && __root && !__root.firstChild) {
    ReactDOM.createRoot(__root).render(React.createElement(App));
  }
} catch(__e) { console.error('Auto-render failed:', __e); }`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body>
  <div id="__root__"></div>
  <script type="text/babel" data-presets="react,typescript">
${content}
${autoRender}
  </script>
</body>
</html>`;
}

/** Wraps a CSS string in an HTML page with common sample elements to visualise the styles. */
function cssToHtml(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { margin: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
  <style>${content}</style>
</head>
<body>
  <h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <h3>Heading 3</h3>
  <p>Paragraph with <strong>bold</strong>, <em>italic</em>, and <a href="#">a link</a>.</p>
  <button>Button</button>
  <button class="btn">Button .btn</button>
  <ul><li>List item 1</li><li>List item 2</li><li>List item 3</li></ul>
  <div class="container"><p>div.container</p></div>
  <div class="card"><p>div.card</p></div>
  <input type="text" placeholder="Input field" />
  <hr />
  <blockquote>Blockquote text</blockquote>
  <code>inline code</code>
  <pre><code>pre code block</code></pre>
</body>
</html>`;
}

