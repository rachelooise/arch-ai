import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { redirect } from "next/navigation";

import { signInUrl } from "@/lib/auth-routes";
import { prisma } from "@/lib/prisma";
import type { SidebarProject } from "@/lib/project-room";

const getProjectIdentity = cache(async () => {
  const { userId } = await auth();
  if (!userId) redirect(signInUrl);

  const user = await currentUser();
  const emails = user?.emailAddresses
    .filter((email) => email.verification?.status === "verified")
    .map((email) => email.emailAddress) ?? [];

  return { userId, emails };
});

export async function getProjectLists(): Promise<{
  ownedProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
}> {
  const { userId, emails } = await getProjectIdentity();
  const [owned, shared] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: {
        ownerId: { not: userId },
        collaborators: { some: { email: { in: emails, mode: "insensitive" } } },
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    ownedProjects: owned.map((project) => ({ ...project, owned: true })),
    sharedProjects: shared.map((project) => ({ ...project, owned: false })),
  };
}

export async function getAccessibleProject(projectId: string) {
  const { userId, emails } = await getProjectIdentity();
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { collaborators: { some: { email: { in: emails, mode: "insensitive" } } } },
      ],
    },
    select: { id: true, name: true },
  });
}
