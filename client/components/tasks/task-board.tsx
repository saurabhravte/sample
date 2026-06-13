"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Check, Pencil, GripVertical } from "lucide-react";
import type { TaskDto } from "@momentum/shared";
import { Celebrate, useCelebrate } from "@/components/tasks/celebrate";
import { cn } from "@/lib/utils";

type Status = TaskDto["status"];

/* Colored column headers in the spirit of the reference swimlane board. */
const COLUMNS: { key: Status; label: string; color: string }[] = [
  { key: "todo", label: "To do", color: "rgb(71 85 105)" },
  { key: "doing", label: "Doing", color: "rgb(217 119 6)" },
  { key: "done", label: "Done", color: "rgb(5 150 105)" },
];

const SOURCE_ICON: Record<TaskDto["source"], string> = {
  email: "✉",
  slack: "💬",
  github: "⎇",
  manual: "✎",
  agent: "◎",
};

function Card({
  task,
  onEdit,
  editing,
  onSave,
}: {
  task: TaskDto;
  onEdit: (id: string | null) => void;
  editing: boolean;
  onSave: (id: string, title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const [draft, setDraft] = useState(task.title);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group rounded-xl border border-line bg-bg p-3 shadow-soft",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-faint opacity-0 transition group-hover:opacity-100"
          aria-label="Drag task"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span title={task.source} className="text-sm">
          {SOURCE_ICON[task.source]}
        </span>

        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onSave(task.id, draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave(task.id, draft);
              if (e.key === "Escape") onEdit(null);
            }}
            className="input flex-1 py-1 text-sm"
          />
        ) : (
          <p className="flex-1 text-sm text-ink">{task.title}</p>
        )}

        {!editing && (
          <button
            onClick={() => {
              setDraft(task.title);
              onEdit(task.id);
            }}
            className="opacity-0 transition group-hover:opacity-100"
            aria-label="Edit task"
          >
            <Pencil className="h-3.5 w-3.5 text-faint hover:text-ink" />
          </button>
        )}
      </div>

      {task.due && (
        <p className="mt-2 pl-6 font-mono text-[10px] text-faint">due {new Date(task.due).toLocaleDateString()}</p>
      )}
    </li>
  );
}

function Column({
  col,
  tasks,
  onEdit,
  editingId,
  onSave,
}: {
  col: (typeof COLUMNS)[number];
  tasks: TaskDto[];
  onEdit: (id: string | null) => void;
  editingId: string | null;
  onSave: (id: string, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div className="flex flex-col">
      <div className="mb-3 rounded-lg px-3 py-2 text-center text-sm font-semibold text-white" style={{ background: col.color }}>
        {col.label} <span className="opacity-80">· {tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={cn(
            "min-h-[120px] space-y-2 rounded-xl border border-dashed p-2 transition-colors",
            isOver ? "border-ink/40 bg-surface-2" : "border-line",
          )}
        >
          {tasks.map((t) => (
            <Card key={t.id} task={t} onEdit={onEdit} editing={editingId === t.id} onSave={onSave} />
          ))}
          {tasks.length === 0 && <li className="py-6 text-center text-xs text-faint">drop here</li>}
        </ul>
      </SortableContext>
    </div>
  );
}

/**
 * Kanban board with drag-and-drop across columns (Fix #7), inline title edit
 * (Fix #7), redesigned colored columns per the reference image (Fix #8), and a
 * unicorn celebration when a task lands in Done (Fix #6).
 *
 * Props let the page own persistence:
 *  - onStatusChange(id, status)  → call your PATCH /api/tasks/:id
 *  - onTitleChange(id, title)    → call your PATCH /api/tasks/:id (needs title support)
 */
export function TaskBoard({
  tasks,
  onStatusChange,
  onTitleChange,
}: {
  tasks: TaskDto[];
  onStatusChange: (id: string, status: Status) => void;
  onTitleChange: (id: string, title: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCelebrate, fireCelebrate] = useCelebrate();

  const byCol = (s: Status) => tasks.filter((t) => t.status === s);
  const active = tasks.find((t) => t.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    // Dropping over a column id, or over a card whose column we infer.
    const overId = String(over.id);
    const overCol = COLUMNS.find((c) => c.key === overId)?.key ?? tasks.find((t) => t.id === overId)?.status;
    if (overCol && overCol !== task.status) {
      onStatusChange(task.id, overCol);
      if (overCol === "done") fireCelebrate();
    }
  }

  function save(id: string, title: string) {
    const trimmed = title.trim();
    const original = tasks.find((t) => t.id === id)?.title;
    if (trimmed && trimmed !== original) onTitleChange(id, trimmed);
    setEditingId(null);
  }

  return (
    <>
      <Celebrate show={showCelebrate} />
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <Column
              key={col.key}
              col={col}
              tasks={byCol(col.key)}
              onEdit={setEditingId}
              editingId={editingId}
              onSave={save}
            />
          ))}
        </div>
        <DragOverlay>
          {active && (
            <div className="rounded-xl border border-line bg-bg p-3 shadow-soft-lg">
              <p className="text-sm text-ink">{active.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
