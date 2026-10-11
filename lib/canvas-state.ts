import { SHAPE_SIZES } from "@/lib/canvas-shapes";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export type CanvasState = { nodes: CanvasNode[]; edges: CanvasEdge[] };
export const MAX_CANVAS_BYTES = 4_000_000;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const id = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 200;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function parseCanvasState(value: unknown): CanvasState | null {
  if (!record(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges) || value.nodes.length > 5000 || value.edges.length > 10000) return null;
  const ids = new Set<string>();
  for (const node of value.nodes) {
    if (!record(node) || !id(node.id) || ids.has(node.id) || node.type !== "canvasNode" || !record(node.position) || !finite(node.position.x) || !finite(node.position.y) || !record(node.data)) return null;
    if (typeof node.data.label !== "string" || typeof node.data.color !== "string" || typeof node.data.shape !== "string" || !Object.hasOwn(SHAPE_SIZES, node.data.shape)) return null;
    if (node.data.textColor !== undefined && typeof node.data.textColor !== "string") return null;
    if ([node.width, node.height].some((size) => size !== undefined && (!finite(size) || size <= 0))) return null;
    ids.add(node.id);
  }
  const edgeIds = new Set<string>();
  for (const edge of value.edges) {
    if (!record(edge) || !id(edge.id) || edgeIds.has(edge.id) || !id(edge.source) || !id(edge.target) || !ids.has(edge.source) || !ids.has(edge.target)) return null;
    if (edge.type !== undefined && edge.type !== "canvasEdge") return null;
    if (edge.data !== undefined && (!record(edge.data) || (edge.data.label !== undefined && typeof edge.data.label !== "string"))) return null;
    edgeIds.add(edge.id);
  }
  return canvasSnapshot(value.nodes as CanvasNode[], value.edges as CanvasEdge[]);
}

export function canvasSnapshot(nodes: readonly CanvasNode[], edges: readonly CanvasEdge[]): CanvasState {
  return {
    nodes: nodes.map((node) => {
      const saved = { ...node };
      delete saved.selected; delete saved.dragging; delete saved.resizing; delete saved.measured;
      return saved;
    }),
    edges: edges.map((edge) => { const saved = { ...edge }; delete saved.selected; return saved; }),
  };
}

export function serializeCanvas(state: CanvasState) {
  const snapshot = canvasSnapshot(state.nodes, state.edges);
  snapshot.nodes.sort((a, b) => a.id.localeCompare(b.id));
  snapshot.edges.sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(snapshot);
}
