import { prisma } from "@/lib/prisma";
import { authorizeProjectSharing } from "@/lib/project-collaborators";

export async function DELETE(_request: Request, { params }: {
  params: Promise<{ projectId: string; collaboratorId: string }>;
}) {
  const { projectId, collaboratorId } = await params;
  const access = await authorizeProjectSharing(projectId, true);
  if (access instanceof Response) return access;

  const result = await prisma.projectCollaborator.deleteMany({
    where: { id: collaboratorId, projectId, project: { ownerId: access.userId } },
  });
  if (!result.count) return Response.json({ error: "Collaborator not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
