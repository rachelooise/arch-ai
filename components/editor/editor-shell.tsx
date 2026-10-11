"use client";

import { useState, type ReactNode } from "react";
import { useParams } from "next/navigation";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ProjectDialogs, ProjectDialogsContext } from "@/components/editor/project-dialogs";
import { useProjectActions } from "@/hooks/use-project-actions";
import type { SidebarProject } from "@/lib/project-room";
import { AiSidebar } from "@/components/editor/ai-sidebar";
import { ShareDialog } from "@/components/editor/share-dialog";
import { StarterTemplatesContext } from "@/components/editor/starter-templates-context";

interface EditorShellProps {
  children?: ReactNode;
  ownedProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
}

export function EditorShell({ children, ownedProjects, sharedProjects }: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [sharingProjectId, setSharingProjectId] = useState<string | null>(null);
  const [templatesRoomId, setTemplatesRoomId] = useState<string | null>(null);
  const { roomId } = useParams<{ roomId?: string }>();
  const currentProject = [...ownedProjects, ...sharedProjects].find((project) => project.id === roomId);
  const projects = useProjectActions();

  return (
    <ProjectDialogsContext.Provider value={projects}>
    <StarterTemplatesContext.Provider value={{ isOpen: !!roomId && templatesRoomId === roomId, onClose: () => setTemplatesRoomId(null) }}>
    <div className="flex h-dvh flex-col overflow-hidden bg-base">
      <EditorNavbar isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        projectName={currentProject?.name} isAiSidebarOpen={isAiSidebarOpen}
        onToggleAiSidebar={() => setIsAiSidebarOpen((open) => !open)}
        onTemplates={() => { if (currentProject) setTemplatesRoomId(currentProject.id); }}
        onShare={() => { if (currentProject) setSharingProjectId(currentProject.id); }} />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <main aria-label="Editor canvas" className="h-full min-w-0 flex-1">{children}</main>
        {currentProject && <AiSidebar isOpen={isAiSidebarOpen} />}
        {isSidebarOpen && <button type="button" aria-label="Close projects sidebar" className="absolute inset-0 z-10 bg-base/70 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)} />}
        <ProjectSidebar ownedProjects={ownedProjects} sharedProjects={sharedProjects} activeRoomId={roomId} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>
    </div>
    <ProjectDialogs />
    {currentProject && sharingProjectId === currentProject.id && <ShareDialog key={currentProject.id} project={currentProject} onClose={() => setSharingProjectId(null)} />}
    </StarterTemplatesContext.Provider>
    </ProjectDialogsContext.Provider>
  );
}
