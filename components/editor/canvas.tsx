"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
import { useRoom, useUpdateMyPresence } from "@liveblocks/react/suspense";
import { useContext, useEffect, useRef, type DragEvent } from "react";
import { Background, BackgroundVariant, ConnectionMode, MarkerType, ReactFlow, type DefaultEdgeOptions, type ReactFlowInstance } from "@xyflow/react";

import { CanvasNodeRenderer } from "@/components/editor/canvas-node";
import { CanvasEdgeRenderer } from "@/components/editor/canvas-edge";
import { ShapePanel } from "@/components/editor/shape-panel";
import { CanvasControls } from "@/components/editor/canvas-controls";
import { CanvasParticipants } from "@/components/editor/canvas-participants";
import { CanvasCursors } from "@/components/editor/canvas-cursors";
import { CanvasPersistence } from "@/components/editor/canvas-persistence";
import { StarterTemplatesContext } from "@/components/editor/starter-templates-context";
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import { instantiateTemplate, type CanvasTemplate } from "@/components/editor/starter-templates";
import { createShapeNode, parseShapeDragPayload, shapeDragPayload, SHAPE_DRAG_TYPE, type CanvasShape } from "@/lib/canvas-shapes";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

const nodeTypes = { canvasNode: CanvasNodeRenderer };
const edgeTypes = { canvasEdge: CanvasEdgeRenderer };
const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "canvasEdge",
  markerEnd: { type: MarkerType.ArrowClosed, color: "var(--canvas-edge-color)" },
  style: { stroke: "var(--canvas-edge-color)", strokeWidth: 1.5, strokeLinecap: "round" },
};

export function Canvas() {
  const container = useRef<HTMLDivElement | null>(null);
  const flow = useRef<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null);
  const templates = useContext(StarterTemplatesContext);
  const room = useRoom();
  const updateMyPresence = useUpdateMyPresence();
  const pendingFit = useRef<CanvasNode[] | null>(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });

  useEffect(() => () => updateMyPresence({ cursor: null }), [updateMyPresence]);

  useEffect(() => {
    const imported = pendingFit.current;
    if (!imported || !flow.current || !imported.every((node) => nodes.some((item) => item.id === node.id))) return;
    pendingFit.current = null;
    void flow.current.fitView({ nodes: imported, duration: 200, padding: 0.2, minZoom: 0.1 });
  }, [nodes]);

  function importTemplate(template: CanvasTemplate) {
    const imported = instantiateTemplate(template);
    pendingFit.current = imported.nodes;
    room.batch(() => {
      // Liveblocks ignores remove changes; its deletion handler clears shared storage.
      onDelete({ nodes, edges });
      onNodesChange(imported.nodes.map((item) => ({ type: "add", item })));
      onEdgesChange(imported.edges.map((item) => ({ type: "add", item })));
    });
  }

  function addShape(shape: CanvasShape) {
    if (!flow.current || !container.current) return;
    const bounds = container.current.getBoundingClientRect();
    const center = flow.current.screenToFlowPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    });
    const payload = shapeDragPayload(shape);
    onNodesChange([{ type: "add", item: createShapeNode(payload, {
      x: center.x - payload.width / 2,
      y: center.y - payload.height / 2,
    }) }]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const payload = parseShapeDragPayload(event.dataTransfer.getData(SHAPE_DRAG_TYPE));
    if (!payload || !flow.current) return;
    const position = flow.current.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onNodesChange([{ type: "add", item: createShapeNode(payload, position) }]);
  }

  return (
    <div ref={container} className="relative h-full w-full" onDrop={onDrop} onDragOver={(event) => {
      if (!event.dataTransfer.types.includes(SHAPE_DRAG_TYPE)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }}>
    <ReactFlow<CanvasNode, CanvasEdge>
      onInit={(instance) => { flow.current = instance; }}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDelete={onDelete}
      onMouseMove={(event) => {
        if (!flow.current) return;
        updateMyPresence({ cursor: flow.current.screenToFlowPosition({ x: event.clientX, y: event.clientY }) });
      }}
      onMouseLeave={() => updateMyPresence({ cursor: null })}
      connectionMode={ConnectionMode.Loose}
      fitView
      colorMode="dark"
    >
      <CanvasControls />
      <Background variant={BackgroundVariant.Dots} />
      <CanvasCursors />
      <CanvasParticipants />
      <CanvasPersistence nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onRestore={(state) => { pendingFit.current = state.nodes; }} />
    </ReactFlow>
    <ShapePanel onAddShape={addShape} />
    {templates?.isOpen && <StarterTemplatesModal onImport={importTemplate} onClose={templates.onClose} />}
    </div>
  );
}
