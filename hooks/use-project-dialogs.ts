"use client";

import { useState } from "react";

export interface Project {
  id: string;
  name: string;
  slug: string;
  owned: boolean;
}

type ProjectDialog = { type: "create" } | { type: "rename" | "delete"; project: Project };

export function projectSlug(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function useProjectDialogs() {
  const [projects, setProjects] = useState<Project[]>([
    { id: "owned-demo", name: "Architecture workspace", slug: "architecture-workspace", owned: true },
    { id: "shared-demo", name: "Team architecture", slug: "team-architecture", owned: false },
  ]);
  const [dialog, setDialog] = useState<ProjectDialog | null>(null);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function openDialog(next: ProjectDialog) {
    if (next.type !== "create" && !next.project.owned) return;
    setName(next.type === "create" ? "" : next.project.name);
    setDialog(next);
  }

  function closeDialog() {
    if (!isLoading) setDialog(null);
  }

  async function submit() {
    if (!dialog || isLoading || (dialog.type !== "delete" && !name.trim())) return;
    setIsLoading(true);
    try {
      // Yield once to display pending UI; all changes remain in memory.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (dialog.type === "create") {
        setProjects((items) => [...items, { id: crypto.randomUUID(), name: name.trim(), slug: projectSlug(name), owned: true }]);
      } else if (dialog.type === "rename") {
        setProjects((items) => items.map((item) => item.id === dialog.project.id && item.owned ? { ...item, name: name.trim(), slug: projectSlug(name) } : item));
      } else {
        setProjects((items) => items.filter((item) => item.id !== dialog.project.id || !item.owned));
      }
      setDialog(null);
    } finally {
      setIsLoading(false);
    }
  }

  return { projects, dialog, name, setName, slug: projectSlug(name), isLoading, openDialog, closeDialog, submit };
}
