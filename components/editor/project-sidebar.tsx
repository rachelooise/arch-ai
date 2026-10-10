"use client";

import { FolderOpen, Plus, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
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
          <div className="flex flex-col items-center gap-3 py-12 text-center text-copy-muted">
            <FolderOpen className="h-8 w-8" aria-hidden="true" />
            <p>No projects yet.</p>
          </div>
        </TabsContent>
        <TabsContent value="shared">
          <div className="flex flex-col items-center gap-3 py-12 text-center text-copy-muted">
            <Users className="h-8 w-8" aria-hidden="true" />
            <p>No shared projects yet.</p>
          </div>
        </TabsContent>
      </Tabs>
      <div className="shrink-0 border-t border-surface-border p-4">
        <Button type="button" className="w-full">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Project
        </Button>
      </div>
    </aside>
  );
}
