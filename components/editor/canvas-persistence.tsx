"use client";

import { useContext, useEffect } from "react";
import { LiveMap, LiveObject } from "@liveblocks/client";
import { useRoom } from "@liveblocks/react/suspense";
import type { EdgeChange, NodeChange } from "@xyflow/react";
import { useCanvasAutosave } from "@/hook/useCanvasAutosave";
import { CanvasSaveContext } from "@/components/editor/canvas-save-context";
import type { CanvasState } from "@/lib/canvas-state";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

type Props = CanvasState & {
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<CanvasEdge>[]) => void;
  onRestore: (state: CanvasState) => void;
};

export function CanvasPersistence({ nodes, edges, onNodesChange, onEdgesChange, onRestore }: Props) {
  const room = useRoom();
  const context = useContext(CanvasSaveContext);
  function isRoomEmpty() {
    const flow = room.getStorageSnapshot()?.get("flow");
    if (!(flow instanceof LiveObject)) return false;
    const roomNodes = flow.get("nodes"), roomEdges = flow.get("edges");
    return roomNodes instanceof LiveMap && roomEdges instanceof LiveMap && roomNodes.size === 0 && roomEdges.size === 0;
  }
  const { status, error, saveNow } = useCanvasAutosave({
    projectId: room.id, nodes, edges, isRoomEmpty,
    restoreIfEmpty: (state) => {
      let restored = false;
      room.batch(() => {
        if (!isRoomEmpty()) return;
        onNodesChange(state.nodes.map((item) => ({ type: "add", item })));
        onEdgesChange(state.edges.map((item) => ({ type: "add", item })));
        onRestore(state);
        restored = true;
      });
      return restored;
    },
  });
  const setSaveState = context?.setState;
  useEffect(() => {
    setSaveState?.({ status, error, onSave: saveNow });
  }, [setSaveState, status, error, saveNow]);
  return null;
}
