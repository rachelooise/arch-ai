import type { ReactNode } from "react";

interface NodeShapeProps {
  shape: string;
  color: string;
  selected?: boolean;
  children?: ReactNode;
}

export function NodeShape({ shape, color, selected = false, children }: NodeShapeProps) {
  const stroke = selected ? "var(--accent-primary)" : "var(--border-default)";
  const isSvg = shape === "diamond" || shape === "hexagon" || shape === "cylinder";
  const rounded = shape === "circle" ? "rounded-[50%]" : shape === "pill" ? "rounded-full" : "";

  return <div data-node-shape={shape} className={`relative h-full w-full ${!isSvg ? `border ${rounded}` : ""}`}
    style={!isSvg ? { backgroundColor: color, borderColor: stroke } : undefined}>
    {isSvg && <svg aria-hidden="true" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0" fill={color} stroke={stroke} strokeWidth="1">
      {shape === "diamond" && <polygon points="50,1 99,50 50,99 1,50" vectorEffect="non-scaling-stroke" />}
      {shape === "hexagon" && <polygon points="25,1 75,1 99,50 75,99 25,99 1,50" vectorEffect="non-scaling-stroke" />}
      {shape === "cylinder" && <>
        <path d="M 1 12 A 49 11 0 0 1 99 12 L 99 88 A 49 11 0 0 1 1 88 Z" vectorEffect="non-scaling-stroke" />
        <ellipse cx="50" cy="12" rx="49" ry="11" vectorEffect="non-scaling-stroke" />
      </>}
    </svg>}
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden text-center text-sm text-copy-primary ${shape === "diamond" ? "p-[25%]" : shape === "hexagon" ? "px-[25%] py-3" : shape === "cylinder" ? "px-3 py-[15%]" : "p-3"}`}>
      {children}
    </div>
  </div>;
}
