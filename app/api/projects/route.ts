import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import { readProjectName } from "@/lib/project-name";
import { isProjectRoomId } from "@/lib/project-room";
import { Prisma } from "@/generated/prisma/client";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(projects);
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await readProjectName(request, "Untitled Project");

  if (result.error) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  if (result.roomId !== undefined && !isProjectRoomId(result.roomId)) {
    return Response.json({ error: "Invalid room ID." }, { status: 400 });
  }

  try {
    const project = await prisma.project.create({
      data: {
        ownerId: userId, name: result.name,
        ...(typeof result.roomId === "string" ? { id: result.roomId } : {}),
      },
    });
    return Response.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "This room ID already exists. Reopen the create dialog to generate another." }, { status: 409 });
    }
    throw error;
  }
}
