/**
 * PreviewPanel — Claude Desktop-style artifact panel.
 * Supports HTML, Markdown, SVG, JSX/TSX (Babel), and CSS previews.
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
  Loader2,
  AlertCircle,
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

// ── Per-type metadata ────────────────────────────────────────────

const FILE_EXT: Record<ArtifactType, string> = {
  html: 'html', markdown: 'md', svg: 'svg', jsx: 'jsx', tsx: 'tsx', css: 'css',
};
const TYPE_LABEL: Record<ArtifactType, string> = {
  html: 'HTML', markdown: 'MD', svg: 'SVG', jsx: 'JSX', tsx: 'TSX', css: 'CSS',
};
const MIME_TYPES: Record<ArtifactType, string> = {
  html: 'text/html',
  markdown: 'text/markdown',
  svg: 'image/svg+xml',
  // No official MIME for JSX/TSX — text/plain keeps OS associations neutral
  jsx: 'text/plain',
  tsx: 'text/plain',
  css: 'text/css',
};

// ── JSX/TSX script cache ─────────────────────────────────────────
// Scripts are fetched once by the renderer process (not by the iframe),
// then inlined as <script> text — this bypasses the iframe's CSP entirely.

const JSX_SCRIPT_URLS = {
  react:    'https://unpkg.com/react@18/umd/react.development.js',
  reactDom: 'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  babel:    'https://unpkg.com/@babel/standalone/babel.min.js',
};

type JsxScripts = { react: string; reactDom: string; babel: string };
let jsxScriptsPromise: Promise<JsxScripts> | null = null;

function loadJsxScripts(): Promise<JsxScripts> {
  if (!jsxScriptsPromise) {
    jsxScriptsPromise = Promise.all([
      fetch(JSX_SCRIPT_URLS.react).then(r => r.text()),
      fetch(JSX_SCRIPT_URLS.reactDom).then(r => r.text()),
      fetch(JSX_SCRIPT_URLS.babel).then(r => r.text()),
    ]).then(([react, reactDom, babel]) => ({ react, reactDom, babel }));
  }
  return jsxScriptsPromise;
}

// ── Main component ───────────────────────────────────────────────

export function PreviewPanel({
  artifacts,
  activeIndex,
  onNavigate,
  onClose,
}: PreviewPanelProps) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [lastArtifactId, setLastArtifactId] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const artifact = artifacts[activeIndex];

  // Reset tab when navigating to a different artifact.
  // setState-during-render (not in an effect) is the React-recommended pattern
  // for resetting state derived from props — causes one extra render cycle
  // but avoids cascading effects. See: react.dev/learn/you-might-not-need-an-effect
  if (artifact && artifact.id !== lastArtifactId) {
    setLastArtifactId(artifact.id);
    setTab('preview');
  }

  // Close dropdown on outside click
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

  const total      = artifacts.length;
  const fileExt    = FILE_EXT[artifact.type]  ?? 'txt';
  const typeLabel  = TYPE_LABEL[artifact.type] ?? artifact.type.toUpperCase();
  const fileName   = `${artifact.title.replace(/[^a-z0-9_\-. ]/gi, '_').trim() || 'document'}.${fileExt}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content)
      .then(() => {
        setCopied(true);
        setDropdownOpen(false);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => { /* clipboard access denied — don't flip UI */ });
  };

  const handleDownload = () => {
    const mimeType = MIME_TYPES[artifact.type] ?? 'text/plain';
    const blob = new Blob([artifact.content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
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
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-[12px] font-medium text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Copy"
              >
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="px-1 py-1 border-l border-black/10 dark:border-white/10 text-foreground/50 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="More options"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            {/* Dropdown */}
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

      {/* ── Content — keyed by artifact.id so preview state resets on navigation ── */}
      <ArtifactView key={artifact.id} artifact={artifact} tab={tab} />
    </div>
  );
}

// ── ArtifactView — renders content, keyed by artifact.id in parent ──────────

function ArtifactView({ artifact, tab }: { artifact: Artifact; tab: 'preview' | 'code' }) {
  return (
    <div className="flex-1 overflow-hidden">
      {tab === 'preview' ? (
        <PreviewContent artifact={artifact} />
      ) : (
        <div className="h-full overflow-y-auto p-4 bg-black/[0.02] dark:bg-white/[0.02]">
          <pre className="text-[12px] font-mono text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
            {artifact.content}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Preview routing ──────────────────────────────────────────────

function PreviewContent({ artifact }: { artifact: Artifact }) {
  const { type, content } = artifact;
  if (type === 'html')             return <IframePreview html={content} title="HTML Preview" />;
  if (type === 'svg')              return <IframePreview html={svgToHtml(content)} title="SVG Preview" />;
  if (type === 'jsx' || type === 'tsx') return <JsxPreview content={content} />;
  if (type === 'css')              return <IframePreview html={cssToHtml(content)} title="CSS Preview" />;
  // markdown
  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

// ── Generic iframe renderer ──────────────────────────────────────
// Uses doc.write() to bypass Electron CSP — no URL scheme involved.

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

// ── JSX/TSX preview ──────────────────────────────────────────────
// Fetches React + Babel scripts in the renderer process (not in the iframe)
// so the request goes through the renderer's network stack, not the iframe's CSP.
// Scripts are cached for the lifetime of the app session.

function JsxPreview({ content }: { content: string }) {
  const [html, setHtml]     = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadJsxScripts()
      .then((scripts) => {
        if (!cancelled) setHtml(buildJsxHtml(content, scripts));
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load React/Babel. Check your internet connection.');
      });
    return () => { cancelled = true; };
  }, [content]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }
  if (!html) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading React…</span>
      </div>
    );
  }
  return <IframePreview html={html} title="React Component Preview" />;
}

// ── HTML generators ──────────────────────────────────────────────

/** Wraps raw SVG in a minimal HTML page. Adds xmlns if absent (required for HTML parser). */
function svgToHtml(content: string): string {
  let svg = content.trim();
  if (svg.startsWith('<svg') && !svg.includes('xmlns=')) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; display: flex; align-items: center; justify-content: center; }
  svg { max-width: 100%; max-height: 100%; }
</style></head>
<body>${svg}</body>
</html>`;
}

/**
 * Builds the JSX/TSX preview HTML with React + Babel inlined as script text.
 * Scripts come from the renderer's cache (not external src= requests in iframe).
 * Auto-renders the detected component name, falling back to `App`.
 */
function buildJsxHtml(content: string, scripts: JsxScripts): string {
  // Detect whether the snippet already contains an explicit render call
  const hasExplicitRender = /ReactDOM\s*\.\s*(render|createRoot)|\bcreateRoot\s*\(/.test(content);

  // Use the same name-extraction logic as extractArtifactTitle for consistency
  const detectedName = (() => {
    const m = /(?:export\s+default\s+function\s+(\w+)|(?:export\s+)?(?:default\s+)?(?:function|const)\s+([A-Z]\w*)\s*(?:[:=(<]))/m.exec(content);
    return m?.[1] || m?.[2] || null;
  })();
  const componentVar = detectedName ?? 'App';

  const autoRender = hasExplicitRender ? '' : `
// Auto-render: try detected component name, then App
try {
  const __root = document.getElementById('__root__');
  if (__root && !__root.firstChild) {
    const __Comp = typeof ${componentVar} !== 'undefined' ? ${componentVar}
                 : typeof App !== 'undefined' ? App
                 : null;
    if (__Comp) ReactDOM.createRoot(__root).render(React.createElement(__Comp));
  }
} catch (__e) { console.error('Auto-render failed:', __e); }`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script>${scripts.react}</script>
  <script>${scripts.reactDom}</script>
  <script>${scripts.babel}</script>
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

/** Wraps CSS in an HTML page with common sample elements to visualise the styles.
 *  Escapes </style> inside the user's CSS to prevent premature tag closure. */
function cssToHtml(content: string): string {
  const safeCss = content.replace(/<\/style>/gi, '<\\/style>');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>* { box-sizing: border-box; } body { margin: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }</style>
  <style>${safeCss}</style>
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

