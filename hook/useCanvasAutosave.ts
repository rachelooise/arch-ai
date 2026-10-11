"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CanvasAutosave, type CanvasSaveStatus } from "@/lib/canvas-autosave";
import type { CanvasState } from "@/lib/canvas-state";

type Options = CanvasState & {
  projectId: string;
  isRoomEmpty: () => boolean;
  restoreIfEmpty: (state: CanvasState) => boolean;
};

export function useCanvasAutosave(options: Options) {
  const latest = useRef(options);
  const controller = useRef<CanvasAutosave | null>(null);
  const [status, setStatus] = useState<CanvasSaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    latest.current = options;
  }, [options]);

  useEffect(() => {
    if (!options.projectId) return;
    const autosave = new CanvasAutosave({
      projectId: options.projectId,
      getSnapshot: () => latest.current,
      isRoomEmpty: () => latest.current.isRoomEmpty(),
      restoreIfEmpty: (state) => latest.current.restoreIfEmpty(state),
      onStatus: (value, message) => { setStatus(value); setError(message ?? null); },
    });
    controller.current = autosave;
    void autosave.start();
    const flush = () => autosave.saveNow();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      autosave.dispose();
      controller.current = null;
    };
  }, [options.projectId]);

  useEffect(() => { controller.current?.update(); }, [options.nodes, options.edges]);

  const saveNow = useCallback(() => controller.current?.saveNow(), []);
  return { status, error, saveNow };
}
