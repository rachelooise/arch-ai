"use client";

import { useEffect } from "react";
import type { ReactFlowInstance } from "@xyflow/react";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export const ZOOM_ANIMATION = { duration: 200 };

export function useKeyboardShortcuts(
  flow: ReactFlowInstance<CanvasNode, CanvasEdge>,
  undo: (() => void) | undefined,
  redo: (() => void) | undefined,
) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.altKey) return;
      const target = event.target;
      if (target instanceof Element && (
        target.closest('input, textarea, [role="textbox"]') ||
        (target instanceof HTMLElement && target.isContentEditable)
      )) return;

      const key = event.key.toLowerCase();
      const command = event.metaKey || event.ctrlKey;
      if (command && (key === "z" || key === "y")) {
        event.preventDefault();
        if (key === "y" || event.shiftKey) redo?.();
        else undo?.();
      } else if (!command && (key === "+" || key === "=" || key === "-")) {
        event.preventDefault();
        if (key === "-") void flow.zoomOut(ZOOM_ANIMATION);
        else void flow.zoomIn(ZOOM_ANIMATION);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flow, undo, redo]);
}
