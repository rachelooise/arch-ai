import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";

import { signInUrl } from "@/lib/auth-routes";
import { prisma } from "@/lib/prisma";

export const getCurrentProjectIdentity = cache(async () => {
  const { userId } = await auth();
  if (!userId) redirect(signInUrl);

  const user = await currentUser();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ?? null;

  return { userId, primaryEmail };
});

export const getProjectAccess = cache(async (roomId: string) => {
  const { userId, primaryEmail } = await getCurrentProjectIdentity();
  return prisma.project.findFirst({
    where: {
      id: roomId,
      OR: [
        { ownerId: userId },
        ...(primaryEmail ? [{
          collaborators: { some: { email: { equals: primaryEmail, mode: "insensitive" as const } } },
        }] : []),
      ],
    },
    select: { id: true, name: true },
  });
});
