"use client";

import type { CSSProperties } from "react";
import { NodeToolbar, Position } from "@xyflow/react";
import { Check } from "lucide-react";
import { NODE_COLORS, type NodeColorPair } from "@/types/canvas";

interface NodeColorToolbarProps {
  nodeId: string;
  color: string;
  textColor: string;
  onSelect: (pair: NodeColorPair) => void;
}

export function NodeColorToolbar({ nodeId, color, textColor, onSelect }: NodeColorToolbarProps) {
  return <NodeToolbar nodeId={nodeId} isVisible position={Position.Top} offset={12}
    role="toolbar" aria-label="Node colors"
    className="nodrag nopan nowheel flex items-center gap-2 rounded-full border border-surface-border bg-surface px-3 py-2 shadow-lg"
    onPointerDown={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()}
    onWheel={(event) => event.stopPropagation()}
    onKeyDown={(event) => event.stopPropagation()}>
    {NODE_COLORS.map((pair) => {
      const active = color.toLowerCase() === pair.color.toLowerCase() && textColor.toLowerCase() === pair.textColor.toLowerCase();
      return <button key={pair.name} type="button" aria-label={`${pair.name} node colors`} title={pair.name}
        aria-pressed={active}
        className="node-color-swatch flex size-6 items-center justify-center rounded-full border transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ backgroundColor: pair.color, color: pair.textColor, borderColor: pair.textColor,
          outlineColor: pair.textColor, outlineStyle: active ? "solid" : undefined, outlineWidth: active ? 2 : undefined,
          outlineOffset: active ? 2 : undefined, "--swatch-text": pair.textColor } as CSSProperties}
        onClick={(event) => { event.stopPropagation(); onSelect(pair); }}>
        {active && <Check className="size-3.5" aria-hidden="true" />}
      </button>;
    })}
  </NodeToolbar>;
}
