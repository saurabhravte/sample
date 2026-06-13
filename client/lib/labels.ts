/**
 * Labels: 12 presets shipped out of the box, plus user-created custom labels.
 * Colors reference the semantic + accent CSS vars so they theme correctly.
 */
export type Label = {
  id: string;
  name: string;
  /** A CSS color string, usually `rgb(var(--xxx))`. */
  color: string;
  isPreset: boolean;
};

export const PRESET_LABELS: Label[] = [
  { id: "client", name: "Client", color: "rgb(var(--accent))", isPreset: true },
  { id: "invoice", name: "Invoice", color: "rgb(var(--reply))", isPreset: true },
  { id: "interview", name: "Interview", color: "rgb(var(--waiting))", isPreset: true },
  { id: "project", name: "Project", color: "rgb(var(--fyi))", isPreset: true },
  { id: "urgent", name: "Urgent", color: "rgb(var(--urgent))", isPreset: true },
  { id: "personal", name: "Personal", color: "rgb(236 72 153)", isPreset: true },
  { id: "follow-up", name: "Follow-up", color: "rgb(14 165 233)", isPreset: true },
  { id: "waiting", name: "Waiting", color: "rgb(var(--news))", isPreset: true },
  { id: "idea", name: "Idea", color: "rgb(8 145 178)", isPreset: true },
  { id: "bug", name: "Bug", color: "rgb(239 68 68)", isPreset: true },
  { id: "meeting", name: "Meeting", color: "rgb(20 184 166)", isPreset: true },
  { id: "newsletter", name: "Newsletter", color: "rgb(100 116 139)", isPreset: true },
];

/** Palette offered when a user creates a custom label. */
export const LABEL_PALETTE = [
  "rgb(var(--accent))",
  "rgb(var(--urgent))",
  "rgb(var(--reply))",
  "rgb(var(--waiting))",
  "rgb(var(--fyi))",
  "rgb(236 72 153)",
  "rgb(14 165 233)",
  "rgb(8 145 178)",
  "rgb(20 184 166)",
  "rgb(100 116 139)",
];
