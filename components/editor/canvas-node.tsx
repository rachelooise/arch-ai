"use client";

import { useEffect, useState } from "react";
import { Handle, NodeResizer, Position, useReactFlow, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { NODE_COLORS, type CanvasNode } from "@/types/canvas";
import { NodeShape } from "@/components/editor/node-shape";
import { NodeColorToolbar } from "@/components/editor/node-color-toolbar";

export function CanvasNodeRenderer({ id, data, selected, isConnectable = true }: NodeProps<CanvasNode>) {
  const [isEditing, setIsEditing] = useState(false);
  const { updateNodeData } = useReactFlow<CanvasNode>();
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    // Refresh cached connection bounds, including after a renderer hot reload.
    updateNodeInternals(id);
  }, [id, data.shape, updateNodeInternals]);
  const textColor = data.textColor ?? NODE_COLORS.find((pair) => pair.color.toLowerCase() === data.color.toLowerCase())?.textColor ?? NODE_COLORS[0].textColor;

  return <>
    <NodeResizer nodeId={id} isVisible={selected} minWidth={80} minHeight={60}
      handleStyle={{ width: 6, height: 6, background: "var(--bg-elevated)", borderColor: "var(--accent-primary)", borderRadius: 2 }}
      lineStyle={{ borderColor: "var(--border-subtle)" }} />
    <NodeShape shape={data.shape} color={data.color} selected={selected}>
      <div className={`relative w-full min-w-0 leading-6 ${isEditing ? "nodrag nopan nowheel" : ""}`} style={{ color: textColor }}
        onDoubleClick={(event) => { event.stopPropagation(); setIsEditing(true); }}>
        <span className={`block min-h-6 whitespace-pre-wrap break-words ${isEditing ? "invisible" : ""} ${!data.label ? "opacity-60" : ""}`}>
          {data.label || "Add a label"}
        </span>
        {isEditing && <textarea autoFocus aria-label="Node label" placeholder="Add a label"
          className="nodrag nopan nowheel absolute inset-0 h-full w-full resize-none border-0 bg-transparent p-0 text-center text-inherit leading-6 outline-none placeholder:text-current placeholder:opacity-60"
          value={data.label}
          onChange={(event) => updateNodeData(id, { label: event.target.value })}
          onBlur={() => setIsEditing(false)}
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") { event.preventDefault(); setIsEditing(false); }
          }} />}
      </div>
    </NodeShape>
    {selected && <NodeColorToolbar nodeId={id} color={data.color} textColor={textColor}
      onSelect={(pair) => updateNodeData(id, { color: pair.color, textColor: pair.textColor })} />}
    {[Position.Top, Position.Right, Position.Bottom, Position.Left].map((position) => (
      <Handle key={position} id={position} type="source" position={position} isConnectable={isConnectable}
        aria-label={`${position} connection point`}
        className="canvas-connection-handle"
        style={{ width: 8, height: 8, background: "var(--text-primary)", borderColor: "var(--bg-base)", zIndex: 20 }} />
    ))}
  </>;
}
