import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { signInUrl, signUpUrl } from "@/lib/auth-routes";

const isPublicRoute = createRouteMatcher([
  signInUrl,
  `${signInUrl}/(.*)`,
  signUpUrl,
  `${signUpUrl}/(.*)`,
]);

const isProjectApiRoute = createRouteMatcher([
  "/api/projects",
  "/api/projects/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProjectApiRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return;
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
}, { signInUrl, signUpUrl });

export const config = {
  matcher: [
    // Skip Next.js internals and static assets; always protect API routes.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
