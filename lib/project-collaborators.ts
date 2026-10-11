import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/project-access";
import type { ProjectCollaborator } from "@/lib/project-sharing";

export async function authorizeProjectSharing(projectId: string, ownerOnly = false) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const isOwner = project.ownerId === userId;
  if (!isOwner && (ownerOnly || !(await getProjectAccess(projectId)))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return { userId, isOwner };
}

export async function enrichCollaborators(rows: { id: string; email: string }[]): Promise<ProjectCollaborator[]> {
  const profiles = new Map<string, { displayName: string | null; imageUrl: string | null }>();
  const emails = [...new Set(rows.map((row) => row.email.toLowerCase()))];
  if (emails.length) {
    try {
      const clerk = await clerkClient();
      for (let start = 0; start < emails.length; start += 100) {
        const batch = emails.slice(start, start + 100);
        for (let offset = 0; ; offset += 100) {
          const { data, totalCount } = await clerk.users.getUserList({ emailAddress: batch, limit: 100, offset });
          for (const user of data) {
            const displayName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || null;
            for (const address of user.emailAddresses) {
              profiles.set(address.emailAddress.toLowerCase(), { displayName, imageUrl: user.imageUrl || null });
            }
          }
          if (data.length < 100 || offset + data.length >= totalCount) break;
        }
      }
    } catch {
      // Profile enrichment is optional; database access management still works if Clerk is unavailable.
    }
  }
  return rows.map((row) => ({ ...row, ...(profiles.get(row.email.toLowerCase()) ?? { displayName: null, imageUrl: null }) }));
}
