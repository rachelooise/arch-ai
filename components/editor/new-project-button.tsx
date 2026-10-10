"use client";

import { Plus } from "lucide-react";
import { useProjects } from "@/components/editor/project-dialogs";
import { Button } from "@/components/ui/button";

export function NewProjectButton() {
  const { openDialog } = useProjects();
  return <Button type="button" onClick={() => openDialog({ type: "create" })}>
    <Plus className="h-4 w-4" aria-hidden="true" />New Project
  </Button>;
}
