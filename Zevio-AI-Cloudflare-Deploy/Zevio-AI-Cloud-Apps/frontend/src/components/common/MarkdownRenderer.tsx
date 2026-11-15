import React, { useMemo } from "react";
import { Marked } from "marked";
import katex from "katex";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onPasteToEditor?: (code: string) => void;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeBase64Encode(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (_) {
    return "";
  }
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
  onPasteToEditor
}) => {
  const markedParser = useMemo(() => {
    const instance = new Marked();
    instance.use({
      gfm: true,
      breaks: true,
      renderer: {
        code(token: any) {
          const text = typeof token === "object" ? token.text : token;
          const lang = (typeof token === "object" ? token.lang : arguments[1]) || "code";
          const encoded = safeBase64Encode(text);

          return `<div class="code-card my-3 rounded-xl border border-slate-750 bg-slate-950 overflow-hidden font-mono text-xs shadow-md">
  <div class="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-sans select-none">
    <span class="font-mono text-indigo-400 font-bold uppercase tracking-wider text-[10px]">${escapeHtml(lang)}</span>
    <div class="flex items-center gap-1.5">
      ${
        onPasteToEditor
          ? `<button type="button" class="zevio-paste-btn flex items-center gap-1 text-[11px] font-semibold text-indigo-300 hover:text-white px-2 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/50 transition cursor-pointer" data-code="${encoded}">
              <svg class="w-3 h-3 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m7 7l-7-7 7-7"/></svg>
              <span class="pointer-events-none">ដាក់ចូល Edit Tab</span>
            </button>`
          : ""
      }
      <button type="button" class="zevio-copy-btn flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer" data-code="${encoded}">
        <svg class="w-3 h-3 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
        <span class="pointer-events-none">ចម្លង (Copy)</span>
      </button>
    </div>
  </div>
  <pre class="p-3 overflow-x-auto text-slate-200 leading-relaxed font-mono text-xs"><code>${escapeHtml(text)}</code></pre>
</div>`;
        }
      }
    });
    return instance;
  }, [onPasteToEditor]);

  // Render LaTeX math before marked processes it
  const htmlContent = useMemo(() => {
    if (!content) return "";

    let processed = content;

    // 1. Render display math: \[...\] or $$...$$
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, equation) => {
      try {
        return `<div class="katex-display-wrapper my-3 overflow-x-auto py-1">${katex.renderToString(equation.trim(), {
          displayMode: true,
          throwOnError: false
        })}</div>`;
      } catch (_) {
        return `\\[${equation}\\]`;
      }
    });

    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, equation) => {
      try {
        return `<div class="katex-display-wrapper my-3 overflow-x-auto py-1">${katex.renderToString(equation.trim(), {
          displayMode: true,
          throwOnError: false
        })}</div>`;
      } catch (_) {
        return `$$${equation}$$`;
      }
    });

    // 2. Render inline math: \(...\)
    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, equation) => {
      try {
        return katex.renderToString(equation.trim(), {
          displayMode: false,
          throwOnError: false
        });
      } catch (_) {
        return `\\(${equation}\\)`;
      }
    });

    // 3. Render inline math: $...$ (ensure single $ not part of $$)
    processed = processed.replace(/(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)/g, (_, equation) => {
      try {
        return katex.renderToString(equation.trim(), {
          displayMode: false,
          throwOnError: false
        });
      } catch (_) {
        return `$${equation}$`;
      }
    });

    // 4. Parse Markdown to HTML
    try {
      return markedParser.parse(processed) as string;
    } catch (_) {
      return processed;
    }
  }, [content, markedParser]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const copyBtn = target.closest(".zevio-copy-btn") as HTMLElement | null;
    const pasteBtn = target.closest(".zevio-paste-btn") as HTMLElement | null;

    if (copyBtn) {
      const codeEncoded = copyBtn.getAttribute("data-code");
      if (codeEncoded) {
        try {
          const rawCode = decodeURIComponent(escape(atob(codeEncoded)));
          navigator.clipboard.writeText(rawCode);
          const span = copyBtn.querySelector("span");
          if (span) {
            const originalText = span.textContent;
            span.textContent = "បានចម្លង!";
            copyBtn.classList.add("text-emerald-400");
            setTimeout(() => {
              span.textContent = originalText;
              copyBtn.classList.remove("text-emerald-400");
            }, 2000);
          }
        } catch (_) {}
      }
      return;
    }

    if (pasteBtn && onPasteToEditor) {
      const codeEncoded = pasteBtn.getAttribute("data-code");
      if (codeEncoded) {
        try {
          const rawCode = decodeURIComponent(escape(atob(codeEncoded)));
          onPasteToEditor(rawCode);
          const span = pasteBtn.querySelector("span");
          if (span) {
            const originalText = span.textContent;
            span.textContent = "បានដាក់ចូល Edit Tab!";
            pasteBtn.classList.add("text-emerald-400");
            setTimeout(() => {
              span.textContent = originalText;
              pasteBtn.classList.remove("text-emerald-400");
            }, 2000);
          }
        } catch (_) {}
      }
      return;
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`prose-dark max-w-none text-sm break-words leading-relaxed font-sans ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
