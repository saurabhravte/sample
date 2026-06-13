"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { Icon } from "@/components/icons";
import { apiPost } from "@/lib/api";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * "Work with AI" workspace (item 9). Talks to POST /api/ai-chat which is backed
 * by a FREE model provider (Groq / OpenRouter free tier) — see server module in
 * SETUP. Keeps the full message history client-side and sends it each turn.
 */
export default function WorkspacePage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await apiPost<{ reply: string }>("/api/ai-chat", { messages: next });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry — the AI provider is unavailable right now." }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col">
      <header className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-ink">
          <Icon.Robot className="h-4 w-4" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold">Work with AI</h1>
          <p className="text-xs text-muted">Powered by a free model — brainstorm, draft, summarize.</p>
        </div>
      </header>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-line bg-surface p-4">
        {messages.length === 0 && (
          <p className="py-16 text-center text-sm text-muted">
            Ask anything. Try “Draft a polite follow-up to a client who went quiet.”
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-sm text-bg"
                : "mr-auto max-w-[80%] rounded-2xl rounded-bl-sm border border-line bg-bg px-3.5 py-2 text-sm text-ink"
            }
          >
            {m.content}
          </div>
        ))}
        {busy && <div className="mr-auto text-xs text-muted">thinking…</div>}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Message the AI…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} disabled={busy} className="btn-primary px-4">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
