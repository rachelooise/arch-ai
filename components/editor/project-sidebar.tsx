"use client";

import { FolderOpen, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { useProjects } from "@/components/editor/project-dialogs";
import Link from "next/link";
import { projectWorkspacePath, type SidebarProject } from "@/lib/project-room";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  ownedProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
}

export function ProjectSidebar({ isOpen, onClose, ownedProjects, sharedProjects }: ProjectSidebarProps) {
  const { openDialog } = useProjects();

  function projectList(items: SidebarProject[], shared: boolean) {
    if (!items.length) return (
      <div className="flex flex-col items-center gap-3 py-12 text-center text-copy-muted">
        {shared ? <Users className="h-8 w-8" aria-hidden="true" /> : <FolderOpen className="h-8 w-8" aria-hidden="true" />}
        <p>{shared ? "No shared projects yet." : "No projects yet."}</p>
      </div>
    );
    return <ul className="space-y-2">{items.map((project) => (
      <li key={project.id} className="flex items-center gap-2 rounded-xl bg-elevated p-2">
        <FolderOpen className="h-4 w-4 shrink-0 text-copy-muted" aria-hidden="true" />
        <Link href={projectWorkspacePath(project.id)} onClick={onClose} className="min-w-0 flex-1 break-words text-sm hover:underline">{project.name}</Link>
        {project.owned && <>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Rename ${project.name}`} onClick={() => openDialog({ type: "rename", project })}><Pencil className="h-4 w-4" aria-hidden="true" /></Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${project.name}`} onClick={() => openDialog({ type: "delete", project })}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
        </>}
      </li>
    ))}</ul>;
  }
  return (
    <aside
      id="project-sidebar"
      aria-labelledby="project-sidebar-title"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={cn(
        "absolute inset-y-3 left-3 z-20 flex w-80 max-w-[calc(100%-1.5rem)] flex-col rounded-2xl border border-surface-border bg-surface/95 shadow-xl backdrop-blur-md transition-[translate,visibility] duration-200 motion-reduce:transition-none",
        isOpen ? "visible translate-x-0" : "invisible -translate-x-[calc(100%+0.75rem)]",
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-surface-border p-4">
        <h2 id="project-sidebar-title" className="text-sm font-semibold">Projects</h2>
        <Button type="button" variant="ghost" size="icon" aria-label="Close projects sidebar" onClick={onClose}>
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
      <Tabs defaultValue="my-projects" className="min-h-0 flex-1 gap-4 overflow-y-auto p-4">
        <TabsList className="w-full" aria-label="Project lists">
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>
        <TabsContent value="my-projects">
          {projectList(ownedProjects, false)}
        </TabsContent>
        <TabsContent value="shared">
          {projectList(sharedProjects, true)}
        </TabsContent>
      </Tabs>
      <div className="shrink-0 border-t border-surface-border p-4">
        <Button type="button" className="w-full" onClick={() => openDialog({ type: "create" })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Project
        </Button>
      </div>
    </aside>
  );
}
