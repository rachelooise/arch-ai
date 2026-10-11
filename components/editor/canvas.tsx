"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
import { useRef, type DragEvent } from "react";
import { Background, BackgroundVariant, ConnectionMode, MiniMap, ReactFlow, type ReactFlowInstance } from "@xyflow/react";

import { CanvasNodeRenderer } from "@/components/editor/canvas-node";
import { ShapePanel } from "@/components/editor/shape-panel";
import { createShapeNode, parseShapeDragPayload, SHAPE_DRAG_TYPE } from "@/lib/canvas-shapes";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

const nodeTypes = { canvasNode: CanvasNodeRenderer };

export function Canvas() {
  const flow = useRef<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const payload = parseShapeDragPayload(event.dataTransfer.getData(SHAPE_DRAG_TYPE));
    if (!payload || !flow.current) return;
    const position = flow.current.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onNodesChange([{ type: "add", item: createShapeNode(payload, position) }]);
  }

  return (
    <div className="relative h-full w-full" onDrop={onDrop} onDragOver={(event) => {
      if (!event.dataTransfer.types.includes(SHAPE_DRAG_TYPE)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }}>
    <ReactFlow<CanvasNode, CanvasEdge>
      onInit={(instance) => { flow.current = instance; }}
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDelete={onDelete}
      connectionMode={ConnectionMode.Loose}
      fitView
      colorMode="dark"
    >
      <MiniMap />
      <Background variant={BackgroundVariant.Dots} />
    </ReactFlow>
    <ShapePanel />
    </div>
  );
}
