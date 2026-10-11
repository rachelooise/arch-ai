"use client";

import type { NodeProps } from "@xyflow/react";
import type { CanvasNode } from "@/types/canvas";

export function CanvasNodeRenderer({ data, selected }: NodeProps<CanvasNode>) {
  return <div className={`flex h-full w-full items-center justify-center overflow-hidden border bg-elevated p-3 text-center text-sm text-copy-primary ${selected ? "border-brand" : "border-surface-border"}`}
    style={{ backgroundColor: data.color }}>
    <span className="whitespace-pre-wrap break-words">{data.label}</span>
  </div>;
}
