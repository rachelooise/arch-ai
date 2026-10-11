"use client";

import { useRef, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow, type EdgeProps } from "@xyflow/react";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export function CanvasEdgeRenderer({ id, data, label, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, selected, markerStart, markerEnd, style }: EdgeProps<CanvasEdge>) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const editingRef = useRef(false);
  const { updateEdgeData } = useReactFlow<CanvasNode, CanvasEdge>();
  const savedLabel = data?.label ?? (typeof label === "string" ? label : "");
  const active = hovered || selected || editing;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 8,
  });

  function startEditing() {
    setDraft(savedLabel);
    editingRef.current = true;
    setEditing(true);
  }

  function saveLabel() {
    if (!editingRef.current) return;
    editingRef.current = false;
    updateEdgeData(id, { label: draft });
    setEditing(false);
  }

  return <>
    <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onDoubleClick={(event) => { event.stopPropagation(); startEditing(); }}>
      <BaseEdge id={id} path={path} markerStart={markerStart} markerEnd={markerEnd} interactionWidth={24}
        style={{ stroke: "var(--canvas-edge-color)", strokeWidth: 1.5, strokeLinecap: "round", ...style, opacity: active ? 1 : 0.55 }} />
    </g>
    {(savedLabel || active) && <EdgeLabelRenderer>
      <div className="nodrag nopan nowheel absolute pointer-events-auto"
        style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => { event.stopPropagation(); startEditing(); }}
        onWheel={(event) => event.stopPropagation()}>
        {editing ? <input autoFocus aria-label="Edge label" value={draft} placeholder="Label"
          className="nodrag nopan nowheel rounded-full border border-brand bg-surface px-3 py-1 text-center text-xs text-copy-primary outline-none"
          style={{ width: `${Math.max(draft.length, 4) + 2}ch` }}
          onChange={(event) => setDraft(event.target.value)} onBlur={saveLabel}
          onDoubleClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter" || event.key === "Escape") { event.preventDefault(); saveLabel(); }
          }} />
          : <span className={`block rounded-full border border-surface-border bg-surface px-3 py-1 text-xs ${savedLabel ? "text-copy-secondary" : "text-copy-faint"}`}>
            {savedLabel || "Double-click to label"}
          </span>}
      </div>
    </EdgeLabelRenderer>}
  </>;
}
