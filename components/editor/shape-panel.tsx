"use client";

import { Circle, Cylinder, Diamond, Hexagon, Pill, RectangleHorizontal } from "lucide-react";
import { useRef } from "react";
import { DEFAULT_NODE_COLOR, SHAPE_DRAG_TYPE, SHAPE_SIZES, shapeDragPayload, type CanvasShape } from "@/lib/canvas-shapes";
import { NodeShape } from "@/components/editor/node-shape";

const shapes = [
  { shape: "rectangle", Icon: RectangleHorizontal },
  { shape: "diamond", Icon: Diamond },
  { shape: "circle", Icon: Circle },
  { shape: "pill", Icon: Pill },
  { shape: "cylinder", Icon: Cylinder },
  { shape: "hexagon", Icon: Hexagon },
] satisfies { shape: CanvasShape; Icon: typeof Circle }[];

export function ShapePanel({ onAddShape }: { onAddShape?: (shape: CanvasShape) => void } = {}) {
  const previews = useRef<Partial<Record<CanvasShape, HTMLDivElement>>>({});
  return (
    <>
    <div role="toolbar" aria-label="Canvas shapes"
      className="nodrag nopan absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-surface p-2 shadow-lg">
      {shapes.map(({ shape, Icon }) => (
        <button key={shape} type="button" draggable aria-label={`Add ${shape} to canvas`} title={`Click to add ${shape}, or drag onto canvas`}
          onClick={() => onAddShape?.(shape)}
          className="flex size-9 cursor-grab items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary focus-visible:outline-2 focus-visible:outline-brand active:cursor-grabbing sm:size-10"
          onDragStart={(event) => {
            event.dataTransfer.setData(SHAPE_DRAG_TYPE, JSON.stringify(shapeDragPayload(shape)));
            event.dataTransfer.effectAllowed = "copy";
            const preview = previews.current[shape];
            if (preview) {
              // Keep the image in the viewport for the browser's drag snapshot.
              preview.style.left = "0px";
              event.dataTransfer.setDragImage(preview, 0, 0);
              requestAnimationFrame(() => { preview.style.left = "-10000px"; });
            }
          }}
          onDragEnd={() => {
            const preview = previews.current[shape];
            if (preview) preview.style.left = "-10000px";
          }}>
          <Icon className="size-5" aria-hidden="true" />
        </button>
      ))}
    </div>
    {shapes.map(({ shape }) => <div key={shape} aria-hidden="true"
      ref={(element) => { previews.current[shape] = element ?? undefined; }}
      className="pointer-events-none fixed top-0 z-50 opacity-60"
      style={{ left: -10000, ...SHAPE_SIZES[shape] }}>
      <NodeShape shape={shape} color={DEFAULT_NODE_COLOR} />
    </div>)}
    </>
  );
}
