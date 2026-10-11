import { Suspense } from "react";
import { AccessDenied } from "@/components/editor/access-denied";
import { CanvasRoom } from "@/components/editor/canvas-room";
import { getProjectAccess } from "@/lib/project-access";

async function Workspace({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const project = await getProjectAccess(roomId);
  if (!project) return <AccessDenied />;

  return (
    <section aria-label={`${project.name} canvas`} data-room-id={project.id}
      className="h-full min-h-0 w-full bg-base">
      <CanvasRoom roomId={project.id} />
    </section>
  );
}

export default function WorkspacePage(props: { params: Promise<{ roomId: string }> }) {
  return <Suspense fallback={<p className="p-6 text-copy-muted" role="status">Loading workspace…</p>}>
    <Workspace {...props} />
  </Suspense>;
}
