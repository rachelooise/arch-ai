import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAccessibleProject } from "@/lib/projects";

async function Workspace({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getAccessibleProject(projectId);
  if (!project) notFound();

  return <div className="h-full p-6" data-room-id={project.id}>
    <h1 className="text-xl font-semibold">{project.name}</h1>
  </div>;
}

export default function WorkspacePage(props: { params: Promise<{ projectId: string }> }) {
  return <Suspense fallback={<p className="p-6 text-copy-muted" role="status">Loading workspace…</p>}>
    <Workspace {...props} />
  </Suspense>;
}
