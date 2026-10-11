"use client";

import { LayoutTemplate, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Share2 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

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

  return (
    <header className="z-30 grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-surface-border bg-surface px-4">
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
