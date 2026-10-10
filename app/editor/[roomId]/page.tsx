import { Suspense } from "react";
import { AccessDenied } from "@/components/editor/access-denied";
import { getProjectAccess } from "@/lib/project-access";

async function Workspace({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const project = await getProjectAccess(roomId);
  if (!project) return <AccessDenied />;

  return (
    <section aria-label={`${project.name} canvas`} data-room-id={project.id}
      className="flex h-full min-h-0 w-full items-center justify-center bg-base px-6 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Your architecture canvas</h2>
        <p className="text-sm text-copy-muted">Your shared workspace is ready. Canvas tools are coming soon.</p>
      </div>
    </section>
  );
}

export default function WorkspacePage(props: { params: Promise<{ roomId: string }> }) {
  return <Suspense fallback={<p className="p-6 text-copy-muted" role="status">Loading workspace…</p>}>
    <Workspace {...props} />
  </Suspense>;
}
