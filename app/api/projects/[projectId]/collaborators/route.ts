import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeProjectSharing, enrichCollaborators } from "@/lib/project-collaborators";

type ProjectContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: ProjectContext) {
  const { projectId } = await params;
  const access = await authorizeProjectSharing(projectId);
  if (access instanceof Response) return access;

  const rows = await prisma.projectCollaborator.findMany({
    where: { projectId }, select: { id: true, email: true }, orderBy: { createdAt: "asc" },
  });
  return Response.json({ isOwner: access.isOwner, collaborators: await enrichCollaborators(rows) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request, { params }: ProjectContext) {
  const { projectId } = await params;
  const access = await authorizeProjectSharing(projectId, true);
  if (access instanceof Response) return access;

  const body: unknown = await request.json().catch(() => null);
  const email = body && typeof body === "object" && "email" in body && typeof body.email === "string"
    ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const existing = await prisma.projectCollaborator.findFirst({
    where: { projectId, email: { equals: email, mode: "insensitive" } }, select: { id: true },
  });
  if (existing) return Response.json({ error: "This email already has access." }, { status: 409 });

  try {
    const collaborator = await prisma.projectCollaborator.create({
      data: { projectId, email }, select: { id: true, email: true },
    });
    return Response.json(collaborator, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "This email already has access." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    throw error;
  }
}
