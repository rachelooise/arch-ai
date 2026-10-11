"use client";

import { useCanRedo, useCanUndo, useRedo, useUndo } from "@liveblocks/react/suspense";
import { useReactFlow } from "@xyflow/react";
import { Maximize, Minus, Plus, Redo2, Undo2 } from "lucide-react";

import { useKeyboardShortcuts, ZOOM_ANIMATION } from "@/hooks/useKeyboardShortcuts";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

const buttonClass = "flex size-9 items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary focus-visible:outline-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-30";

export function CanvasControls() {
  const flow = useReactFlow<CanvasNode, CanvasEdge>();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  useKeyboardShortcuts(flow, canUndo ? undo : undefined, canRedo ? redo : undefined);

  return (
    <div role="toolbar" aria-label="Canvas controls" className="nodrag nopan nowheel absolute bottom-24 left-6 z-10 flex items-center gap-1 rounded-full border border-surface-border bg-surface p-1.5 shadow-lg">
      <button type="button" aria-label="Zoom out" title="Zoom out (-)" className={buttonClass} onClick={() => void flow.zoomOut(ZOOM_ANIMATION)}><Minus size={16} /></button>
      <button type="button" aria-label="Fit view" title="Fit view" className={buttonClass} onClick={() => void flow.fitView(ZOOM_ANIMATION)}><Maximize size={16} /></button>
      <button type="button" aria-label="Zoom in" title="Zoom in (+)" className={buttonClass} onClick={() => void flow.zoomIn(ZOOM_ANIMATION)}><Plus size={16} /></button>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-surface-border" />
      <button type="button" aria-label="Undo" title="Undo (Ctrl/Cmd+Z)" className={buttonClass} disabled={!canUndo} onClick={undo}><Undo2 size={16} /></button>
      <button type="button" aria-label="Redo" title="Redo (Ctrl/Cmd+Shift+Z)" className={buttonClass} disabled={!canRedo} onClick={redo}><Redo2 size={16} /></button>
    </div>
  );
}
