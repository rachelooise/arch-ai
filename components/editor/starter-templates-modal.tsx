"use client";

import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NodeShape } from "@/components/editor/node-shape";
import { CANVAS_TEMPLATES, type CanvasTemplate } from "@/components/editor/starter-templates";

export function templatePreviewLayout(template: CanvasTemplate) {
  const nodes = template.nodes.map((node) => ({ ...node, width: node.width ?? 180, height: node.height ?? 100 }));
  const left = nodes.length ? Math.min(...nodes.map((node) => node.position.x)) : 0;
  const top = nodes.length ? Math.min(...nodes.map((node) => node.position.y)) : 0;
  const right = Math.max(left + 1, ...nodes.map((node) => node.position.x + node.width));
  const bottom = Math.max(top + 1, ...nodes.map((node) => node.position.y + node.height));
  const scale = Math.min(288 / (right - left), 144 / (bottom - top));
  return { nodes, scale, x: (320 - (right - left) * scale) / 2 - left * scale, y: (176 - (bottom - top) * scale) / 2 - top * scale };
}

export function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const { nodes, scale, x, y } = templatePreviewLayout(template);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return <svg aria-hidden="true" viewBox="0 0 320 176" className="h-40 w-full border-b border-surface-border bg-base">
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={0.75}>
      {template.edges.map((edge) => {
        const source = byId.get(edge.source), target = byId.get(edge.target);
        return source && target ? <line key={edge.id} x1={source.position.x + source.width / 2} y1={source.position.y + source.height / 2}
          x2={target.position.x + target.width / 2} y2={target.position.y + target.height / 2} stroke="var(--canvas-edge-color)" strokeOpacity={0.55} strokeWidth={1} vectorEffect="non-scaling-stroke" /> : null;
      })}
      {nodes.map((node) => <foreignObject key={node.id} x={node.position.x} y={node.position.y} width={node.width} height={node.height}>
        <NodeShape shape={node.data.shape} color={node.data.color} />
      </foreignObject>)}
    </g>
  </svg>;
}

export function StarterTemplatesModal({ onImport, onClose }: { onImport: (template: CanvasTemplate) => void; onClose: () => void }) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent data-template-dialog showCloseButton={false} className="flex max-h-[85dvh] flex-col gap-5 p-6 shadow-2xl sm:max-w-[840px]">
      <DialogHeader className="gap-2 pr-7">
        <DialogTitle className="text-xl font-semibold tracking-tight">Import Template</DialogTitle>
        <DialogDescription className="text-xs leading-relaxed">Choose a starter template to pre-populate your canvas. Any existing nodes will be replaced — use <kbd className="rounded border border-surface-border bg-subtle px-1 py-0.5 font-sans text-[10px] text-copy-secondary">⌘Z</kbd> to undo.</DialogDescription>
      </DialogHeader>
      <div className="grid min-h-0 gap-4 overflow-y-auto sm:grid-cols-3">
        {CANVAS_TEMPLATES.map((template) => <article key={template.id} className="flex flex-col overflow-hidden rounded-xl border border-surface-border bg-surface">
          <TemplatePreview template={template} />
          <div className="flex flex-1 flex-col gap-2 p-4">
            <h2 className="text-sm font-semibold tracking-tight">{template.name}</h2>
            <p className="flex-1 text-xs leading-relaxed text-copy-muted">{template.description}</p>
            <Button type="button" variant="outline" size="sm" className="mt-1 w-full rounded-lg! border-surface-border bg-transparent text-xs text-copy-primary dark:bg-transparent" aria-label={`Import ${template.name}`} onClick={() => { onImport(template); onClose(); }}><Download className="size-3.5" aria-hidden="true" />Import</Button>
          </div>
        </article>)}
      </div>
      <DialogClose asChild><button type="button" aria-label="Close import template dialog" className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full border border-surface-border text-copy-muted transition-colors hover:bg-subtle hover:text-copy-primary focus-visible:outline-2 focus-visible:outline-brand"><X className="size-4" aria-hidden="true" /></button></DialogClose>
    </DialogContent>
  </Dialog>;
}
