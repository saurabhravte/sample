"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { type Label, LABEL_PALETTE } from "@/lib/labels";
import { cn } from "@/lib/utils";

function LabelChip({ label, onRemove }: { label: Label; onRemove?: () => void }) {
  return (
    <span
      className="chip border"
      style={{
        color: label.color,
        borderColor: label.color,
        background: `color-mix(in srgb, ${label.color} 12%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: label.color }} />
      {label.name}
      {onRemove && (
        <button onClick={onRemove} aria-label={`Remove ${label.name}`} className="ml-0.5 opacity-70 hover:opacity-100">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

/**
 * Pick from available labels (presets + the user's customs) and create new ones.
 * `available` is the full set; `selected`/`onChange` are the ids on the entity.
 * `onCreate` should persist a new custom label and return it with a real id.
 */
export function LabelPicker({
  available,
  selected,
  onChange,
  onCreate,
}: {
  available: Label[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onCreate?: (name: string, color: string) => Promise<Label> | Label;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_PALETTE[0]);

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed || !onCreate) return;
    const created = await onCreate(trimmed, color);
    onChange([...selected, created.id]);
    setName("");
  }

  const selectedLabels = available.filter((l) => selected.includes(l.id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {selectedLabels.map((l) => (
          <LabelChip key={l.id} label={l} onRemove={() => toggle(l.id)} />
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="chip border border-dashed border-line text-muted hover:text-ink"
        >
          <Plus className="h-3 w-3" /> Label
        </button>
      </div>

      {open && (
        <div className="card w-72 space-y-3 p-3">
          <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
            {available.map((l) => {
              const on = selected.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggle(l.id)}
                  className={cn("chip border transition", on ? "" : "opacity-70 hover:opacity-100")}
                  style={{
                    color: l.color,
                    borderColor: l.color,
                    background: on ? `color-mix(in srgb, ${l.color} 16%, transparent)` : "transparent",
                  }}
                >
                  {on && <Check className="h-3 w-3" />}
                  {l.name}
                  {!l.isPreset && <span className="text-[9px] opacity-60">custom</span>}
                </button>
              );
            })}
          </div>

          {onCreate && (
            <div className="border-t border-line pt-3">
              <p className="mb-1.5 text-[11px] font-medium text-muted">Create a custom label</p>
              <div className="flex items-center gap-2">
                <input
                  className="input flex-1 py-1.5 text-xs"
                  placeholder="Label name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && create()}
                />
                <button type="button" onClick={create} className="btn-primary px-3 py-1.5 text-xs">
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {LABEL_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Choose color ${c}`}
                    className={cn(
                      "h-5 w-5 rounded-full ring-offset-2 ring-offset-bg",
                      color === c && "ring-2 ring-ink",
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
