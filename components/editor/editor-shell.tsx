"use client";

import { useState, type ReactNode } from "react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ProjectDialogs, ProjectDialogsContext } from "@/components/editor/project-dialogs";
import { useProjectDialogs } from "@/hooks/use-project-dialogs";

interface EditorShellProps {
  children?: ReactNode;
}

export function EditorShell({ children }: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const projects = useProjectDialogs();

  return (
    <ProjectDialogsContext.Provider value={projects}>
    <div className="flex h-dvh flex-col overflow-hidden bg-base">
      <EditorNavbar isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen((open) => !open)} />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <main aria-label="Editor canvas" className="h-full w-full">{children}</main>
        {isSidebarOpen && <button type="button" aria-label="Close projects sidebar" className="absolute inset-0 z-10 bg-base/70 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)} />}
        <ProjectSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>
    </div>
    <ProjectDialogs />
    </ProjectDialogsContext.Provider>
  );
}
