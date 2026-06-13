'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Mail, Calendar, Slack, Github, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToolKey = 'gmail' | 'gcal' | 'slack' | 'github';

const TOOL_META: Record<
  ToolKey,
  { name: string; icon: typeof Mail; color: string; soft: string }
> = {
  gmail: { name: 'Gmail', icon: Mail, color: '#EA4335', soft: 'rgba(234,67,53,0.12)' },
  gcal: { name: 'Calendar', icon: Calendar, color: '#1A73E8', soft: 'rgba(26,115,232,0.12)' },
  slack: { name: 'Slack', icon: Slack, color: '#611F69', soft: 'rgba(97,31,105,0.12)' },
  github: { name: 'GitHub', icon: Github, color: '#24292F', soft: 'rgba(36,41,47,0.12)' },
};

/* ---- custom node: the central "you" hub ---- */
function CenterNode() {
  return (
    <div className="relative grid h-28 w-28 place-items-center rounded-3xl border border-line bg-surface shadow-soft-lg">
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-bg">
        <Sparkles className="h-6 w-6" />
      </div>
      <span className="mt-2 text-xs font-semibold">Momentum</span>
      <span className="text-[10px] text-faint">your center</span>
    </div>
  );
}

/* ---- custom node: a connectable tool ---- */
function ToolNode({ data }: NodeProps) {
  const meta = TOOL_META[data.tool as ToolKey];
  const Icon = meta.icon;
  const connected = Boolean(data.connected);

  return (
    <button
      type="button"
      onClick={data.onToggle as () => void}
      className={cn(
        'group flex w-44 items-center gap-3 rounded-2xl border p-3 text-left transition-all',
        connected
          ? 'border-transparent bg-surface shadow-soft'
          : 'border-line bg-surface/60 hover:bg-surface',
      )}
      style={connected ? { boxShadow: `0 0 0 1.5px ${meta.color}55, 0 8px 28px -16px ${meta.color}` } : undefined}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors"
        style={{
          background: connected ? meta.soft : 'rgb(var(--surface-2))',
          color: connected ? meta.color : 'rgb(var(--faint))',
        }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{meta.name}</span>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[11px]',
            connected ? 'text-emerald-500' : 'text-faint',
          )}
        >
          {connected ? <><Check className="h-3 w-3" /> Connected</> : 'Tap to connect'}
        </span>
      </span>
    </button>
  );
}

const nodeTypes = { center: CenterNode, tool: ToolNode };

export function FlowShowcase() {
  const [connected, setConnected] = useState<Record<ToolKey, boolean>>({
    gmail: true,
    gcal: true,
    slack: false,
    github: true,
  });

  const toggle = useCallback((key: ToolKey) => {
    setConnected((c) => ({ ...c, [key]: !c[key] }));
  }, []);

  const nodes: Node[] = useMemo(() => {
    const order: ToolKey[] = ['gmail', 'gcal', 'slack', 'github'];
    const toolNodes: Node[] = order.map((tool, i) => ({
      id: tool,
      type: 'tool',
      position: { x: 40, y: 20 + i * 92 },
      data: { tool, connected: connected[tool], onToggle: () => toggle(tool) },
      draggable: false,
    }));
    return [
      {
        id: 'center',
        type: 'center',
        position: { x: 420, y: 158 },
        data: {},
        draggable: false,
      },
      ...toolNodes,
    ];
  }, [connected, toggle]);

  const edges: Edge[] = useMemo(
    () =>
      (Object.keys(connected) as ToolKey[])
        .filter((k) => connected[k])
        .map((k) => ({
          id: `${k}-center`,
          source: k,
          target: 'center',
          animated: true,
          style: { stroke: TOOL_META[k].color, strokeWidth: 2, opacity: 0.7 },
        })),
    [connected],
  );

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-3xl border border-line bg-bg dot-grid">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={0} />
      </ReactFlow>
      <p className="pointer-events-none absolute bottom-3 left-4 text-xs text-faint">
        Tap a tool to see it connect — live preview
      </p>
    </div>
  );
}
