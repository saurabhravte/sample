"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void };
  ttl: number;
};

const ToastCtx = createContext<{
  toast: (message: string, kind?: ToastKind, action?: Toast["action"], ttl?: number) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast outside ToastProvider");
  return ctx.toast;
}

const ICONS: Record<ToastKind, string> = { success: "✓", error: "✕", info: "◌" };
const RING: Record<ToastKind, string> = {
  success: "border-fyi/50",
  error: "border-urgent/50",
  info: "border-ink-600",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info", action?: Toast["action"], ttl = 4500) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-4), { id, kind, message, action, ttl }]);
      window.setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto card flex items-center gap-3 border px-4 py-3 text-sm animate-rise ${RING[t.kind]}`}
            role="status"
          >
            <span className={t.kind === "success" ? "text-fyi" : t.kind === "error" ? "text-urgent" : "text-accent"}>
              {ICONS[t.kind]}
            </span>
            <span className="flex-1 text-ink-100">{t.message}</span>
            {t.action && (
              <button
                className="rounded-lg border border-accent/50 px-2 py-1 text-xs font-semibold text-accent hover:bg-accent/10"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button className="text-ink-400 hover:text-ink-200" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
