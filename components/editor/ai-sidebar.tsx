"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Bot, Download, FileText, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const STARTER_PROMPTS = ["Design an e-commerce backend", "Create a chat app architecture", "Build a CI/CD pipeline"];
type Message = { id: number; role: "user" | "assistant"; content: string };

export function AiMessage({ role, content }: Pick<Message, "role" | "content">) {
  return <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
    <div className={cn("max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed",
      role === "user" ? "border-2 border-brand/50 bg-accent-dim text-copy-primary" : "border border-surface-border bg-elevated text-ai-text")}>
      <span className="sr-only">{role === "user" ? "You" : "Ghost AI"}: </span>{content}
    </div>
  </div>;
}

export function AiSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const nextMessageId = useRef(0);

  useEffect(() => {
    const input = textarea.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.max(72, Math.min(input.scrollHeight, 160))}px`;
  }, [draft, isOpen]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: "nearest" }); }, [messages]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setMessages((current) => [...current, { id: ++nextMessageId.current, role: "user", content }]);
    setDraft("");
    textarea.current?.focus();
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    event.stopPropagation();
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      submit();
    }
  }
  const tabClass = "text-copy-muted data-active:bg-accent-dim data-active:text-brand dark:data-active:border-transparent dark:data-active:bg-accent-dim dark:data-active:text-brand";

  return (
    <aside id="workspace-ai-sidebar" aria-labelledby="workspace-ai-title" aria-hidden={!isOpen} inert={!isOpen}
      className={cn("absolute inset-y-3 right-3 z-20 flex w-96 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border border-surface-border bg-base/95 shadow-xl backdrop-blur-md transition-[translate,visibility] duration-200 motion-reduce:transition-none",
        isOpen ? "visible translate-x-0" : "invisible translate-x-[calc(100%+0.75rem)]")}>
      <header className="flex shrink-0 items-center gap-3 border-b border-surface-border p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-subtle text-ai-text"><Bot className="size-5" aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <h2 id="workspace-ai-title" className="text-sm font-semibold text-copy-primary">AI Workspace</h2>
          <p className="mt-0.5 text-xs text-copy-muted">Collaborate with Ghost AI</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Close AI workspace" onClick={onClose}><X className="size-4" aria-hidden="true" /></Button>
      </header>
      <Tabs defaultValue="architect" className="min-h-0 flex-1 gap-0">
        <div className="shrink-0 px-4 pt-4"><TabsList aria-label="AI workspace sections" className="w-full bg-subtle">
          <TabsTrigger value="architect" className={tabClass}><Sparkles className="size-3.5" aria-hidden="true" />AI Architect</TabsTrigger>
          <TabsTrigger value="specs" className={tabClass}><FileText className="size-3.5" aria-hidden="true" />Specs</TabsTrigger>
        </TabsList></div>
        <TabsContent value="architect" className="flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
          <div role="log" aria-label="AI Architect conversation" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 py-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-surface-border bg-elevated text-ai-text"><Bot className="size-6" aria-hidden="true" /></div>
              <div><h3 className="text-sm font-medium text-copy-primary">Design your next architecture</h3>
                <p className="mt-2 text-xs leading-relaxed text-copy-muted">Explore services, data flows, and deployment plans with Ghost AI.</p></div>
              <div className="flex w-full flex-col items-center gap-2">
                {STARTER_PROMPTS.map((prompt) => <Button key={prompt} type="button" variant="ghost" size="sm" className="h-auto max-w-full whitespace-normal rounded-full! bg-subtle px-3 py-2 text-xs text-ai-text hover:bg-elevated hover:text-ai-text"
                  onClick={() => { setDraft(prompt); textarea.current?.focus(); }}>{prompt}</Button>)}
              </div>
            </div> : <div className="space-y-3">{messages.map((message) => <AiMessage key={message.id} {...message} />)}</div>}
            <div ref={chatEnd} />
          </div>
          <form className="shrink-0 space-y-2 border-t border-surface-border p-4" onSubmit={submit}>
            <label htmlFor="ai-workspace-prompt" className="sr-only">Message Ghost AI</label>
            <Textarea ref={textarea} id="ai-workspace-prompt" placeholder="Describe what you want to build…" value={draft}
              onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown}
              className="min-h-[72px] max-h-40 resize-none overflow-y-auto bg-elevated text-sm text-copy-primary" />
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] text-copy-faint">Enter to send · Shift+Enter for a new line</p>
              <Button type="submit" size="icon-sm" aria-label="Send message" disabled={!draft.trim()} className="bg-ai text-white hover:bg-ai/90"><ArrowUp className="size-4" aria-hidden="true" /></Button>
            </div>
            <p className="text-[10px] text-copy-muted">Chat preview. AI responses are coming soon.</p>
          </form>
        </TabsContent>
        <TabsContent value="specs" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <Button type="button" disabled className="w-full bg-ai text-white" title="Spec generation is coming soon"><Sparkles className="size-4" aria-hidden="true" />Generate Spec</Button>
          <article className="rounded-2xl border border-surface-border bg-elevated p-4">
            <div className="mb-3 flex items-start gap-3"><FileText className="mt-0.5 size-5 shrink-0 text-ai-text" aria-hidden="true" />
              <div><h3 className="text-sm font-medium text-copy-primary">Architecture Overview</h3><p className="mt-1 text-xs text-copy-muted">Demo spec · Markdown</p></div></div>
            <p className="text-xs leading-relaxed text-copy-muted">A sample architecture specification covering system goals, core services, data storage, API boundaries, and deployment considerations.</p>
            <Button type="button" variant="outline" size="sm" disabled className="mt-4 w-full" aria-label="Download demo spec"><Download className="size-3.5" aria-hidden="true" />Download</Button>
          </article>
          <p className="text-xs text-copy-muted">Generated specifications will appear here.</p>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
