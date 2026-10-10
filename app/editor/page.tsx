"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/components/editor/project-dialogs";

export default function EditorPage() {
  const { openDialog } = useProjects();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Create a project or open an existing one</h1>
      <p className="text-sm text-copy-muted">Start a new architecture workspace, or choose a project from the sidebar.</p>
      <Button type="button" onClick={() => openDialog({ type: "create" })}><Plus className="h-4 w-4" aria-hidden="true" />New Project</Button>
    </div>
  );
}
