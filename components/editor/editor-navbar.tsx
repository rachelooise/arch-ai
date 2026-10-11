"use client";

import { Check, CircleAlert, LayoutTemplate, Loader2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Save, Share2 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useContext } from "react";
import { CanvasSaveContext } from "@/components/editor/canvas-save-context";

import { Button } from "@/components/ui/button";

interface EditorNavbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  projectName?: string;
  isAiSidebarOpen: boolean;
  onToggleAiSidebar: () => void;
  onShare: () => void;
  onTemplates: () => void;
}

export function EditorNavbar({ isSidebarOpen, onToggleSidebar, projectName, isAiSidebarOpen, onToggleAiSidebar, onShare, onTemplates }: EditorNavbarProps) {
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;
  const AiSidebarIcon = isAiSidebarOpen ? PanelRightClose : PanelRightOpen;
  const save = useContext(CanvasSaveContext)?.state;
  const SaveIcon = save?.status === "saving" ? Loader2 : save?.status === "error" ? CircleAlert : save?.onSave ? Check : Save;
  const saveLabel = save?.status === "saving" ? "Saving" : save?.status === "error" ? "Error" : save?.onSave ? "Saved" : "Save";

  return (
    <header className="relative z-30 grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-surface-border bg-surface px-4">
      {projectName && save?.status === "error" && <div role="alert" className="absolute right-4 top-full mt-2 flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border border-surface-border bg-surface p-3 text-sm text-copy shadow-lg sm:max-w-md">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-error" aria-hidden="true" />
        <p className="min-w-0 break-words">{save.error || "Unable to save or load the canvas. Please retry."}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => save.onSave?.()}>Retry</Button>
      </div>}
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isSidebarOpen ? "Close projects sidebar" : "Open projects sidebar"}
          aria-expanded={isSidebarOpen}
          aria-controls="project-sidebar"
          onClick={onToggleSidebar}
        >
          <SidebarIcon className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
      <div className="min-w-0 text-center">
        {projectName && <h1 className="truncate text-sm font-semibold" title={projectName}>{projectName}</h1>}
      </div>
      <div className="flex items-center justify-end gap-2">
        {projectName && <>
          <Button type="button" variant="outline" size="sm" aria-label={`Save canvas: ${saveLabel.toLowerCase()}`} title={save?.status === "error" ? save.error || "Save or load failed. Click to retry." : "Save canvas"}
            disabled={!save?.onSave || save.status === "saving"} onClick={() => save?.onSave?.()}>
            <SaveIcon className={`size-3.5 ${save?.status === "saving" ? "animate-spin" : save?.status === "error" ? "text-error" : ""}`} aria-hidden="true" />
            <span aria-live="polite" className="hidden sm:inline">{saveLabel}</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onTemplates} aria-label="Open starter templates">
            <LayoutTemplate className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Templates</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onShare} aria-label="Share project">
            <Share2 className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Share</span>
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
            aria-expanded={isAiSidebarOpen} aria-controls="workspace-ai-sidebar" onClick={onToggleAiSidebar}>
            <AiSidebarIcon className="h-5 w-5" aria-hidden="true" />
          </Button>
        </>}
        <UserButton />
      </div>
    </header>
  );
}
