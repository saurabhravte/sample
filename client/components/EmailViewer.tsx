"use client";

import { useMemo, useState } from "react";
import DOMPurify from "dompurify";

/**
 * Defense in depth for untrusted email HTML:
 *  1. DOMPurify strips scripts/handlers/forms.
 *  2. Rendered in an <iframe sandbox> with no scripts and no same-origin access.
 *  3. Remote images (tracking pixels!) blocked by default, opt-in per email.
 */
export function EmailViewer({ html, text }: { html: string | null; text: string }) {
  const [loadImages, setLoadImages] = useState(false);

  const { doc, blockedImages } = useMemo(() => {
    if (!html) return { doc: null, blockedImages: 0 };
    let blocked = 0;
    const clean = DOMPurify.sanitize(html, {
      FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button", "base", "link", "meta"],
      FORBID_ATTR: ["onerror", "onload", "onclick", "srcset"],
    });
    const container = document.createElement("div");
    container.innerHTML = clean;
    container.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") ?? "";
      const remote = /^https?:/i.test(src) || src.startsWith("//");
      if (remote && !loadImages) {
        blocked++;
        img.setAttribute("data-blocked-src", src);
        img.removeAttribute("src");
        img.style.cssText = "background:#111a32;border:1px dashed #27375e;min-height:24px;min-width:24px;";
        img.alt = "🖼 image blocked";
      }
    });
    const body = `<!doctype html><html><head><style>
      body{font:14px/1.6 -apple-system,system-ui,sans-serif;color:#dde4f4;background:#0d1528;margin:0;padding:16px;word-break:break-word}
      a{color:#f0a93a} img{max-width:100%;height:auto} blockquote{border-left:3px solid #27375e;margin:8px 0;padding-left:12px;color:#8b9bc4}
      table{max-width:100% !important}
    </style></head><body>${container.innerHTML}</body></html>`;
    return { doc: body, blockedImages: blocked };
  }, [html, loadImages]);

  if (!doc) {
    return (
      <pre className="whitespace-pre-wrap rounded-xl bg-ink-850 p-4 text-sm leading-relaxed text-ink-200">{text}</pre>
    );
  }

  return (
    <div>
      {blockedImages > 0 && !loadImages && (
        <button
          onClick={() => setLoadImages(true)}
          className="mb-2 rounded-lg border border-ink-700 px-2.5 py-1 text-xs text-ink-300 hover:border-accent/50 hover:text-accent"
        >
          🖼 {blockedImages} remote image{blockedImages > 1 ? "s" : ""} blocked (tracking protection) — load
        </button>
      )}
      <iframe
        sandbox=""
        srcDoc={doc}
        className="h-[420px] w-full rounded-xl border border-ink-800 bg-ink-850"
        title="Email content (sandboxed)"
      />
    </div>
  );
}
