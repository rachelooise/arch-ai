import { Suspense, type ReactNode } from "react";

import { EditorShell } from "@/components/editor/editor-shell";
import { getProjectLists } from "@/lib/projects";

async function ProjectEditor({ children }: { children: ReactNode }) {
  const projects = await getProjectLists();
  return <EditorShell {...projects}>{children}</EditorShell>;
}

export default function EditorLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="flex h-dvh items-center justify-center bg-base text-copy-muted" role="status">Loading projects…</div>}>
    <ProjectEditor>{children}</ProjectEditor>
  </Suspense>;
}
