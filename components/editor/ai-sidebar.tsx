import { Sparkles } from "lucide-react";

export function AiSidebar({ isOpen }: { isOpen: boolean }) {
  return (
    <aside id="workspace-ai-sidebar" aria-labelledby="workspace-ai-title" hidden={!isOpen}
      className={`${isOpen ? "flex" : "hidden"} absolute inset-y-0 right-0 z-10 w-80 max-w-full flex-col border-l border-surface-border bg-surface lg:static lg:max-w-[40%] lg:shrink-0`}>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-surface-border px-4">
        <Sparkles className="h-4 w-4 text-ai-text" aria-hidden="true" />
        <h2 id="workspace-ai-title" className="text-sm font-semibold">AI Assistant</h2>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
        <p className="text-sm text-copy-muted">AI chat is coming soon.</p>
      </div>
    </aside>
  );
}
