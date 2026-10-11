import "server-only";

import { prisma } from "@/lib/prisma";
import type { SidebarProject } from "@/lib/project-room";
import { getCurrentProjectIdentity } from "@/lib/project-access";

export async function getProjectLists(): Promise<{
  ownedProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
}> {
  const { userId, primaryEmail } = await getCurrentProjectIdentity();
  const [owned, shared] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    primaryEmail ? prisma.project.findMany({
      where: {
        ownerId: { not: userId },
        collaborators: { some: { email: { equals: primaryEmail, mode: "insensitive" } } },
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }) : Promise.resolve([]),
  ]);

  return {
    ownedProjects: owned.map((project) => ({ ...project, owned: true })),
    sharedProjects: shared.map((project) => ({ ...project, owned: false })),
  };
}
