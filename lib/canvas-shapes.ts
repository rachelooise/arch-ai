import type { CanvasNode } from "@/types/canvas";

export const SHAPE_DRAG_TYPE = "application/arch-ai-shape";
export const DEFAULT_NODE_COLOR = "#1F1F1F";
export const SHAPE_SIZES = {
  rectangle: { width: 180, height: 100 },
  diamond: { width: 180, height: 180 },
  circle: { width: 120, height: 120 },
  pill: { width: 180, height: 80 },
  cylinder: { width: 140, height: 160 },
  hexagon: { width: 160, height: 140 },
} as const;

export type CanvasShape = keyof typeof SHAPE_SIZES;
export type ShapeDragPayload = { shape: CanvasShape; width: number; height: number };

export function shapeDragPayload(shape: CanvasShape): ShapeDragPayload {
  return { shape, ...SHAPE_SIZES[shape] };
}

export function parseShapeDragPayload(value: string): ShapeDragPayload | null {
  try {
    const data: unknown = JSON.parse(value);
    if (!data || typeof data !== "object") return null;
    const { shape, width, height } = data as Partial<ShapeDragPayload>;
    if (typeof shape !== "string" || !Object.hasOwn(SHAPE_SIZES, shape)) return null;
    if (typeof width !== "number" || !Number.isFinite(width) || width <= 0 || width > 2000 ||
        typeof height !== "number" || !Number.isFinite(height) || height <= 0 || height > 2000) return null;
    return { shape, width, height };
  } catch {
    return null;
  }
}

let nodeCounter = 0;

export function createShapeNode(payload: ShapeDragPayload, position: CanvasNode["position"]): CanvasNode {
  return {
    id: `${payload.shape}-${Date.now()}-${++nodeCounter}`,
    type: "canvasNode",
    position,
    width: payload.width,
    height: payload.height,
    data: { label: "", color: DEFAULT_NODE_COLOR, shape: payload.shape },
  };
}
